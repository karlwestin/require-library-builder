Require-library-builder
====

You have two AMD-modules, mod1 and mod2. They are used on separate pages in your app. But they use a lot of common code,
and because the way AMD-build-systems work, the user will have to reload this code.

Require-library-builder uses r.js to trace common dependencies of the modules, bundling those into a separate lib.js-file.

**Before:**  
mod1-build.js (100k) // 50k in each of those are shared dependencies  
mod2-build.js (100k)  
...................  
total:         200k  

**After:**  
mod1-build.js (50k)  
mod2-build.js (50k)  
lib.js        (50k)  
...................  
total:         150k  

How to:
------
Install: clone repo and `npm link`

then from command line INSIDE the baseUrl directory of your app:
require-librarybuilder relative/path/to/buildconfig.json

The build config:
------
Is eerily similar to a normal requirejs build config, except:
* no parenthesis, just normal JSON
* each object in the modules array needs an 'out' property

Check example.build.json
