/* eslint-disable */
import app from "./app";
const serverlessExpress = require("@vendia/serverless-express");
const server = serverlessExpress.createServer(app);

exports.handler = (event: any, context: any) =>
  serverlessExpress.proxy(server, event, context);
