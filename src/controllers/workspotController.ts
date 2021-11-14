import express from "express";
import geocoder from "../helper/gecorderSetting";
import documentClient from "../helper/dbconnect";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import HttpException from "../exceptions/HttpException";
dayjs.locale("ja");

export const showWorkspot = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user", "#w": "workspot" },
    ExpressionAttributeValues: {
      ":userval": "workspot",
      ":workspotval": req.params.name,
    },
    KeyConditionExpression: "#u = :userval",
    FilterExpression: "#w = :workspotval",
  };
  documentClient
    .query(params)
    .promise()
    .then((result) => {
      if (!result.Items?.length)
        return next(new HttpException(404, "Workspot does not exist"));
      res.json({ workspot: result.Items[0] });
    })
    .catch((err) => next(err));
};

export const indexWorkspot = (
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
  documentClient
    .query(params)
    .promise()
    .then((result) => res.json({ params: result.Items }))
    .catch((err) => next(err));
};

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
    type TypeWorksopt = {
      workspot: string;
    };
    const resultItems = result.Items as TypeWorksopt[] | undefined;
    const response = resultItems?.map((item) => {
      return { params: { id: item.workspot } };
    });
    res.json(response);
  } catch (err) {
    next(err);
  }
};

type TypeNewWorkspotRequestBody = {
  lat: number;
  lng: number;
};

export const newWorkspot = async (
  req: express.Request<unknown, unknown, TypeNewWorkspotRequestBody>,
  res: express.Response,
  next: express.NextFunction
) => {
  const lat = req.body.lat;
  const lon = req.body.lng;
  try {
    const result = await geocoder.reverse({ lat: lat, lon: lon });
    if (!result[0].formattedAddress)
      return next(new HttpException(400, "Location information is invalid"));
    const formattedAddressName = result[0].formattedAddress.startsWith("日本、")
      ? result[0].formattedAddress.split("、")[1]
      : result[0].formattedAddress;
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
    return res.json({
      message: "Insert Success",
      workspotName: formattedAddressName,
    });
  } catch (err) {
    return next(err);
  }
};

type TypeDeleteWorkspot = {
  attendance: string;
  workspot: string;
};

export const deleteWorkspot = async (
  req: express.Request<unknown, unknown, TypeDeleteWorkspot>,
  res: express.Response,
  next: express.NextFunction
) => {
  const attendance = req.body.attendance;
  const workspot = req.body.workspot;
  const workspotParams = {
    DeleteRequest: {
      Key: {
        user: "workspot",
        attendance: attendance,
      },
    },
  };
  const relationParams = {
    TableName: "Timecards",
    IndexName: "usersIndex",
    ExpressionAttributeNames: { "#a": "attendance" },
    ExpressionAttributeValues: { ":val": `relation ${workspot}` },
    KeyConditionExpression: "#a = :val",
  };

  try {
    const relationResult = await documentClient.query(relationParams).promise();
    type TypeRelation = {
      user: string;
    };
    const relationResultItems = relationResult.Items as
      | TypeRelation[]
      | undefined;
    if (relationResultItems) {
      const requestArray = relationResultItems.map((item) => {
        return {
          DeleteRequest: {
            Key: {
              user: item.user,
              attendance: `relation ${workspot}`,
            },
          },
        };
      });
      requestArray.push(workspotParams);
      const requestParams = {
        RequestItems: {
          Timecards: requestArray,
        },
      };
      await documentClient.batchWrite(requestParams).promise();
      res.json({ message: "delete success" });
    }
  } catch (err) {
    next(err);
  }
};
