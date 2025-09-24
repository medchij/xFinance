const serverless = require("serverless-http");
const app = require("../server");   // server.js → module.exports = app
module.exports = serverless(app);
