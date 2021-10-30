import express from 'express';
const bcrypt = require("bcrypt")
import documentClient from "../dbconnect";
import geocoder from "../gecorderSetting";

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
    ExpressionAttributeNames: { '#a': 'attendance', '#r': 'role' },
    ExpressionAttributeValues: { ':aval': 'user', ':rval': 'common' },
    KeyConditionExpression: '#a = :aval',
    FilterExpression: '#r = :rval'
  };
  documentClient.query(params).promise()
    // .then((result) => {res.json({ "users": result.Items, "csrfToken": req.csrfToken() })})
    .then((result) => res.json({ "params": result.Items }))
    .catch((err) => next(err))
};

export const userAllIDs = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: 'Timecards',
    IndexName: 'usersIndex',
    ExpressionAttributeNames: { '#a': 'attendance', '#r': 'role' },
    ExpressionAttributeValues: { ':aval': 'user', ':rval': 'common' },
    KeyConditionExpression: '#a = :aval',
    FilterExpression: '#r = :rval'
  };
  try {
    const result = await documentClient.query(params).promise()
    const response = result.Items?.map((item) => {
      return ({ params: { id: item.user } })
    })
    res.json(response)
  } catch (err) {
    next(err)
  }

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

export const updateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    .then((result) => res.json({ message: "udpate seccess" }))
    .catch((err) => next(err))
}

export const deleteUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const username = req.params.name
  const userParams = {
    DeleteRequest: {
      Key: {
        user: username,
        attendance: "user"
      }
    }
  };
  const relationParams = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':uval': username, ':aval': "relation" },
    KeyConditionExpression: '#u = :uval AND begins_with(#a, :aval)'
  }
  try {
    const relationResult = await documentClient.query(relationParams).promise()
    const requestArray = relationResult.Items!.map((item) => {
      return (
        {
          DeleteRequest: {
            Key: {
              user: username,
              attendance: `relation ${item.workspot}`
            }
          }
        }
      )
    }
    )
    requestArray.push(userParams)
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
            attendance: `relation ${workspot.workspot}`
          }
        };
        await documentClient.delete(params).promise();
      } else {
        const result = await geocoder.geocode(workspot.workspot)
        let params = {
          user: user,
          attendance: `relation ${workspot.workspot}`,
          workspot: workspot.workspot,
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
    .then((result) => res.json({ params: result.Items }))
    .catch((err) => next(err))
}

export const UserRelationSelectBoxItems = async(req: express.Request, res: express.Response, next: express.NextFunction) => {
  const username = req.params.username;
  const relationsParams = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':uval': username, ':aval': "relation" },
    KeyConditionExpression: '#u = :uval AND begins_with(#a, :aval)'
  }
    const workspotsParams = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user' },
    ExpressionAttributeValues: { ':val': 'workspot' },
    KeyConditionExpression: '#u = :val'
  };
  const relationsResult = await documentClient.query(relationsParams).promise()
  const workspotsResult = await documentClient.query(workspotsParams).promise()

  const selectBoxItems = workspotsResult.Items?.map((item) => {
    if (!relationsResult.Items?.find(({ workspot }) => workspot === item.workspot)) {
      return {
        value: item.workspot,
        label: item.workspot
      }
    }
  }).filter((item) => item)

  res.json({ selectBoxItems: selectBoxItems, relations: relationsResult.Items })

}
