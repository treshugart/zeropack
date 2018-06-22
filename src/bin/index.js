#!/usr/bin/env node
// @flow

import nodeWatch from "node-watch";
import yargs from "yargs";
import zeropack from "..";

(async function() {
  const { _, $0, help, version, watch } = yargs.argv;
  if (watch) {
    nodeWatch(".", { recursive: true }, async () => await zeropack());
  } else {
    await zeropack();
  }
})();
