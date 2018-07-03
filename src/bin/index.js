#!/usr/bin/env node
// @flow

const Listr = require("listr");
const nodeWatch = require("node-watch");
const yargs = require("yargs");
const buildBabel = require("../build-babel");
const buildClean = require("../build-clean");
const buildFlow = require("../build-flow");
const buildWebpack = require("../build-webpack");

async function build() {
  return new Listr([
    {
      title: "Zeropack",
      task: () =>
        new Listr([
          {
            title: "Cleaning",
            task: buildClean
          },
          {
            title: "Building",
            task: () =>
              new Listr([
                {
                  title: "Babel",
                  task: buildBabel
                },
                {
                  title: "Flow",
                  task: buildFlow
                },
                {
                  title: "Webpack",
                  task: buildWebpack
                }
              ])
          }
        ])
    }
  ]);
}

(async function() {
  const { _, $0, help, version, watch } = yargs.argv;
  if (watch) {
    nodeWatch(".", { recursive: true }, async () => await build());
  } else {
    await buildClean();
    await buildBabel();
    // await build();
  }
})();
