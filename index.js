const flowCopySource = require("flow-copy-source");
const fs = require("fs-extra");
const path = require("path");
const uppercamelcase = require("uppercamelcase");
const webpack = require("webpack");
const webpackNodeExternals = require("webpack-node-externals");

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

async function getPkg() {
  return (await cwdRequireJson("package.json")) || {};
}

async function getDefaultOptions() {
  const hasNodeModules = await cwdPath("node_modules");
  const pkg = await getPkg();
  const pkgMain = pkg.main || "index.js";
  const pkgMainBasename = path.basename(pkgMain);
  const pkgMainDirname = path.dirname(pkgMain);
  const pkgName = uppercamelcase(pkg.name || "");
  const outputPath = path.join(
    process.cwd(),
    pkgMainDirname === "." ? "dist" : pkgMainDirname
  );

  return {
    entry: "./src/index.js",
    externals: hasNodeModules ? webpackNodeExternals() : [],
    mode: "production",
    module: {
      rules: [{ test: /\.js$/, use: "babel-loader" }]
    },
    output: {
      filename: pkgMainBasename,
      library: pkgName,
      libraryTarget: "umd",
      path: outputPath
    }
  };
}

async function getOptions(overrides) {
  const pkg = await getPkg();
  return {
    ...(await getDefaultOptions()),
    ...pkg.zeropack,
    ...(await cwdRequireJson(".zeropackrc")),
    ...(await cwdRequire("zeropack.js")),
    ...overrides
  };
}

function errorOrContinue(yup, nup) {
  return (error, stats) => {
    if (error) {
      nup(error);
      return;
    } else if (stats.hasErrors() || stats.hasWarnings()) {
      const info = stats.toJson();
      nup(console.warn(info.warnings) + console.error(info.errors));
      return;
    } else {
      yup(stats);
    }
  };
}

async function zeropack(optOverrides) {
  const pkg = await getPkg();
  const opt = await getOptions(optOverrides);

  // Cleanup any previous runs.
  await fs.remove(opt.output.path);

  return new Promise((yup, nup) => {
    webpack(
      opt,
      errorOrContinue(async () => {
        // If using Flow, copy entry source files ot the output directory.
        if (pkg.devDependencies && pkg.devDependencies["flow-bin"]) {
          const sources = Array.isArray(opt.entry)
            ? Object.values(opt.entry)
            : [opt.entry];

          await flowCopySource(sources.map(path.dirname), opt.output.path, {
            // We must ignore anything but the entry points.
            ignore: sources.map(s => `**/!(${path.relative(process.cwd(), s)})`)
          });

          // This ensures that the flow entry point matches the user-defined
          // entry point filename because flow-copy-source copies the source
          // entry point name as defiend in the file system.
          await fs.move(
            path.join(opt.output.path, path.basename(opt.entry) + ".flow"),
            path.join(opt.output.path, opt.output.filename + ".flow")
          );
        }
        yup();
      }, nup)
    );
  });
}

module.exports = { getDefaultOptions, getOptions, zeropack };
