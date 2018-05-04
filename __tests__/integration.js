const { read, run } = require("./__utils__");

jest.setTimeout(25000);

test("defaults", async () => {
  await run("defaults");
  expect(await read("dist/index.js")).toMatchSnapshot();
  expect(await read("dist/index.js.map")).toMatchSnapshot();
});

test("custom", async () => {
  await run("custom");

  expect(await read("dist/browser/index.js")).toMatchSnapshot();
  expect(await read("dist/browser/index.js.flow")).toMatchSnapshot();
  expect(await read("dist/browser/index.js.map")).toMatchSnapshot();
  expect(
    await read("dist/browser/index.anotherfile.js.flow")
  ).toMatchSnapshot();

  expect(await read("dist/main/index.js")).toMatchSnapshot();
  expect(await read("dist/main/index.js.flow")).toMatchSnapshot();
  expect(await read("dist/main/index.js.map")).toMatchSnapshot();
  expect(await read("dist/main/index.anotherfile.js")).toMatchSnapshot();
  expect(await read("dist/main/index.anotherfile.js.flow")).toMatchSnapshot();
  expect(await read("dist/main/index.anotherfile.js.map")).toMatchSnapshot();

  expect(await read("dist/module/index.js")).toMatchSnapshot();
  expect(await read("dist/module/index.js.flow")).toMatchSnapshot();
  expect(await read("dist/module/index.js.map")).toMatchSnapshot();
  expect(await read("dist/module/index.anotherfile.js")).toMatchSnapshot();
  expect(await read("dist/module/index.anotherfile.js.flow")).toMatchSnapshot();
  expect(await read("dist/module/index.anotherfile.js.map")).toMatchSnapshot();
});
