const express = require("express");
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

router.get("/", (req, res) => {
  const env = process.env.NODE_ENV
  res.json({ message: `env is ${env}` });
});

//users

router.get("/users", (req, res) => {
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

//authentication

router.post("/login", async(req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const params = {
    TableName: "Timecards",
    Key: {
      user: username,
      workspot: "user"
    }
  };
  const result = await documentClient.get(params).promise();

  const comparedPassword = await bcrypt.compare(password, result.Item.password);

  if (!comparedPassword) return res.sendStatus(401);

  const user = {
    user: result.Item.user,
    role: result.Item.role,
  };
  const accessToken = generateAccessToken(user);
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "90d",
  });
  res.json({ accessToken: accessToken, refreshToken: refreshToken });
});

router.post("/token", (req, res) => {
  const refreshToken = req.body.token;
  if (refreshToken == null) return res.sendStatus(401);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
  });
});

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15s" });
}

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
