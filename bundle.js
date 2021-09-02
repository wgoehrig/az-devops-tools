require("esbuild").buildSync({
  entryPoints: ["src/index.ts"],
  bundle: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  minifyWhitespace: true,
  platform: "node",
  target: ["node12.20"],
  external: ["worker-farm"],
  outfile: "dist/index.js",
  sourcemap: true,
});
