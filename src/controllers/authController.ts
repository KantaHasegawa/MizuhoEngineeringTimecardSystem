import express from 'express';
const bcrypt = require("bcrypt");
import jwt from 'jsonwebtoken';
import documentClient from "../dbconnect";

interface IUser {
  name: string,
  role: string
}

export const login = async (req: express.Request, res: express.Response) => {
  const username: string = req.body.username;
  const password: string = req.body.password;
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
  const user: IUser = {
    name: result.Item.user,
    role: result.Item.role,
  };
  const accessToken: string = generateAccessToken(user);
  const refreshTokenSecret: jwt.Secret = process.env.REFRESH_TOKEN_SECRET ?? "defaultrefreshsecret"
  const refreshToken: string = jwt.sign(user, refreshTokenSecret, {
    expiresIn: "90d",
  });
  res.json({ accessToken: accessToken, refreshToken: refreshToken });
};

export const token = (req: express.Request, res: express.Response) => {
  const refreshToken: string = req.body.token;
  if (refreshToken == null) return res.send(401);
  const refreshTokenSecret: jwt.Secret = process.env.REFRESH_TOKEN_SECRET ?? "defaultrefreshsecret"
  jwt.verify(refreshToken, refreshTokenSecret, (err: any, user: any) => {
    if (err) return res.send(403);
    const accessToken = generateAccessToken({
      name: user.name,
      role: user.role,
    });
    return res.json({ accessToken: accessToken });
  });
  return
};

const generateAccessToken = (user: IUser) => {
  const accessTokenSecret: jwt.Secret = process.env.ACCESS_TOKEN_SECRET ?? "defaultaccesssecret"
  return jwt.sign(user, accessTokenSecret, { expiresIn: "1h" });
}
