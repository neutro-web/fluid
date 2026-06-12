// Ambient declaration for the build-time-injected `process` global.
// Bundler define plugins (Vite / esbuild / webpack) replace process.env.NODE_ENV
// with a string literal at build time; the typeof guard in source keeps this safe
// in environments where process is absent (e.g. bare browser, non-bundled ESM).
// @types/node is not included as a lib dep — this targeted declaration is sufficient.
declare const process: { env: Record<string, string | undefined> } | undefined
