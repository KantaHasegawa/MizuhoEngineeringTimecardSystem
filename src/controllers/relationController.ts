import express from "express";
import documentClient from "../dbconnect";
import geocoder from "../gecorderSetting";

export const indexUserRelation = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const username = req.params.username;
  const params = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
    ExpressionAttributeValues: { ":uval": username, ":aval": "relation" },
    KeyConditionExpression: "#u = :uval AND begins_with(#a, :aval)",
  };
  documentClient
    .query(params)
    .promise()
    .then((result) => res.json({ params: result.Items }))
    .catch((err) => next(err));
};

export const UserRelationSelectBoxItems = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const username = req.params.username;
  const relationsParams = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
    ExpressionAttributeValues: { ":uval": username, ":aval": "relation" },
    KeyConditionExpression: "#u = :uval AND begins_with(#a, :aval)",
  };
  const workspotsParams = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user" },
    ExpressionAttributeValues: { ":val": "workspot" },
    KeyConditionExpression: "#u = :val",
  };
  const relationsResult = await documentClient.query(relationsParams).promise();
  const workspotsResult = await documentClient.query(workspotsParams).promise();

  const selectBoxItems = workspotsResult.Items?.map((item) => {
    if (
      !relationsResult.Items?.find(({ workspot }) => workspot === item.workspot)
    ) {
      return {
        value: item.workspot,
        label: item.workspot,
      };
    }
  }).filter((item) => item);

  res.json({
    selectBoxItems: selectBoxItems,
    relations: relationsResult.Items,
  });
};

export const indexWorkspotRelation = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const workspot = req.params.workspot;
  const params = {
    TableName: "Timecards",
    IndexName: "usersIndex",
    ExpressionAttributeNames: { "#a": "attendance" },
    ExpressionAttributeValues: { ":val": `relation ${workspot}` },
    KeyConditionExpression: "#a = :val",
  };
  documentClient
    .query(params)
    .promise()
    .then((result) => res.json({ relations: result.Items }))
    .catch((err) => next(err));
};

export const newRelation = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const user = req.body.user;
  const workspot = req.body.workspot;
  try {
    const result = await geocoder.geocode(workspot);
    let params = {
      user: user,
      attendance: `relation ${workspot}`,
      workspot: workspot,
      latitude: result[0].latitude,
      longitude: result[0].longitude,
    };
    await documentClient
      .put({
        TableName: "Timecards",
        Item: params,
      })
      .promise();
    return res.json({ message: "insert success" });
  } catch (err) {
    next(err);
  }
};

export const deleteRelation = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const user = req.body.user;
  const workspot = req.body.workspot;
  const params = {
    TableName: "Timecards",
    Key: {
      user: user,
      attendance: `relation ${workspot}`,
    },
  };
  documentClient
    .delete(params)
    .promise()
    .then((result) => res.json({ message: "delete success" }))
    .catch((err) => next(err));
};
