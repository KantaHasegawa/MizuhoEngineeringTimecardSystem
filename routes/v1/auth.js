const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const documentClient = require("../../dbconnect")

router.post("/login", async(req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const params = {
    TableName: "Timecards",
    Key: {
      user: username,
      attendance: "user"
    }
  };
  const result = await documentClient.get(params).promise();
  if (!Object.keys(result).length) return res.send(404).json({"message":"request user is not found"})

  const comparedPassword = await bcrypt.compare(password, result.Item.password);
  if (!comparedPassword) return res.send(401);

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
  if (refreshToken == null) return res.send(401);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.send(403);
    const accessToken = generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
  });
});

const generateAccessToken = (user) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
}

module.exports = router;
