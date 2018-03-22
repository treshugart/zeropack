const fs = require("fs-extra");
const path = require("path");
const { zeropack } = require("..");
const { cwd } = require("./__utils__");

const dir = "__tests__/__fixtures__/defaults";
const dirDist = path.join(dir, "dist");

beforeAll(async () => {
  await cwd(dir);
});

afterAll(async () => {
  await fs.remove(dirDist);
});

async function output(file) {
  return (await fs.readFile(path.join(dirDist, file))).toString("utf8");
}

test("output", async () => {
  await zeropack();
  expect(await output("index.js")).toMatchSnapshot();
});
