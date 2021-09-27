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

module.exports = router;
