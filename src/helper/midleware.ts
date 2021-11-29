import express from "express";
import jwt from "jsonwebtoken";
import { GeoPosition } from "geo-position.ts";
import documentClient from "./dbconnect";
import HttpException from "../exceptions/HttpException";
import { TypeUserToken } from "../controllers/authController";
import { Cookies } from "../controllers/authController";

export const errorMiddleware = (
  err: HttpException,
  req: express.Request,
  res: express.Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: express.NextFunction
) => {
  const status = err.status || 500;
  const message = err.message || "Something went wrong";
  console.log(err);
  res.status(status).send({
    status,
    message,
  });
};

export const authenticateToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const cookies = req.cookies as Cookies;
  const token = cookies.accessToken;
  if (token == null)
    return next(new HttpException(402, "Authentication token is null"));
  const accessTokenSecret: jwt.Secret =
    process.env.ACCESS_TOKEN_SECRET ?? "defaultaccesssecret";
  jwt.verify(token, accessTokenSecret, { complete: false }, (err, payload) => {
    if (err) return next(err);
    const user = payload as TypeUserToken;
    req.user = user;
  });
  next();
};

export const adminUserCheck = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (req.user.role !== "admin")
    next(new HttpException(402, "Permission error"));
  next();
};

export const adminUserOrAuthenticatedUserCheck = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (req.user.role !== "admin" && req.params.username !== req.user.name)
    next(new HttpException(402, "Permission error"));
  next();
};

type TypeCheckUserLocation = {
  lat: number;
  lon: number;
};

type TypeWorkspot = {
  workspot: string;
  latitude: number;
  longitude: number;
};

export const checkUserLocation = async (
  req: express.Request<unknown, unknown, TypeCheckUserLocation>,
  res: express.Response,
  next: express.NextFunction
) => {
  const username: string = req.user.name;
  const params = {
    TableName: process.env.TABLE_NAME || "Timecards",
    ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
    ExpressionAttributeValues: { ":uval": username, ":aval": "relation" },
    KeyConditionExpression: "#u = :uval AND begins_with(#a, :aval)",
  };
  try {
    const result = await documentClient.query(params).promise();
    const workspots = result.Items as TypeWorkspot[] | undefined;
    if (!workspots?.length) {
      throw new HttpException(500, "登録された勤務地が存在しません");
    }
    const userLocation: GeoPosition = new GeoPosition(
      req.body.lat,
      req.body.lon
    );
    const distanceArray: number[] = [];
    const distanceNameArray: string[] = [];
    for (const workspot of workspots) {
      const workspotLocation: GeoPosition = new GeoPosition(
        workspot.latitude,
        workspot.longitude
      );
      const result: number = +userLocation
        .Distance(workspotLocation)
        .toFixed(0);
      distanceArray.push(result);
      distanceNameArray.push(workspot.workspot);
    }
    const minDistance = Math.min.apply(null, distanceArray);
    if (minDistance >= 1000) {
      throw new HttpException(
        400,
        "指定された勤務地の半径1km以内に移動してください"
      );
    } else {
      const distanceIndex: number = distanceArray.indexOf(minDistance);
      const userLocation: string = distanceNameArray[distanceIndex];
      req.userLocation = userLocation;
    }
    next();
  } catch (err) {
    next(err);
  }
};
