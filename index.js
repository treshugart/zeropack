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
const webpackNodeExternals = require("webpack-node-externals");

const defaultBabelPresets = [
  babelPresetFlow,
  babelPresetReact,
  babelPresetStage0
];

async function cwdPath(...parts) {
  const possiblePath = path.join(process.cwd(), ...parts);
  return (await fs.exists(possiblePath)) ? possiblePath : null;
}

async function getNodeVersion() {
  return (await fs.exists(".nvmrc"))
    ? (await fs.readFile(".nvmrc"))
        .toString("utf8")
        .trim()
        .replace("v", "")
    : "current";
}

async function getUserBabelOptions() {
  const loaded = await cosmiconfig("babel").load();
  return loaded ? loaded.config : {};
}

function getOutputPath(file) {
  const dirname = path.dirname(file);
  return path.join(process.cwd(), dirname === "." ? "dist" : dirname);
}

async function getBabelOptions(pkg) {
  const nodeVersion = await getNodeVersion();
  const babelConfig = merge(await getUserBabelOptions(), {
    sourceMaps: true,
    presets: defaultBabelPresets,
    env: {
      main: {
        presets: [[babelPresetEnv, { targets: { node: nodeVersion } }]]
      },
      module: {
        presets: [[babelPresetEnv, { modules: false }], babelPresetStage0]
      }
    }
  });
  return ["main", "module"].filter(field => field in pkg).map(field => {
    const pkgField = pkg[field];
    return {
      env: field,
      babel: babelConfig,
      webpack: {
        entry: pkg.source,
        output: {
          filename: path.basename(pkgField),
          path: getOutputPath(pkgField)
        }
      }
    };
  });
}

async function getFlowOptions(pkg) {
  if (!pkg.devDependencies["flow-bin"]) {
    return [];
  }
  return ["browser", "main", "module"]
    .filter(field => field in pkg)
    .map(field => {
      const pkgField = pkg[field];
      return {
        webpack: {
          entry: pkg.source,
          output: {
            filename: path.basename(pkgField),
            path: getOutputPath(pkgField)
          }
        }
      };
    });
}

async function getWebpackOptions(pkg) {
  const options = {
    devtool: "source-map",
    entry: pkg.source,
    externals: (await cwdPath("node_modules")) ? webpackNodeExternals() : [],
    mode: pkg.mode || "development"
  };
  const optionsOutput = {
    library: uppercamelcase(pkg.name || ""),
    libraryTarget: "umd"
  };
  const babelConfig = merge(await getUserBabelOptions(), {
    env: {
      presets: defaultBabelPresets,
      browser: {
        presets: [babelPresetEnv]
      }
    }
  });
  return ["browser"].filter(field => field in pkg).map(field => {
    const pkgField = pkg[field];
    return {
      env: field,
      webpack: {
        module: {
          rules: [
            {
              test: /\.jsx?$/,
              use: [
                {
                  loader: "babel-loader",
                  options: babelConfig
                }
              ]
            }
          ]
        },
        output: {
          filename: path.basename(pkgField),
          path: getOutputPath(pkgField),
          ...optionsOutput
        },
        ...options
      }
    };
  });
}

async function buildBabel(pkg) {
  const opt = await getBabelOptions(pkg);
  return Promise.all(
    opt.map(async o => {
      const { entry } = o.webpack;
      const {
        filename: outputFileBasename,
        path: outputPath
      } = o.webpack.output;
      const entryResolved = path.resolve(entry);
      return Promise.all(
        await sourceTrace(entry).map(async file => {
          const relativeFile =
            file === entryResolved
              ? outputFileBasename
              : path.relative(path.dirname(entryResolved), file);
          const relativeFileMap = `${relativeFile}.map`;
          const outputFile = path.join(outputPath, relativeFile);
          const outputFileMap = `${outputFile}.map`;

          // We have to do this synchronously so that we can force the
          // BABEL_ENV. If we don't do this, other transpiles might interfere
          // by setting the environemnt to something we don't expect here.
          const oldBabelEnv = process.env.BABEL_ENV;
          process.env.BABEL_ENV = o.env;
          const transformed = babel.transformFileSync(file, o.babel);
          process.env.BABEL_ENV = oldBabelEnv;

          // Write code and map to the output folder.
          await Promise.all([
            fs.outputFile(
              outputFile,
              `${transformed.code}\n\n//# sourceMappingURL=${relativeFileMap}`
            ),
            fs.outputFile(outputFileMap, JSON.stringify(transformed.map))
          ]);
        })
      );
    })
  );
}

async function buildFlow(pkg) {
  const opt = await getFlowOptions(pkg);
  return Promise.all(
    opt.map(async o => {
      const { entry } = o.webpack;
      const {
        filename: outputFileBasename,
        path: outputPath
      } = o.webpack.output;
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
  const opt = getWebpackOptions(pkg);
  return Promise.all(
    opt.map(o => {
      process.env.BABEL_ENV = o.env;
      return new Promise((yup, nup) =>
        webpack(o.webpack, (error, stats) => {
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
        })
      ).catch(e => {
        throw e;
      });
    })
  );
}

async function clean(pkg) {
  return Promise.all(
    ["browser", "main", "module"]
      .map(field => pkg[field])
      .filter(Boolean)
      .map(fieldPath => getOutputPath(fieldPath))
      .filter((field, index, array) => array.indexOf(field) === index)
      .map(async outputPath => fs.remove(outputPath))
  );
}

async function zeropack(pkg) {
  pkg = {
    ...{
      devDependencies: {},
      main: "dist/index.js",
      source: "./src/index.js"
    },
    ...pkg
  };
  return Promise.all([
    await clean(pkg),
    await buildBabel(pkg),
    await buildWebpack(pkg),
    await buildFlow(pkg)
  ]);
}

module.exports = {
  zeropack
};
