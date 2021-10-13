import express from 'express';
import geocoder from "../gecorderSetting";
import documentClient from "../dbconnect";
import dayjs from 'dayjs';
import "dayjs/locale/ja"
import HttpException from '../exceptions/HttpException';
dayjs.locale("ja")

export const showWorkspot = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#w': 'workspot' },
    ExpressionAttributeValues: { ':userval': 'workspot', ':workspotval': req.params.name },
    KeyConditionExpression: '#u = :userval',
    FilterExpression: '#w = :workspotval'
  };
  documentClient.query(params).promise()
    .then((result) => {
      if (!result.Items?.length) return next(new HttpException(404, "Workspot does not exist"))
      res.json({ workspot: result.Items[0] })
    })
    .catch((err) => next(err))
}

export const indexWorkspot = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user' },
    ExpressionAttributeValues: { ':val': 'workspot' },
    KeyConditionExpression: '#u = :val'
  };
  documentClient.query(params).promise()
    .then((result) => res.json({ workspots: result.Items }))
    .catch((err) => next(err))
}

export const newWorkspot = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const lat = req.body.lat;
  const lon = req.body.lon;
  try {
    const result = await geocoder.reverse({ lat: lat, lon: lon });
    if (!result[0].formattedAddress) return next(new HttpException(400, "Location information is invalid"))
    const params = {
      user: "workspot",
      attendance: dayjs().format('YYYYMMDDHHmmss'),
      workspot: result[0].formattedAddress.split("、")[1],
      latitude: result[0].latitude,
      longitude: result[0].longitude
    };
    await documentClient.put({ TableName: "Timecards", Item: params, }).promise();
    return res.json({message: "Insert Success"})
  } catch (err) {
    return next(err)
  }
}

export const deleteWorkspot = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: 'Timecards',
    Key: {
      user: "workspot",
      attendance: req.params.attendance
    }
  };
  documentClient.delete(params).promise()
    .then((result) => res.json({ message: "delete success" }))
    .catch((err) => next(err));
}

export const updateWorkspotRelation = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const users = req.body.users
  const workspot = req.body.workspot
  try {
    const result = await geocoder.geocode(workspot)
    for (let user of users) {
      if (user.delete === "true") {
        let params = {
          TableName: 'Timecards',
          Key: {
            user: user.name,
            attendance: `relation ${workspot}`
          }
        };
        await documentClient.delete(params).promise();
      } else {
        let params = {
          user: user.name,
          attendance: `relation ${workspot}`,
          workspot: workspot,
          latitude: result[0].latitude,
          longitude: result[0].longitude
        }
        await documentClient
          .put({
            TableName: "Timecards",
            Item: params,
          }).promise()
      }
    }
    return res.json({ "message": "update success" })
  } catch (err) {
    return next(err)
  }
}

export const indexWorkspotRelation = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const workspot = req.params.workspot;
  const params = {
    TableName: 'Timecards',
    IndexName: 'usersIndex',
    ExpressionAttributeNames: { '#a': 'attendance' },
    ExpressionAttributeValues: { ':val': `relation ${workspot}` },
    KeyConditionExpression: '#a = :val'
  };
  documentClient.query(params).promise()
    .then((result) => res.json({ relations: result.Items }))
    .catch((err) => next(err))
}
