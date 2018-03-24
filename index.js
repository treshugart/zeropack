const babel = require("babel-core");
const flowCopySource = require("flow-copy-source");
const fs = require("fs-extra");
const path = require("path");
const sourceTrace = require("source-trace");
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
  return {
    ...{
      devDependencies: {},
      module: "dist/index.js",
      source: "./src/index.js"
    },
    ...(await cwdRequireJson("package.json"))
  };
}

function getOutputPath(file) {
  const dirname = path.dirname(file);
  return path.join(process.cwd(), dirname === "." ? "dist" : dirname);
}

async function getBabelOptions() {
  const pkg = await getPkg();
  return ["module"].filter(field => field in pkg).map(field => {
    const pkgField = pkg[field];
    return {
      env: field,
      babel: {
        sourceMaps: true
      },
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

async function getFlowOptions() {
  const pkg = await getPkg();
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

async function getWebpackOptions(opt) {
  const pkg = await getPkg();
  const options = {
    devtool: "source-map",
    entry: pkg.source,
    externals: (await cwdPath("node_modules")) ? webpackNodeExternals() : [],
    mode: opt.mode || "development"
  };
  const optionsOutput = {
    library: uppercamelcase(pkg.name || ""),
    libraryTarget: "umd"
  };

  return ["browser", "main"].filter(field => field in pkg).map(field => {
    const pkgField = pkg[field];
    return {
      env: field,
      webpack: {
        module: {
          rules: [
            {
              test: /\.js$/,
              use: [
                {
                  loader: "babel-loader",
                  options: { env: field }
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

async function buildBabel(opt) {
  return Promise.all(
    opt.map(async o => {
      process.env.BABEL_ENV = o.env;
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
          return new Promise((yup, nup) => {
            babel.transformFile(file, o.babel, async (e, r) => {
              if (e) {
                nup(e);
              } else {
                await Promise.all([
                  fs.outputFile(
                    outputFile,
                    `${r.code}\n\n//# sourceMappingURL=${relativeFileMap}`
                  ),
                  fs.outputFile(outputFileMap, JSON.stringify(r.map))
                ]);
                yup();
              }
            });
          });
        })
      );
    })
  );
}

async function buildFlow(opt) {
  const pkg = await getPkg();
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

async function buildWebpack(opt) {
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

async function clean() {
  const pkg = await getPkg();
  return Promise.all(
    ["browser", "main", "module"]
      .map(field => pkg[field])
      .filter(Boolean)
      .map(fieldPath => getOutputPath(fieldPath))
      .filter((field, index, array) => array.indexOf(field) === index)
      .map(async outputPath => fs.remove(outputPath))
  );
}

async function zeropack(opt = {}) {
  return Promise.all([
    await clean(),
    await buildBabel(await getBabelOptions(opt)),
    await buildWebpack(await getWebpackOptions(opt)),
    await buildFlow(await getFlowOptions(opt))
  ]);
}

module.exports = { getWebpackOptions, zeropack };
