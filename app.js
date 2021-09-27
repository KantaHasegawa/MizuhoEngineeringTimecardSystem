const express = require("express");
const app = express();

if (process.env.NODE_ENV === "development") {
  require('dotenv').config();
}

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

const router = require("./routes/v1/index.js");

app.use("/", router);

module.exports = app;
