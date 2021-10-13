import express from 'express';
const bcrypt = require("bcrypt");
import jwt from 'jsonwebtoken';
import documentClient from "../dbconnect";
import HttpException from '../exceptions/HttpException';

interface IUser {
  name: string,
  role: string
}

export const login = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const username: string = req.body.username;
  const password: string = req.body.password;
  const params = {
    TableName: "Timecards",
    Key: {
      user: username,
      attendance: "user"
    }
  };
  try {
    const result: any = await documentClient.get(params).promise();
    if (!Object.keys(result).length) throw new HttpException(404, "User does not exist")
    const comparedPassword = await bcrypt.compare(password, result.Item.password);
    if (!comparedPassword) throw new HttpException(400, "Your password is incorrect")
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
  } catch (err) {
    next(err)
  }
};

export const token = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const refreshToken: string = req.body.token;
  if (refreshToken == null) return next(new HttpException(401,"RefreshToken is null"))
  const refreshTokenSecret: jwt.Secret = process.env.REFRESH_TOKEN_SECRET ?? "defaultrefreshsecret"
  jwt.verify(refreshToken, refreshTokenSecret, (err: any, user: any) => {
    if (err) return next(new HttpException(401, "Your refreshToken is incorrect"))
    const accessToken = generateAccessToken({
      name: user.name,
      role: user.role,
    });
    return res.json({ accessToken: accessToken });
  });
};

const generateAccessToken = (user: IUser) => {
  const accessTokenSecret: jwt.Secret = process.env.ACCESS_TOKEN_SECRET ?? "defaultaccesssecret"
  return jwt.sign(user, accessTokenSecret, { expiresIn: "1h" });
}

