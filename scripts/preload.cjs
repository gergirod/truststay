/**
 * CJS preload script: patches next/cache before any ES modules load.
 * Run with: node -r ./scripts/preload.cjs
 *
 * next/cache exports unstable_cache from a CJS module, so we can override
 * it in the CJS require cache before tsx processes imports.
 */
"use strict";

// First, make sure tsx handles .ts files
require("tsx/cjs");

// Patch next/cache in the require cache
const cacheModulePath = require.resolve("next/cache");
require.cache[cacheModulePath] = {
  id: cacheModulePath,
  filename: cacheModulePath,
  loaded: true,
  exports: {
    unstable_cache: function(fn) { return fn; },
    revalidatePath: function() {},
    revalidateTag: function() {},
  },
  parent: null,
  children: [],
  paths: [],
};

// Also patch the underlying implementation file
const implPath = require.resolve("next/dist/server/web/spec-extension/unstable-cache");
if (implPath !== cacheModulePath) {
  require.cache[implPath] = {
    id: implPath,
    filename: implPath,
    loaded: true,
    exports: {
      __esModule: true,
      unstable_cache: function(fn) { return fn; },
    },
    parent: null,
    children: [],
    paths: [],
  };
}

console.log("[preload] next/cache patched — unstable_cache is now a passthrough");
