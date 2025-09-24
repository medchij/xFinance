const app = require("../backend/app");
const serverless = require("serverless-http");

module.exports = serverless(app);
