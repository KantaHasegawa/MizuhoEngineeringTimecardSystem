import express from 'express';
const bcrypt = require("bcrypt");
import jwt from 'jsonwebtoken';
import documentClient from "../dbconnect";
import HttpException from '../exceptions/HttpException';
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

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
    res.cookie("refreshToken", refreshToken, {httpOnly: true});
    res.json({ accessToken: accessToken, refreshToken: refreshToken });
  } catch (err) {
    next(err)
  }
};

export const token = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const refreshToken: string = req.body.refreshToken;
  if (refreshToken == null) return next(new HttpException(401, "RefreshToken is null"))
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user' },
    ExpressionAttributeValues: { ':val': 'refreshTokenBlackList' },
    KeyConditionExpression: '#u = :val'
  };
  const results: any = await documentClient.query(params).promise()
  console.log(results.Items)
  const blackList = results.Items.map((item: any) => item.attendance)
  if (blackList.includes(refreshToken)) return next(new HttpException(401, "Invalid refreshToken"))
  const refreshTokenSecret: jwt.Secret = process.env.REFRESH_TOKEN_SECRET ?? "defaultrefreshsecret"
  jwt.verify(refreshToken, refreshTokenSecret, (err: any, user: any) => {
    if (err) return next(err)
    const accessToken = generateAccessToken({
      name: user.name,
      role: user.role,
    });
    return res.json({ accessToken: accessToken });
  });
};

export const logout =  (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    user: "refreshTokenBlackList",
    attendance: req.body.refreshToken,
    expirationTime: dayjs.utc().add(1, 'week').unix()
  };
  return documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then((result) => res.json({ message: "Logout success" }))
    .catch((err) => next(err))
}

const generateAccessToken = (user: IUser) => {
  const accessTokenSecret: jwt.Secret = process.env.ACCESS_TOKEN_SECRET ?? "defaultaccesssecret"
  return jwt.sign(user, accessTokenSecret, { expiresIn: "1h" });
}
