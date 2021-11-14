import express from "express";
import documentClient from "../helper/dbconnect";
import geocoder from "../helper/gecorderSetting";

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
  try {
    const relationsResult = await documentClient
      .query(relationsParams)
      .promise();
    const workspotsResult = await documentClient
      .query(workspotsParams)
      .promise();
    type TypeWorkspot = {
      workspot: string;
    };
    const workspotsResultItems = workspotsResult.Items as
      | TypeWorkspot[]
      | undefined;

    const selectBoxItems = workspotsResultItems
      ?.map((item) => {
        if (
          !relationsResult.Items?.find(
            ({ workspot }) => workspot === item.workspot
          )
        ) {
          return {
            value: item.workspot,
            label: item.workspot,
          };
        }
      })
      .filter((item) => item);
    res.json({
      selectBoxItems: selectBoxItems,
      relations: relationsResult.Items,
    });
  } catch (err) {
    next(err);
  }
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
    .then((result) => res.json({ params: result.Items }))
    .catch((err) => next(err));
};

export const workspotRelationSelectBoxItems = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const workspot = req.params.workspot;
  const relationsParams = {
    TableName: "Timecards",
    IndexName: "usersIndex",
    ExpressionAttributeNames: { "#a": "attendance" },
    ExpressionAttributeValues: { ":val": `relation ${workspot}` },
    KeyConditionExpression: "#a = :val",
  };
  const usersParams = {
    TableName: "Timecards",
    IndexName: "usersIndex",
    ExpressionAttributeNames: { "#a": "attendance", "#r": "role" },
    ExpressionAttributeValues: { ":aval": "user", ":rval": "common" },
    KeyConditionExpression: "#a = :aval",
    FilterExpression: "#r = :rval",
  };
  try {
    const relationsResult = await documentClient
      .query(relationsParams)
      .promise();
    const usersResult = await documentClient.query(usersParams).promise();
    type TypeUser = {
      user: string;
    };
    const usersResultItems = usersResult.Items as TypeUser[] | undefined;
    const selectBoxItems = usersResultItems
      ?.map((item) => {
        if (!relationsResult.Items?.find(({ user }) => user === item.user)) {
          return {
            value: item.user,
            label: item.user,
          };
        }
      })
      .filter((item) => item);
    res.json({
      selectBoxItems: selectBoxItems,
      relations: relationsResult.Items,
    });
  } catch (err) {
    next(err);
  }
};

type TypeNewRelationRequestBody = {
  user: string;
  workspot: string;
};

export const newRelation = async (
  req: express.Request<unknown, unknown, TypeNewRelationRequestBody>,
  res: express.Response,
  next: express.NextFunction
) => {
  const user = req.body.user;
  const workspot = req.body.workspot;
  try {
    const result = await geocoder.geocode(workspot);
    const params = {
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

type TypeDeleteRelationRequestBody = {
  user: string;
  workspot: string;
};

export const deleteRelation = (
  req: express.Request<unknown, unknown, TypeDeleteRelationRequestBody>,
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
    .then(() => res.json({ message: "delete success" }))
    .catch((err) => next(err));
};
