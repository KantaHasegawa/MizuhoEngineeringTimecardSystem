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
    .then((result) => res.json({ params: result.Items }))
    .catch((err) => next(err))
}

export const workspotAllIDs = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user" },
    ExpressionAttributeValues: { ":val": "workspot" },
    KeyConditionExpression: "#u = :val",
  };
  try {
    const result = await documentClient.query(params).promise();
    const response = result.Items?.map((item) => {
      return { params: { id: item.workspot } };
    });
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const indexWorkspotNameOnly = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user' },
    ExpressionAttributeValues: { ':val': 'workspot' },
    KeyConditionExpression: '#u = :val'
  };
  try {
    const result = await documentClient.query(params).promise();
    const workspots = result.Items?.map((item) => {
      return item.workspot
    })
    res.json({ params: workspots })
  } catch (err) {
    next(err)
  }
}

export const newWorkspot = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const lat = req.body.lat;
  const lon = req.body.lng;
  try {
    const result = await geocoder.reverse({ lat: lat, lon: lon });
    if (!result[0].formattedAddress)
      return next(new HttpException(400, "Location information is invalid"));
    const formattedAddressName = result[0].formattedAddress.split("、")[1];
    const latitude = result[0].latitude;
    const longitude = result[0].longitude;
    const params = {
      user: "workspot",
      attendance: `workspot ${formattedAddressName}`,
      workspot: formattedAddressName,
      latitude: latitude,
      longitude: longitude,
    };
    await documentClient
      .put({ TableName: "Timecards", Item: params })
      .promise();
    return res.json({ message: "Insert Success" });
  } catch (err) {
    return next(err)
  }
}

export const deleteWorkspot = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const attendance = req.body.attendance
  const workspot = req.body.workspot
  const workspotParams = {
    DeleteRequest: {
      Key: {
        user: "workspot",
        attendance: attendance
      }
    }
  }
  const relationParams = {
    TableName: 'Timecards',
    IndexName: 'usersIndex',
    ExpressionAttributeNames: { '#a': 'attendance' },
    ExpressionAttributeValues: { ':val': `relation ${workspot}` },
    KeyConditionExpression: '#a = :val'
  };

  try {
    const relationResult = await documentClient.query(relationParams).promise()
    const requestArray = relationResult.Items!.map((item) => {
      return (
        {
          DeleteRequest: {
            Key: {
              user: item.user,
              attendance: `relation ${workspot}`
            }
          }
        }
      )
    })
    requestArray.push(workspotParams)
    const requestParams = {
      RequestItems: {
        Timecards: requestArray
      }
    };
    await documentClient.batchWrite(requestParams).promise()
    res.json({ message: "delete success" })
  } catch (err) {
    next(err)
  }
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
