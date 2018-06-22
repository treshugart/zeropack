#!/usr/bin/env node
// @flow

const nodeWatch = require("node-watch");
const yargs = require("yargs");
const buildZeropack = require("../build-zeropack");

(async function() {
  const { _, $0, help, version, watch } = yargs.argv;
  if (watch) {
    nodeWatch(".", { recursive: true }, async () => await buildZeropack());
  } else {
    await buildZeropack();
  }
})();
