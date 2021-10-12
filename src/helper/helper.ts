import express from "express"
import jwt from "jsonwebtoken";
import { GeoPosition } from 'geo-position.ts';
import documentClient from '../dbconnect'

export const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.send(401);
  const accessTokenSecret: jwt.Secret = process.env.ACCESS_TOKEN_SECRET ?? "defaultaccesssecret"
  jwt.verify(token, accessTokenSecret, (err: any, user: any) => {
    if (err) return res.send(403);
    req.user = user;
    next();
  });
}

export const adminUserCheck = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if(req.user.role !== "admin"){return res.send(403)}
  next();
}

export const checkUserLocation = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const username: string = req.user.name;
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':uval': username, ':aval': "relation" },
    KeyConditionExpression: '#u = :uval AND begins_with(#a, :aval)'
  }
  try {
    const result = await documentClient.query(params).promise();
    const workspots: any = result.Items;
    const userLocation: GeoPosition = new GeoPosition(req.body.lat, req.body.lon)
    const distanceArray: number[] = []
    const distanceNameArray: string[] = []
    for (let workspot of workspots) {
      let workspotLocation: GeoPosition = new GeoPosition(workspot.latitude, workspot.longitude);
      let result: number = +userLocation.Distance(workspotLocation).toFixed(0);
      distanceArray.push(result);
      distanceNameArray.push(workspot.workspot)
    }
    const minDistance = Math.min.apply(null, distanceArray)
    if (minDistance >= 1000) {
      throw new Error("指定された勤務地の半径1km以内に移動してください");
    } else {
      const distanceIndex: number = distanceArray.indexOf(minDistance);
      const userLocation: string = distanceNameArray[distanceIndex];
      req.userLocation = userLocation
      next();
    }
  } catch (e: any) {
    res.status(501).json(e.message)
  }
}
