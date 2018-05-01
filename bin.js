#!/usr/bin/env node

const nodeWatch = require("node-watch");
const yargs = require("yargs");
const { zeropack } = require(".");

(async function() {
  const { _, $0, help, version, watch, ...args } = yargs.argv;
  if (watch) {
    nodeWatch(".", { recursive: true }, async () => await zeropack(args));
  } else {
    await zeropack(args);
  }
})();
