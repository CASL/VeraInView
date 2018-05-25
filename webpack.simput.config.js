const path = require('path');

const linterRules = require('./rules/linter.js');
const veraRules = require('./rules/vera.js');
const vtkRules = require('./rules/vtkjs.js');
const pvwRules = require('./rules/paraviewweb.js');

const plugins = [];
const simput = path.join(__dirname, './src/simput/index.js');
const sourcePath = path.join(__dirname, './src');
const outputPath = path.join(__dirname, './dist');

module.exports = {
  plugins,
  entry: {
    'simput-external-vera': simput,
  },
  output: {
    path: outputPath,
    filename: '[name].js',
  },
  module: {
    rules: [].concat(
      linterRules,
      veraRules,
      vtkRules,
      pvwRules
    ),
  },
  resolve: {
    alias: {
      PVWStyle: path.resolve('./node_modules/paraviewweb/style'),
    },
    modules: [path.resolve(__dirname, 'node_modules'), sourcePath],
  },
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
  },
};
