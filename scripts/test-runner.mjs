/**
 * Register module that patches next/cache so scripts can import Next.js modules
 * outside of the server context.
 *
 * Usage: node --import ./scripts/test-runner.mjs ./scripts/test-enrichment.ts
 *        (tsx handles .ts transpilation via the tsx binary)
 *
 * unstable_cache → passthrough function (no incremental cache needed)
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register tsx to handle TypeScript files
register("tsx/esm", pathToFileURL("./"));

// Register our next/cache mock as a loader
register(pathToFileURL("./scripts/next-cache-loader.mjs"));
