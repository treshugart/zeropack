const { read, run } = require("./__utils__");

test("defaults", async () => {
  await run("defaults");
  expect(await read("dist/index.js")).toMatchSnapshot();
  expect(await read("dist/index.js.map")).toMatchSnapshot();
});

test("custom", async () => {
  await run("custom");
  expect(await read("dist/browser.js")).toMatchSnapshot();
  expect(await read("dist/browser.js.flow")).toMatchSnapshot();
  expect(await read("dist/browser.js.map")).toMatchSnapshot();
  expect(await read("dist/main.js")).toMatchSnapshot();
  expect(await read("dist/main.js.flow")).toMatchSnapshot();
  expect(await read("dist/main.js.map")).toMatchSnapshot();
  expect(await read("dist/module.js")).toMatchSnapshot();
  expect(await read("dist/module.js.flow")).toMatchSnapshot();
  expect(await read("dist/module.js.map")).toMatchSnapshot();
});
