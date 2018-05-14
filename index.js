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

function filterMains(mains, pkg) {
  return mains.filter(
    field => field in pkg && pkg.zeropack.mains.indexOf(field) > -1
  );
}

async function getFlowOptions(pkg) {
  if (!pkg.devDependencies["flow-bin"]) {
    return [];
  }
  return filterMains(["browser", "main", "module"], pkg).map(field => {
    const pkgField = pkg[field];
    return {
      webpack: {
        entry: pkg.zeropack.src,
        output: {
          filename: path.basename(pkgField),
          path: getOutputPath(pkgField)
        }
      }
    };
  });
}

async function getWebpackOptions(pkg) {
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
        presets: [[babelPresetEnv, { targets: { node: nodeVersion } }]]
      },
      module: {
        presets: [[babelPresetEnv, { modules: false }], babelPresetStage0]
      }
    },
    userBabelOptionsEnv
  );
  return filterMains(["browser", "main", "module"], pkg).map(field => {
    const pkgField = pkg[field];
    const options = {
      devtool: "source-map",
      entry: pkg.zeropack.src,
      externals: pkg.zeropack.externals,
      mode: pkg.zeropack.mode,
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            use: [
              {
                loader: "babel-loader",
                options: merge(babelConfig, babelConfigEnv[field])
              }
            ]
          }
        ]
      },
      output: {
        library: zeropack.name,
        libraryTarget: "umd"
      }
    };
    return {
      env: field,
      webpack: {
        output: {
          filename: path.basename(pkgField),
          path: getOutputPath(pkgField)
        },
        ...options
      }
    };
  });
}

async function buildBabel(opt) {
  return buildWebpack(
    merge(opt, {
      plugins: [new WebpackEmitAllPlugin()]
    })
  );
  // return Promise.all(
  //   opt.map(async o => {
  //     const { entry } = o.webpack;
  //     const {
  //       filename: outputFileBasename,
  //       path: outputPath
  //     } = o.webpack.output;
  //     const entryResolved = path.resolve(entry);
  //     return Promise.all(
  //       await sourceTrace(entry).map(async file => {
  //         const relativeFile =
  //           file === entryResolved
  //             ? outputFileBasename
  //             : path.relative(path.dirname(entryResolved), file);
  //         const relativeFileMap = `${relativeFile}.map`;
  //         const outputFile = path.join(outputPath, relativeFile);
  //         const outputFileMap = `${outputFile}.map`;

  //         // We have to do this synchronously so that we can force the
  //         // BABEL_ENV. If we don't do this, other transpiles might interfere
  //         // by setting the environemnt to something we don't expect here.
  //         const oldBabelEnv = process.env.BABEL_ENV;
  //         process.env.BABEL_ENV = o.env;
  //         const transformed = babel.transformFileSync(file, o.babel);
  //         process.env.BABEL_ENV = oldBabelEnv;

  //         // Write code and map to the output folder.
  //         await Promise.all([
  //           fs.outputFile(
  //             outputFile,
  //             `${transformed.code}\n\n//# sourceMappingURL=${relativeFileMap}`
  //           ),
  //           fs.outputFile(outputFileMap, JSON.stringify(transformed.map))
  //         ]);
  //       })
  //     );
  //   })
  // );
}

async function buildFlow(opt) {
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

async function clean(pkg) {
  return Promise.all(
    filterMains(["browser", "main", "module"], pkg)
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
      main: pkg.main,
      zeropack: {
        externals: (await cwdPath("node_modules"))
          ? webpackNodeExternals()
          : [],
        mains: ["browser", "main", "module"],
        mode: "development",
        name: uppercamelcase(pkg.name || ""),
        src: "./src/index.js"
      }
    },
    ...pkg
  };
  return Promise.all([
    await clean(pkg),
    await buildBabel(getBabelOptions(pkg)),
    await buildWebpack(getWebpackOptions(pkg)),
    await buildFlow(getFlowOptions(pkg))
  ]);
}

module.exports = {
  getBabelOptions,
  getWebpackOptions,
  zeropack
};
