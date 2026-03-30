/**
 * Patches next/cache so scripts can import Next.js modules outside the server.
 * unstable_cache → passthrough (no caching, just calls the function directly)
 * revalidatePath  → no-op
 * revalidateTag   → no-op
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Node.js ESM loader hook that overrides next/cache
const hook = {
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/cache") {
      return { shortCircuit: true, url: "data:text/javascript,export const unstable_cache = (fn) => fn; export const revalidatePath = () => {}; export const revalidateTag = () => {};" };
    }
    return nextResolve(specifier, context);
  },
};
