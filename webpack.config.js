const webpack = require('webpack');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const plugins = [];
const entry = path.join(__dirname, './src/index.js');
const sourcePath = path.join(__dirname, './src');
const outputPath = path.join(__dirname, './dist');

const linterRules = require('./rules/linter.js');
const veraRules = require('./rules/vera.js');
const vtkRules = require('./rules/vtkjs.js');

module.exports = (env) => {
  if (env && env.release) {
    plugins.push(
      new UglifyJSPlugin({
        uglifyOptions: {
          beautify: false,
          ecma: 6,
          compress: true,
          comments: false,
        },
      })
    );
    // from https://moduscreate.com/blog/optimizing-react-es6-webpack-production-build/
    // tell React to drop test helpers
    plugins.push(
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify('production'),
        },
      })
    );
  }
  return {
    plugins,
    entry,
    output: {
      path: outputPath,
      filename: 'vera.js',
    },
    module: {
      rules: [{ test: entry, loader: 'expose-loader?vera' }].concat(
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
};
