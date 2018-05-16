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
const WebpackEmitAllPlugin = require("webpack-emit-all-plugin");
const webpackNodeExternals = require("webpack-node-externals");

class WebpackNoEmitPlugin {
  apply(compiler) {
    compiler.hooks.shouldEmit.tap({ name: "shouldEmit" }, () => false);
  }
}

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

async function getUserBabelOptions() {
  const loaded = await cosmiconfig("babel").load();
  return loaded ? loaded.config : {};
}

function getOutputPath(file) {
  const dirname = path.dirname(file);
  return path.join(process.cwd(), dirname === "." ? "dist" : dirname);
}

function filterMains(mains, pkg) {
  return mains.filter(
    field => field in pkg && pkg.zeropack.mains.indexOf(field) > -1
  );
}

async function getDefaultOptions(pkg) {
  // Set up defaults that don't require calculation.
  pkg = merge(
    {
      devDependencies: {},
      engines: { node: (await readFile(".nvmrc")) || "current" },
      main: "./dist/index.js",
      name: "unknown",
      zeropack: {
        devtool: "source-map",
        mains: ["browser", "main", "module"],
        mode: "development",
        src: "./src/index.js"
      }
    },
    pkg
  );
  // Merge with defaults that require the uncalculated defaults.
  return merge(
    {
      zeropack: {
        alias: { [pkg.name]: src },
        externals: Object.keys({
          ...pkg.dependencies,
          ...pkg.devDependencies,
          ...pkg.optionalDependencies,
          ...pkg.peerDependencies
        }),
        name: uppercamelcase(pkg.name)
      }
    },
    pkg
  );
}

async function getFlowOptions(pkg) {
  pkg = await getDefaultOptions(pkg);
  if (!pkg.devDependencies["flow-bin"]) {
    return [];
  }
  return filterMains(["browser", "main", "module"], pkg).map(field => {
    const pkgField = pkg[field];
    return {
      entry: pkg.zeropack.src,
      output: {
        filename: path.basename(pkgField),
        path: getOutputPath(pkgField)
      }
    };
  });
}

async function getWebpackOptions(pkg) {
  pkg = await getDefaultOptions(pkg);
  const {
    env: userBabelOptionsEnv,
    userBabelOptions
  } = await getUserBabelOptions();
  const babelConfig = merge(
    {
      presets: defaultBabelPresets,
      sourceMaps: true
    },
    userBabelOptions
  );
  const babelConfigEnv = merge(
    {
      browser: {
        presets: [babelPresetEnv]
      },
      main: {
        presets: [[babelPresetEnv, { targets: { node: pkg.engines.node } }]]
      },
      module: {
        presets: [[babelPresetEnv, { modules: false }], babelPresetStage0]
      }
    },
    userBabelOptionsEnv
  );
  return filterMains(["browser", "main", "module"], pkg).map(field => {
    const pkgField = pkg[field];
    const shouldEmit = ["main", "module"].indexOf(field) > -1;
    return {
      // Setting the context to the source directory ensures that the dirname
      // is not prepended to the output dir when emitting all files. For
      // example if your output path is "dist" and your entry is
      // "./src/index.js", then your output is "./dist/src/index.js".
      context: path.resolve(path.dirname(pkg.zeropack.src)),
      devtool: pkg.zeropack.devtool,
      entry: `./${path.basename(pkg.zeropack.src)}`,
      externals: pkg.zeropack.externals,
      mode: pkg.zeropack.mode,
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            use: [
              {
                loader: require.resolve("babel-loader"),
                options: merge(babelConfig, babelConfigEnv[field])
              }
            ]
          }
        ]
      },
      output: {
        filename: path.basename(pkgField),
        library: zeropack.name,
        libraryTarget: "umd",
        path: getOutputPath(pkgField)
      },
      plugins: shouldEmit
        ? [new WebpackEmitAllPlugin(), new WebpackNoEmitPlugin()]
        : [],
      resolve: {
        alias: pkg.zeropack.alias
      }
    };
  });
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
  pkg = await getDefaultOptions(pkg);
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
  buildFlow,
  buildWebpack,
  clean,
  getDefaultOptions,
  getFlowOptions,
  getOutputPath,
  getUserBabelOptions,
  getWebpackOptions,
  zeropack
};
