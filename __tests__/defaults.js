const exec = require("execa");
const fs = require("fs-extra");
const path = require("path");
const { zeropack } = require("..");
const { cwd, read, rm } = require("./__utils__");

beforeAll(async () => {
  await cwd("defaults");
});

afterAll(async () => {
  await rm("dist");
});

test("bin", async () => {
  await exec("node", ["../../../bin.js"], { cwd: process.cwd() });
  expect(await read("dist/index.js")).toMatchSnapshot();
});

test("output", async () => {
  await zeropack();
  expect(await read("dist/index.js")).toMatchSnapshot();
});
