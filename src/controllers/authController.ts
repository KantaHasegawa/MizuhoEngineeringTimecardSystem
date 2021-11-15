import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import documentClient from "../helper/dbconnect";
import HttpException from "../exceptions/HttpException";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export type TypeUserToken = {
  name: string;
  role: string;
};

type TypeLoginRequestBody = {
  username: string;
  password: string;
};

export const login = async (
  req: express.Request<unknown, unknown, TypeLoginRequestBody>,
  res: express.Response,
  next: express.NextFunction
) => {
  const username = req.body.username;
  const password = req.body.password;
  const params = {
    TableName: "Timecards",
    Key: {
      user: username,
      attendance: "user",
    },
  };
  try {
    const result = await documentClient.get(params).promise();
    if (!Object.keys(result).length) {
      throw new HttpException(404, "氏名が間違っています");
    }
    type TypeUserResponse = {
      user: string;
      role: string;
      password: string;
    };
    const resultItem = result.Item as TypeUserResponse;

    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    /* eslint-disable @typescript-eslint/no-unsafe-assignment  */
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    const comparedPassword = await bcrypt.compare(
      password,
      resultItem.password
    );
    /* eslint-enable */

    if (!comparedPassword)
      throw new HttpException(400, "パスワードが間違っています");
    const user = {
      name: resultItem.user,
      role: resultItem.role,
    };
    const accessToken = generateAccessToken(user);
    const refreshTokenSecret: jwt.Secret =
      process.env.REFRESH_TOKEN_SECRET ?? "defaultrefreshsecret";
    const refreshToken = jwt.sign(user, refreshTokenSecret, {
      expiresIn: "90d",
    });
    res.cookie("refreshToken", refreshToken);
    res.json({ accessToken: accessToken, refreshToken: refreshToken });
  } catch (err) {
    next(err);
  }
};

type TypeTokenRequestBody = {
  refreshToken: string;
};

type TypeTokenResponse = {
  attendance: string;
};

export const token = async (
  req: express.Request<unknown, unknown, TypeTokenRequestBody>,
  res: express.Response,
  next: express.NextFunction
) => {
  const refreshToken = req.body.refreshToken;
  if (refreshToken == null)
    return next(new HttpException(403, "RefreshToken is null"));
  const params = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user" },
    ExpressionAttributeValues: { ":val": "refreshTokenBlackList" },
    KeyConditionExpression: "#u = :val",
  };
  const result = await documentClient.query(params).promise();
  const resultItems = result.Items as TypeTokenResponse[] | undefined;
  if (!resultItems) {
    throw new HttpException(500, "Result is empty");
  }
  const blackList = resultItems.map((item) => item.attendance);
  if (blackList.includes(refreshToken))
    return next(new HttpException(403, "Invalid refreshToken"));
  const refreshTokenSecret: jwt.Secret =
    process.env.REFRESH_TOKEN_SECRET ?? "defaultrefreshsecret";
  jwt.verify(refreshToken, refreshTokenSecret, (err, payload) => {
    if (err) return next(err);
    if (!payload?.name || !payload?.role) {
      next(new HttpException(500, "User is not found"));
    }
    const user = payload as TypeUserToken;
    const accessToken = generateAccessToken({
      name: user.name,
      role: user.role,
    });
    return res.json({ accessToken: accessToken });
  });
};

type TypeLogoutRequestBody = {
  refreshToken: string;
};

export const logout = (
  req: express.Request<unknown, unknown, TypeLogoutRequestBody>,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    user: "refreshTokenBlackList",
    attendance: req.body.refreshToken,
    expirationTime: dayjs.utc().add(1, "week").unix(),
  };
  return documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then(() => res.json({ message: "Logout success" }))
    .catch((err) => next(err));
};

export const currentuser = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const accessTokenSecret: jwt.Secret =
    process.env.ACCESS_TOKEN_SECRET ?? "defaultaccesssecret";
  const authHeader = req.headers["authorization"];
  const accessToken = authHeader && authHeader.split(" ")[1];
  if (!accessToken) return next(new HttpException(403, "AccessToken is null"));
  jwt.verify(accessToken, accessTokenSecret, (err, user) => {
    if (err) return next(err);
    return res.json(user);
  });
};

const generateAccessToken = (user: TypeUserToken) => {
  const accessTokenSecret: jwt.Secret =
    process.env.ACCESS_TOKEN_SECRET ?? "defaultaccesssecret";
  return jwt.sign(user, accessTokenSecret, { expiresIn: "1m" });
};
