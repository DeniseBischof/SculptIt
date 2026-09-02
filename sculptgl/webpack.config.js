var CopyWebpackPlugin = require('copy-webpack-plugin');
var path = require('path');

module.exports = function (env) {
  env = env || {};

  var config = {
    entry: {
      sculptgl: './main.js',
      sculptit: './src-sculptit/main.js'
    },
    output: {
      library: '[name]',
      libraryTarget: 'umd',
      path: path.resolve(__dirname, 'app'),
      filename: '[name].js',
      // md4 (webpack default) is rejected by OpenSSL 3 / Node >= 17
      hashFunction: 'sha256'
    },
    resolve: {
      modules: [
        path.join(__dirname, 'src'),
        path.join(__dirname, 'lib'),
        path.join(__dirname, 'node_modules')
      ]
    },
    module: {
      rules: [{
        test: /\.glsl$/,
        loader: 'raw-loader'
      }]
    },
    plugins: []
  };

  config.mode = (env.release || env.website) ? 'production' : 'development';

  var indexFile;
  if (env.release) {
    indexFile = 'tools/index.release.html';
  } else if (env.website) {
    indexFile = 'tools/index.website.html';
  } else {
    indexFile = 'tools/index.dev.html';
  }

  config.plugins.push(new CopyWebpackPlugin({
    patterns: [
      { from: 'tools/authSuccess.html', to: 'authSuccess.html' },
      // SculptIt is the main app; the untouched SculptGL UI stays reachable
      { from: 'tools/index.sculptit.html', to: 'index.html' },
      { from: 'src-sculptit/sculptit.css', to: 'css/sculptit.css' },
      { from: indexFile, to: 'classic.html' }
    ],
  }));

  if (env.release) {
    config.module.rules.push({
      test: /\.js$/,
      use: [{
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }]
    });
  }

  return config;
};
