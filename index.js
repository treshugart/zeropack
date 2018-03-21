#!/usr/bin/env node

const flowCopySource = require("flow-copy-source");
const fs = require("fs-extra");
const path = require("path");
const uppercamelcase = require("uppercamelcase");
const webpack = require("webpack");
const webpackNodeExternals = require("webpack-node-externals");
const yargs = require("yargs").argv;

async function cwdPath(...parts) {
  const possiblePath = path.join(process.cwd(), ...parts);
  return (await fs.exists(possiblePath)) ? possiblePath : null;
}

async function cwdRequire(file) {
  file = await cwdPath(file);
  return file ? require(file) : null;
}

async function cwdRequireJson(file) {
  file = await cwdPath(file);
  return file ? JSON.parse(await fs.readFile(file)) : null;
}

(async function() {
  const pkg = (await cwdRequireJson("package.json")) || {};
  const opt = {
    ...{
      entry: "./src/index.js",
      externals: webpackNodeExternals(),
      mode: yargs.mode || "production",
      module: {
        rules: [{ test: /\.js$/, use: "babel-loader" }]
      },
      output: {
        filename: path.basename(pkg.main || "index.js"),
        library: pkg.name ? uppercamelcase(pkg.name) : undefined,
        libraryTarget: "umd",
        path: path.join(process.cwd(), path.dirname(pkg.main || "dist"))
      }
    },
    ...pkg.zeropack,
    ...(await cwdRequireJson(".zeropackrc")),
    ...(await cwdRequire("zeropack.js"))
  };

  // Cleanup any previous runs.
  await fs.remove(opt.output.path);

  webpack(opt, (error, stats) => {
    if (error) {
      console.error(error.stack || error);
      console.error(error.details);
      return;
    } else if (stats.hasErrors() || stats.hasWarnings()) {
      const info = stats.toJson();
      console.warn(info.warnings);
      console.error(info.errors);
      return;
    }

    // If using Flow, copy entry source files ot the output directory.
    if (pkg.devDependencies && pkg.devDependencies["flow-bin"]) {
      const sources = Array.isArray(opt.entry)
        ? Object.values(opt.entry)
        : [opt.entry];
      flowCopySource(sources.map(path.dirname), opt.output.path, {
        ignore: "**/__tests__/**"
      });
    }
  });
})();
