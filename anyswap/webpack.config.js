/* eslint-disable */
const path = require('path')

module.exports = {
  //  externals: {
  //    "@sentio/sdk": "@sentio/sdk"
  //  },
  entry: {
    lib: './src/processor.ts',
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  target: 'node',
  mode: 'development',
}
