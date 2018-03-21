# zeropack

Practical, zero-config Webpack, until you need it.

## Installing

```sh
npm i -D zeropack
```

## Usage

Generally you'll use it without any arguments.

```sh
$ zeropack
```

But, like Webpack, you can pass some along:

```sh
$ zeropack --mode development
```

## Configuration

The goal of this project is to provide the most practical zero-config setup and infer defaults where possible from other parts of your repo, such as your `package.json`. When that is not possible, or you want to customise it, you may do so in a number of ways.

Each configuration exported by a `zeropack` entry in the `package.json`, `zeropack.js` or `.zeropackrc` will be merged with the default configuration. You may specify none or all of the aforementioned configuration methods and they will be merged in that order, overriding the defaults.

### `entry`

Defaults to `./src/index.js`.

### `externals`

Uses `webpack-node-externals` to infer your externals.

### `mode`

Defaults to `"production"` but you can pass `--mode` or override in your configuration.

### `module`

Defaults to:

```js
{
  rules: [{ test: /\.js$/, use: "babel-loader" }];
}
```

### `output.filename`

Attempts to infer the filename by taking the `basename` of the `main` field in your `package.json`. For example, a `main` of `src/index.js` would become `index.js`. If it cannot infer this, it defaults to `index.js`.

### `output.library`

Attempts to infer by `PascalCasing` the `name` field in your `package.json`. If it cannot infer the name, then it passes `undefined`.

### `output.libraryTarget`

Defaults to `umd`.

### `output.path`

Attempts to infer by taking the `dirname` of the `main` field in your `package.json`. For example, a `main` of `src/index.js` would become `src`, but converted to an absolute path. If it cannot infer this, it defaults to `dist`.

## Flow

If `flow-bin` is detected as a `devDependency`, then it will automatically use `flow-copy-source` from the `dirname` of your `entry` to the `output.path`.
