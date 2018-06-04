const babel = require("babel-core");
const babelPresetEnv = require("babel-preset-env");
const babelPresetFlow = require("babel-preset-flow");
const babelPresetReact = require("babel-preset-react");
const babelPresetStage0 = require("babel-preset-stage-0");
const cosmiconfig = require("cosmiconfig");
const flowCopySource = require("flow-copy-source");
const fs = require("fs-extra");
const merge = require("lodash/merge");
const path = require("path");
const sourceTrace = require("source-trace");
const uppercamelcase = require("uppercamelcase");
const webpack = require("webpack");
const webpackServe = require("webpack-serve");
const webpackNodeExternals = require("webpack-node-externals");

const defaultBabelPresets = [
  babelPresetFlow,
  babelPresetReact,
  babelPresetStage0
];

async function readFile(...parts) {
  const possiblePath = path.join(process.cwd(), ...parts);
  return (await fs.exists(possiblePath))
    ? (await fs.readFile(possiblePath)).toString("utf-8")
    : null;
}

async function getDefaultBabelOptions() {
  return {
    presets: defaultBabelPresets,
    sourceMaps: true,
    env: {
      browser: {
        presets: [babelPresetEnv]
      },
      main: {
        presets: [[babelPresetEnv, { targets: { node: pkg.engines.node } }]]
      },
      module: {
        presets: [[babelPresetEnv, { modules: false }], babelPresetStage0]
      }
    }
  };
}

async function getDefaultPkgOptions() {
  return {
    devDependencies: {},
    engines: { node: (await readFile(".nvmrc")) || "current" },
    main: "./dist/index.js",
    name: "unknown"
  };
}

async function getDefaultZeropackOptions(pkg, type) {
  const pkgType = pkg[type];
  if (!pkgType) {
    return;
  }
  return {
    flow: {
      entry: "./src/index.js",
      output: {
        filename: path.basename(pkgType),
        path: getOutputPath(pkgType)
      }
    },
    webpack: {
      // Setting the context to the source directory ensures that the dirname
      // is not prepended to the output dir when emitting all files. For
      // example if your output path is "dist" and your entry is
      // "./src/index.js", then your output is "./dist/src/index.js".
      context: path.resolve("./src"),
      devtool: "source-map",
      entry: `./src/index.js`,
      externals: Object.keys({
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.optionalDependencies,
        ...pkg.peerDependencies
      }),
      mode: "development",
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            use: [
              {
                loader: require.resolve("babel-loader"),
                options: merge(babelConfig, babelConfigEnv[type])
              }
            ]
          }
        ]
      },
      output: {
        filename: path.basename(pkgType),
        library: uppercamelcase(pkg.name),
        libraryTarget: "umd",
        path: getOutputPath(pkgType)
      },
      resolve: {
        alias: { [pkg.name]: src }
      }
    }
  };
}

async function getUserBabelOptions() {
  const loaded = await cosmiconfig("babel").load();
  return loaded ? loaded.config : {};
}

async function getUserZeropackOptions() {
  const loaded = await cosmiconfig("zeropack").load();
  return loaded ? loaded.config : getDefaultZeropackOptions();
}

function getOutputPath(file) {
  const dirname = path.dirname(file);
  return path.join(process.cwd(), dirname === "." ? "dist" : dirname);
}

async function buildFlow(pkg) {
  const opt = await getFlowOptions(pkg);
  return Promise.all(
    opt.map(async o => {
      const { entry } = o;
      const { filename: outputFileBasename, path: outputPath } = o.output;
      const entryResolved = path.resolve(entry);
      return Promise.all(
        await sourceTrace(entry).map(async file => {
          const relativeFile =
            file === entryResolved
              ? outputFileBasename
              : path.relative(path.dirname(entryResolved), file);
          const outputFile = path.join(outputPath, relativeFile) + ".flow";
          return fs.copy(file, outputFile);
        })
      );
    })
  );
}

async function buildWebpack(pkg) {
  const opt = await getWebpackOptions(pkg);
  return Promise.all(
    opt.map(o => {
      return new Promise((yup, nup) => {
        webpack(o, (error, stats) => {
          if (error) {
            nup(error);
            return;
          } else if (stats.hasErrors() || stats.hasWarnings()) {
            const info = stats.toJson();
            nup(info.warnings.concat(info.errors).join("\n\n"));
            return;
          } else {
            yup(stats);
          }
        });
      }).catch(console.error);
    })
  );
}

async function clean(pkg) {
  pkg = await getUserZeropackOptions(pkg);
  return Promise.all(
    filterMains(["browser", "main", "module"], pkg)
      .filter(Boolean)
      .map(fieldPath => getOutputPath(fieldPath))
      .filter((field, index, array) => array.indexOf(field) === index)
      .map(async outputPath => fs.remove(outputPath))
  );
}

async function zeropack(pkg) {
  return Promise.all([
    await clean(pkg),
    await buildWebpack(pkg),
    await buildFlow(pkg)
  ]);
}

module.exports = {
  zeropack
};
