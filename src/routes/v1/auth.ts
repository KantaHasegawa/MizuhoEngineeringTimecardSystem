import express from 'express';
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
import documentClient from "../../dbconnect";

router.post("/login", async (req: express.Request, res: express.Response) => {
  const username = req.body.username;
  const password = req.body.password;
  const params = {
    TableName: "Timecards",
    Key: {
      user: username,
      attendance: "user"
    }
  };
  const result: any = await documentClient.get(params).promise();
  if (!Object.keys(result).length) {
    res.send(404).json({ "message": "request user is not found" })
    return;
  }
  const comparedPassword = await bcrypt.compare(password, result.Item.password);
  if (!comparedPassword) {
    res.send(401);
    return
  }
  const user = {
    name: result.Item.user,
    role: result.Item.role,
  };
  const accessToken = generateAccessToken(user);
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "90d",
  });
  res.json({ accessToken: accessToken, refreshToken: refreshToken });
});

router.post("/token", (req: express.Request, res: express.Response) => {
  const refreshToken = req.body.token;
  if (refreshToken == null) return res.send(401);
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err: any, user: any) => {
    if (err) return res.send(403);
    const accessToken = generateAccessToken({
      name: user.name,
      role: user.role,
    });
    return res.json({ accessToken: accessToken });
  });
  return
});

const generateAccessToken = (user: any) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
}

module.exports = router;
