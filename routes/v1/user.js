const express = require('express');
const router = express.Router();
const AWS = require("aws-sdk");
const bcrypt = require("bcrypt")
const jwt = require('jsonwebtoken');

const dynamoOptions =
  process.env.NODE_ENV === "development"
    ? {
        region: "localhost",
        endpoint: "http://localhost:8000",
      }
    : {};
const documentClient = new AWS.DynamoDB.DocumentClient(dynamoOptions);

router.get("/index", (req, res) => {
  documentClient
    .scan({
      TableName: "Timecards",
    })
    .promise()
    .then((result) => res.json(result))
    .catch((e) => res.status(422).json({ errors: e }));
});

router.post("/signup", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(hashedPassword);

  const params = {
    user: username,
    password: hashedPassword,
    workspot: "user",
    role: "common",
  };

  documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then((result) => res.json({ message: "insert seccess" }))
    .catch((e) => res.status(422).json({ errors: e }));
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    console.log(err);
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

module.exports = router;
