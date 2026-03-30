/**
 * ESM loader hook: replaces 'next/cache' with a passthrough shim.
 * Registered via test-runner.mjs.
 */
const MOCK = `
export function unstable_cache(fn) { return fn; }
export function revalidatePath() {}
export function revalidateTag() {}
`;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/cache") {
    return {
      shortCircuit: true,
      url: "data:text/javascript," + encodeURIComponent(MOCK),
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("data:text/javascript,")) {
    return {
      shortCircuit: true,
      format: "module",
      source: decodeURIComponent(url.slice("data:text/javascript,".length)),
    };
  }
  return nextLoad(url, context);
}
