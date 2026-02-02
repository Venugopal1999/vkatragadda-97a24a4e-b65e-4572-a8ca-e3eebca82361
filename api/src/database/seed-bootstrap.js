const path = require('path');
const Module = require('module');

// Rewrite @turbovets-fullstack/auth imports to relative path
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === '@turbovets-fullstack/auth') {
    const authPath = path.join(__dirname, '..', '..', '..', 'auth', 'src', 'index.js');
    return originalResolve.call(this, authPath, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};

require('./seed.js');
