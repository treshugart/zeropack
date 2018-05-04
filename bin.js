#!/usr/bin/env node

const nodeWatch = require("node-watch");
const readPkgUp = require("read-pkg-up");
const yargs = require("yargs");
const { zeropack } = require(".");

(async function() {
  const { _, $0, help, version, watch, ...args } = yargs.argv;
  const pkg = await readPkgUp();
  const opts = { ...pkg, ...args };
  if (watch) {
    nodeWatch(".", { recursive: true }, async () => await zeropack(opts));
  } else {
    await zeropack(opts);
  }
})();
