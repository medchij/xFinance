/* eslint-disable no-undef */

require("dotenv").config({ path: ".env.production" });
const path = require("path");
const devCerts = require("office-addin-dev-certs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const urlDev = "https://localhost:3000/";
const urlProd = "https://medchij-xfinance.vercel.app/";

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return { ca: httpsOptions.ca, key: httpsOptions.key, cert: httpsOptions.cert };
}

module.exports = async (env = {}, options = {}) => {
  const dev = options.mode === "development";
  const useAnalyzer = process.env.ANALYZE === "true"; // analyzer зөвхөн хүссэн үед

  return {
    devtool: "source-map",
    entry: {
      vendor: ["react", "react-dom", "@fluentui/react-components", "@fluentui/react-icons"],
      XFinance: ["./src/XFinance/index.jsx", "./src/XFinance/XFinance.html"],
      commands: "./src/commands/commands.js",
    },
   
    output: { path: path.resolve(__dirname, "dist"), clean: true, filename: "[name].js" },
    resolve: {
      extensions: [".js", ".jsx", ".html"],
      fallback: {
        util: require.resolve("util/"),
        path: require.resolve("path-browserify"),
        buffer: require.resolve("buffer/"),
        fs: false,
      },
    },
    module: {
      rules: [
        { test: /\.jsx?$/, use: { loader: "babel-loader" }, exclude: /node_modules/ },
        { test: /\.html$/, exclude: /node_modules/, use: "html-loader" },
        {
          test: /\.(png|jpg|jpeg|ttf|woff|woff2|gif|ico|svg)$/,
          type: "asset/resource",
          generator: { filename: "assets/[name][ext][query]" },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "XFinance.html",
        template: "./src/XFinance/XFinance.html",
        chunks: ["vendor", "XFinance"],
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: "assets/*", to: "assets/[name][ext][query]" },
          {
            from: "manifest*.xml",
            to: "[name][ext]",
            transform(content) {
              return dev ? content : content.toString().replace(new RegExp(urlDev, "g"), urlProd);
            },
          },
        ],
      }),
      new HtmlWebpackPlugin({
        filename: "commands.html",
        template: "./src/commands/commands.html",
        chunks: ["commands"],
      }),
      new webpack.ProvidePlugin({
        Promise: ["es6-promise", "Promise"],
        Buffer: ["buffer", "Buffer"],
      }),
      new NodePolyfillPlugin(),

      // Environment variables
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(options.mode),
        'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || '')
      }),

      ...(useAnalyzer
        ? [
            new BundleAnalyzerPlugin({
              analyzerMode: "static",
              reportFilename: "report.html",
              openAnalyzer: false,
              generateStatsFile: true,
              statsFilename: "stats.json",
              defaultSizes: "gzip",
            }),
          ]
        : []),
    ],

    externals: { "@microsoft/office-js": "Office" },
    optimization: {
      splitChunks: {
        chunks: "all",
        cacheGroups: {
          fluent: { test: /[\\/]node_modules[\\/]@fluentui[\\/]/, name: "fluent", priority: 15, reuseExistingChunk: true },
          polyfills: { test: /[\\/]node_modules[\\/]core-js[\\/]/, name: "polyfills", priority: 10, reuseExistingChunk: true },
        },
      },
      runtimeChunk: "single",
      usedExports: true,
      sideEffects: true,
    },
    performance: dev ? false : {
      hints: "warning",
      maxEntrypointSize: 700000,
      maxAssetSize: 700000,
    },
    devServer: {
      hot: true,
      headers: { "Access-Control-Allow-Origin": "*" },
      devMiddleware: { writeToDisk: !!process.env.WRITE_TO_DISK || useAnalyzer },
      server: dev
        ? {
            type: "https",
            options: env.WEBPACK_BUILD || options.https !== undefined
              ? options.https
              : await getHttpsOptions(),
          }
        : "http",
      port: process.env.npm_package_config_dev_server_port || 3000,
    },
  };
};
