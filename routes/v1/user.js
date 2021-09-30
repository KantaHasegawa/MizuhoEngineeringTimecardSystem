const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt")
const helper = require("../../helper")
const documentClient = require("../../dbconnect")

router.get("/show/:name", helper.authenticateToken, helper.adminUserCheck, (req, res) => {
    const params = {
      TableName: "Timecards",
      Key: {
        user: req.params.name,
        attendance: "user"
      }
    };
    documentClient.get(params).promise()
      .then((result) => res.json(result.Item))
      .catch((e) => res.status(500).json({ errors : e}))
  })

router.get("/index", helper.authenticateToken, helper.adminUserCheck, (req, res) => {
    const params = {
      TableName: 'Timecards',
      IndexName: 'usersIndex',
      ExpressionAttributeNames: { '#a': 'attendance' },
      ExpressionAttributeValues: { ':val': 'user' },
      KeyConditionExpression: '#a = :val'
    };
  documentClient.query(params, (err, result) => {
    if (err) {
      res.status(500).json({errors: err})
    } else {
      res.json(result.Items)
      }
    })
});

router.post("/signup", helper.authenticateToken, helper.adminUserCheck, async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const hashedPassword = await bcrypt.hash(password, 10);

  const params = {
    user: username,
    password: hashedPassword,
    attendance: "user",
    role: "common",
  };

  documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then((result) => res.json({ message: "insert seccess" }))
    .catch((e) => res.status(500).json({ errors: e }));
});

router.delete("/delete/:name", helper.authenticateToken, helper.adminUserCheck, (req, res) => {
  const params = {
    TableName: 'Timecards',
    Key: {
      user: req.params.name,
      attendance: "user"
    }
  };
  documentClient.delete(params).promise()
    .then((result) => res.json({ message: "delete success" }))
    .catch((e) => res.status(500).json({ errors: e }));
})

router.post("/relation/new", async (req, res) => {
  const user = req.body.user
  const workspots = req.body.workspots
  try {
    for (let workspot of workspots) {
      let params = {
        user: user,
        attendance: `relation ${workspot}`,
        workspot: workspot
      }
      await documentClient
        .put({
          TableName: "Timecards",
          Item: params,
        }).promise()
    }
  } catch (e) {
    return res.status(500).json(e.message)
  }
  res.json({ "message": "insert success" })
})

router.get("/relation/index/:username", (req, res) => {
  const username = req.params.username;
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u':'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':uval':username ,':aval': "relation" },
    KeyConditionExpression: '#u = :uval AND begins_with(#a, :aval)'
  }
  documentClient.query(params, (err, result) => {
    if (err) {
      res.status(500).json({ errors: err })
    } else {
      res.json(result.Items)
    }
  })
})

module.exports = router;
