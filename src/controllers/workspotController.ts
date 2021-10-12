import express from 'express';
import geocoder from "../gecorderSetting";
import documentClient from "../dbconnect";
import dayjs from 'dayjs';
import "dayjs/locale/ja"
dayjs.locale("ja")

export const showWorkspot = (req: express.Request, res: express.Response) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#w': 'workspot' },
    ExpressionAttributeValues: { ':userval': 'workspot', ':workspotval': req.params.name },
    KeyConditionExpression: '#u = :userval',
    FilterExpression: '#w = :workspotval'
  };
  documentClient.query(params, (err, result) => {
    if (err) {
      res.status(500).json({ errors: err })
    } else {
      res.json(result.Items)
    }
  })
}

export const indexWorkspot = (req: express.Request, res: express.Response) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user' },
    ExpressionAttributeValues: { ':val': 'workspot' },
    KeyConditionExpression: '#u = :val'
  };
  documentClient.query(params, (err, result) => {
    if (err) {
      res.status(500).json({ errors: err })
    } else {
      res.json(result.Items)
    }
  })
}

export const newWorkspot = async (req: express.Request, res: express.Response) => {
  const lat = req.body.lat;
  const lon = req.body.lon;
  try {
    const result: any = await geocoder.reverse({ lat: lat, lon: lon });
    const params = {
      user: "workspot",
      attendance: dayjs().format('YYYYMMDDHHmmss'),
      workspot: result[0].formattedAddress.split("、")[1],
      latitude: result[0].latitude,
      longitude: result[0].longitude
    };
    documentClient
      .put({
        TableName: "Timecards",
        Item: params,
      })
      .promise()
      .then((result) => res.json({ message: "insert seccess" }))
      .catch((e) => res.status(500).json({ errors: e }));
  } catch (error) {
    return res.json(501)
  }
}

export const deleteWorkspot = (req: express.Request, res: express.Response) => {
  const params = {
    TableName: 'Timecards',
    Key: {
      user: "workspot",
      attendance: req.params.attendance
    }
  };
  documentClient.delete(params).promise()
    .then((result) => res.json({ message: "delete success" }))
    .catch((e) => res.status(500).json({ errors: e }));
}

export const updateWorkspotRelation = async (req: express.Request, res: express.Response) => {
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
  } catch (e) {
    return res.status(500).json(e)
  }
  res.json({ "message": "update success" })
}

export const indexWorkspotRelation = (req: express.Request, res: express.Response) => {
  const workspot = req.params.workspot;
  const params = {
    TableName: 'Timecards',
    IndexName: 'usersIndex',
    ExpressionAttributeNames: { '#a': 'attendance' },
    ExpressionAttributeValues: { ':val': `relation ${workspot}` },
    KeyConditionExpression: '#a = :val'
  };
  documentClient.query(params, (err, result) => {
    if (err) {
      res.status(500).json({ errors: err })
    } else {
      res.json(result.Items)
    }
  })
}
