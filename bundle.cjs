const header = `#!/usr/bin/env node
const require = (await import("module")).createRequire(import.meta.url);`;

const watch = process.argv.includes("--watch") && {
  onRebuild(error, result) {
    if (error) console.error('watch build failed:', error)
    else console.log('Rebuild succeeded.')
  }
}

require('esbuild').build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  banner: {
    js: header,
  },
  format: "esm",
  minifyWhitespace: true,
  platform: 'node',
  target: ['node14.17'],
  external: ["worker-farm", "node:*"],
  outfile: 'dist/index.mjs',
  sourcemap: true,
  watch
}).then(() => {
  console.log("Build complete.");
  if (!!watch)
    console.log("Watching for file changes.");
});
