const express = require("express");
const router = express.Router();
const AWS = require("aws-sdk");

const dynamoOptions =
  process.env.NODE_ENV === "development"
    ? {
        region: "localhost",
        endpoint: "http://localhost:8000",
      }
    : {};
const documentClient = new AWS.DynamoDB.DocumentClient(dynamoOptions);

router.get("/", (req, res) => {
  const env = process.env.NODE_ENV
  res.json({ message: `env is ${env}` });
});

router.get("/users", (req, res) => {
  documentClient
    .scan({
      TableName: "Timecards",
    })
    .promise()
    .then((result) => res.json(result))
    .catch((e) => res.status(422).json({ errors: e }));
});

module.exports = router;
