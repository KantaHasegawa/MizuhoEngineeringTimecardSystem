import express from "express";
import bcrypt from "bcrypt";
import documentClient from "../helper/dbconnect";

export const showUser = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    TableName: "Timecards",
    Key: {
      user: req.params.name,
      attendance: "user",
    },
  };
  documentClient
    .get(params)
    .promise()
    .then((result) => res.json({ user: result.Item }))
    .catch((err) => next(err));
};

export const indexUser = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    TableName: "Timecards",
    IndexName: "usersIndex",
    ExpressionAttributeNames: { "#a": "attendance", "#r": "role" },
    ExpressionAttributeValues: { ":aval": "user", ":rval": "common" },
    KeyConditionExpression: "#a = :aval",
    FilterExpression: "#r = :rval",
  };
  documentClient
    .query(params)
    .promise()
    .then((result) => res.json({ params: result.Items }))
    .catch((err) => next(err));
};

export const userAllIDs = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    TableName: "Timecards",
    IndexName: "usersIndex",
    ExpressionAttributeNames: { "#a": "attendance", "#r": "role" },
    ExpressionAttributeValues: { ":aval": "user", ":rval": "common" },
    KeyConditionExpression: "#a = :aval",
    FilterExpression: "#r = :rval",
  };
  try {
    const result = await documentClient.query(params).promise();
    type TypeUser = {
      user: string;
    };
    const resultItems = result.Items as TypeUser[] | undefined;
    const response = resultItems?.map((item) => {
      return { params: { id: item.user } };
    });
    res.json(response);
  } catch (err) {
    next(err);
  }
};

type TypeSignupUserRequestBody = {
  username: string;
  password: string;
};

export const signupUser = async (
  req: express.Request<unknown, unknown, TypeSignupUserRequestBody>,
  res: express.Response,
  next: express.NextFunction
) => {
  const username = req.body.username;
  const password = req.body.password;
  const hashedPassword = await bcrypt.hash(password, 10);

  const params = {
    user: username,
    password: hashedPassword,
    attendance: "user",
    role: "common",
  };

  return documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then(() => res.json({ message: "insert seccess" }))
    .catch((err) => next(err));
};

export const updateUser = async (
  req: express.Request<unknown, unknown, TypeSignupUserRequestBody>,
  res: express.Response,
  next: express.NextFunction
) => {
  const username = req.body.username;
  const password = req.body.password;
  const hashedPassword = await bcrypt.hash(password, 10);

  const params = {
    user: username,
    password: hashedPassword,
    attendance: "user",
    role: "common",
  };

  return documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then(() => res.json({ message: "udpate seccess" }))
    .catch((err) => next(err));
};

export const deleteUser = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const username = req.params.name;
  const userParams = {
    DeleteRequest: {
      Key: {
        user: username,
        attendance: "user",
      },
    },
  };
  const relationParams = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
    ExpressionAttributeValues: { ":uval": username, ":aval": "relation" },
    KeyConditionExpression: "#u = :uval AND begins_with(#a, :aval)",
  };
  try {
    const relationResult = await documentClient.query(relationParams).promise();
    type TypeRelation = {
      workspot: string;
    };
    const relationResultItems = relationResult.Items as
      | TypeRelation[]
      | undefined;
    if (relationResultItems) {
      const requestArray = relationResultItems.map((item) => {
        return {
          DeleteRequest: {
            Key: {
              user: username,
              attendance: `relation ${item.workspot}`,
            },
          },
        };
      });
      requestArray.push(userParams);
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
