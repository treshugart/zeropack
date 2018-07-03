// @flow

const cosmiconfig = require("cosmiconfig");
const merge = require("lodash/merge");
const path = require("path");
const pickBy = require("lodash/pickBy");
const uppercamelcase = require("uppercamelcase");
const getBabelOptionsForType = require("./get-babel-options-for-type");
const getPkgOptions = require("./get-pkg-options");

function getOutputPath(file) {
  const dirname = path.dirname(file);
  return path.join(process.cwd(), dirname === "." ? "dist" : dirname);
}

function getLibraryTarget(type) {
  return type === "main" ? "commonjs2" : "umd";
}

async function getDefaultZeropackOptionsForType(type) {
  const pkg = await getPkgOptions();
  return pkg[type]
    ? {
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
                  options: getBabelOptionsForType(type)
                }
              ]
            }
          ]
        },
        output: {
          filename: path.basename(pkg[type]),
          library: uppercamelcase(pkg.name),
          libraryTarget: getLibraryTarget(type),
          path: getOutputPath(pkg[type])
        },
        resolve: {
          alias: { [pkg.name]: "./src/index.js" }
        }
      }
    : null;
}

async function getDefaultZeropackOptions() {
  return {
    browser: await getDefaultZeropackOptionsForType("browser"),
    main: await getDefaultZeropackOptionsForType("main"),
    module: await getDefaultZeropackOptionsForType("module")
  };
}

async function getUserZeropackOptions() {
  const loaded = await cosmiconfig("zeropack").load();
  return loaded ? loaded.config : {};
}

module.exports = async function getZeropackOptions() {
  return pickBy(
    merge(await getDefaultZeropackOptions(), await getUserZeropackOptions()),
    Boolean
  );
};
