// @flow

const merge = require('lodash/merge');
const getBabelOptions = require("./get-babel-options");

module.exports = function getBabelOptionsForType(type /*: string */) {
  const { env, ...babelConfig } = await getBabelOptions();
  return merge(babelConfig, env[type], { env });
};
