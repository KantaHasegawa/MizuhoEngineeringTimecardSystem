import express from 'express';
const bcrypt = require("bcrypt")
import documentClient from "../dbconnect";
import geocoder from "../gecorderSetting";
// import csrf from 'csurf';
// const csrfProtection = csrf({ cookie: false });

export const showUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: "Timecards",
    Key: {
      user: req.params.name,
      attendance: "user"
    }
  };
  documentClient.get(params).promise()
    // .then((result) => res.json({ "user": result.Item, "csrfToken": req.csrfToken() }))
    .then((result) => res.json({ "user": result.Item }))
    .catch((err) => next(err))
}

export const indexUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: 'Timecards',
    IndexName: 'usersIndex',
    ExpressionAttributeNames: { '#a': 'attendance' },
    ExpressionAttributeValues: { ':val': 'user' },
    KeyConditionExpression: '#a = :val'
  };
  documentClient.query(params).promise()
    // .then((result) => {res.json({ "users": result.Items, "csrfToken": req.csrfToken() })})
    .then((result) => res.json({ "users": result.Items }))
    .catch((err) => next(err))
};

export const signupUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    .then((result) => res.json({ message: "insert seccess" }))
    .catch((err) => next(err))
}

export const deleteUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: 'Timecards',
    Key: {
      user: req.params.name,
      attendance: "user"
    }
  };
  documentClient.delete(params).promise()
    // .then((result) => res.json({ message: "delete success", "csrfToken": req.csrfToken() }))
    .then((result) => res.json({ message: "delete success" }))
    .catch((err) => next(err));
}

export const updateUserRelation = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = req.body.user
  const workspots = req.body.workspots
  try {
    for (let workspot of workspots) {
      if (workspot.delete === "true") {
        let params = {
          TableName: 'Timecards',
          Key: {
            user: user,
            attendance: `relation ${workspot.name}`
          }
        };
        await documentClient.delete(params).promise();
      } else {
        const result = await geocoder.geocode(workspot.name)
        let params = {
          user: user,
          attendance: `relation ${workspot.name}`,
          workspot: workspot.name,
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
    // return res.json({ "message": "insert success", "csrfToken": req.csrfToken() })
    return res.json({ "message": "insert success" })
  } catch (err) {
    next(err)
  }
}

export const indexUserRelation = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const username = req.params.username;
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':uval': username, ':aval': "relation" },
    KeyConditionExpression: '#u = :uval AND begins_with(#a, :aval)'
  }
  documentClient.query(params).promise()
    .then((result) => res.json({ "relations": result.Items }))
    .catch((err) => next(err))
}
