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
        workspot: "user"
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
      ExpressionAttributeNames: { '#w': 'workspot' },
      ExpressionAttributeValues: { ':val': 'user' },
      KeyConditionExpression: '#w = :val'
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
    workspot: "user",
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
      workspot: "user"
    }
  };
  documentClient.delete(params).promise()
    .then((result) => res.json({ message: "delete success" }))
    .catch((e) => res.status(500).json({ errors: e }));
})

module.exports = router;
