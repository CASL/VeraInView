const path = require('path');

const linterRules = require('./rules/linter.js');
const veraRules = require('./rules/vera.js');
const vtkRules = require('./rules/vtkjs.js');

const plugins = [];
const app = path.join(__dirname, './src/index.js');
const sourcePath = path.join(__dirname, './src');
const outputPath = path.join(__dirname, './dist');

module.exports = {
  plugins,
  entry: {
    vera: app,
  },
  output: {
    path: outputPath,
    filename: '[name].js',
  },
  module: {
    rules: [{ test: app, loader: 'expose-loader?vera' }].concat(
      linterRules,
      veraRules,
      vtkRules
    ),
  },
  resolve: {
    modules: [path.resolve(__dirname, 'node_modules'), sourcePath],
  },
  devServer: {
    contentBase: outputPath,
    port: 9999,
    host: '0.0.0.0',
    disableHostCheck: true,
    hot: false,
    quiet: false,
    noInfo: false,
    stats: {
      colors: true,
    },
  },
};
