const header = `#!/usr/bin/env node
const require = (await import("module")).createRequire(import.meta.url);`;

require('esbuild').buildSync({
  entryPoints: ['src/index.ts'],
  bundle: true,
  banner: {
    js: header,
  },
  format: "esm",
  minifyWhitespace: false,
  platform: 'node',
  target: ['node14.17'],
  external: ["worker-farm", "node:*"],
  outfile: 'dist/index.mjs',
  sourcemap: true
})