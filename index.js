#! /usr/bin/env node
/*
 * Require-library builder
 *
 * Takes a range of files to build with require.js
 * Finds common dependencies
 * Creates a 'lib' file with those common deps
 * Builds the modules with those 'lib' files excluded
 * Creates a require-config with paths
 */
var configPath = process.argv[2];
console.log("reading config from: %s", configPath);
var globalConfig = require(process.cwd() + "/" + configPath);

var requirejs = require("requirejs"),
    Q = require("q"),
    ce = require("cloneextend");

var modules = globalConfig.modules,
    res = [];

delete globalConfig.modules;

var configs = modules.map(function(mod) {
  var def = Q.defer();

  var config = ce.cloneextend(globalConfig, {
    optimize: "none", // builds faster, this result is just gonna get thrown out anyway
    name: mod.name,
    out: mod.out
  });

  requirejs.optimize(config, function(results) {
    def.resolve({ results: results, config: config });
  });

  return def.promise;
});

/*
 * This is the build chain
 */
Q.allResolved(configs)
 .then(splitDeps)
 .then(intersect)
 .then(buildLib)
 .then(generateConfig);

/*
 * Splitting dep chains
 */
function splitDeps(confs) {
  return confs.map(function(res) {
    res = res.valueOf();
    var deps = res.results
                  .split("\n")
                  .slice(3)
                  .filter(function(el) { return !!el.trim(); });

    res.deps = deps;
    return { deps: deps, config: res.config };
  });
}

/*
 * Finding common files in dep chains
 */
function intersect(confs) {
  var first = confs[0],
      rest  = confs.slice(1),
      // finding intersections in all the deps array
      // stolen from _.intersection in underscore.js
      lib = first.deps.filter(function(item) {
        return rest.every(function(other) {
          return other.deps.indexOf(item) >= 0;
        });
      });
  return { lib: lib, confs: confs };
}

/*
 * Building lib (and other files with lib excluded)
 */
function buildLib(settings) {
  var lib = filterPaths(settings.lib);
  var config = ce.cloneextend(globalConfig, {
    name: lib[0],
    include: lib.slice(1),
    out: globalConfig.lib
  });
  console.log("Building lib file including:\n", lib);
  requirejs.optimize(config, function() {});


  var configs = settings.confs.map(function(obj) {
    obj.config.exclude = lib;
    obj.config.optimize = globalConfig.optimize;
    requirejs.optimize(obj.config, function() {});
    return obj.config;
  });
  configs.unshift(config);
  return configs;
}

/*
 * Generate require-config file
 */
function generateConfig(parts) {
  var paths = {},
      name = filterPath(parts[0].out),
      modules = parts.slice(1);

  // directions for lib-files
  parts[0].include.forEach(function(path) {
    paths[path] = name;
  });
  paths[parts[0].name] = name;
  //transfer paths from global config to point to the new lib file
  var keys = Object.keys(paths);
  for(var key in globalConfig.paths) {
    if(keys.indexOf(globalConfig.paths[key]) !== -1) {
      paths[key] = name;
    }
  }
  //directions for modules
  modules.forEach(function(mod) {
    paths[mod.name] = filterPath(mod.out);
  });

  var pathString = JSON.stringify(paths);
  pathString = "require.config({ baseUrl: 'js/', paths: " + pathString + "});";
  require("fs").writeFile("require-config.js", pathString);
}

function filterPaths(paths) {
 return paths.map(filterPath);
}

function filterPath(path) {
  var cwd = process.cwd();
  return path.replace(cwd + "/", "").replace(".js", "");
}

/*
 * thoughts:
 * args: array w/ modules
 * config for build
 * config for require-config (really, a base-path)
 * whether to include hashes of files or not
 */
