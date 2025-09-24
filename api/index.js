// api/index.js (эсвэл server.js)
const express = require("express");
...
const serverless = require("serverless-http");
const app = express();
...
module.exports = serverless(app); // ⬅️ энэ мөр чухал
