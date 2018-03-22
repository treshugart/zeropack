const exec = require("execa");
const fs = require("fs-extra");
const path = require("path");
const { cwd, read, rm } = require("./__utils__");

async function run(fixture, ...args) {
  await cwd(fixture);
  await exec("node", ["../../../bin.js", ...args], { cwd: process.cwd() });
}

test("defaults", async () => {
  await run("defaults");
  expect(await read("dist/index.js")).toMatchSnapshot();
});

test("defaults - { mode: development }", async () => {
  await run("defaults", "--mode", "development");
  expect(await read("dist/index.js")).toMatchSnapshot();
});
