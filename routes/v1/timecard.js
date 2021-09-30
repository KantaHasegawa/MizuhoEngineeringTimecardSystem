const express = require('express');
const router = express.Router();
const NodeGeocoder = require('node-geocoder');
const helper = require("../../helper")
const documentClient = require("../../dbconnect")
const dayjs = require("dayjs")
require("dayjs/locale/ja")
dayjs.locale("ja")

const options = {
  provider: 'google',
  language: 'ja',
  apiKey: process.env.GOOGLE_API_KEY,
  formatter: null
};
const geocoder = NodeGeocoder(options);

router.get("/check/:username", async (req, res) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.params.username, ':attendanceval': "2" },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result) => { res.json(result.Items[result.Items.length - 1]) })
    .catch((e) => res.status(500).json({ errors: e }));
})

router.post("/common", helper.authenticateToken, (req, res) => {
  let params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.user.name, ':attendanceval': "2" },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result) => {
      const latestRecord = result.Items[result.Items.length - 1]
      if (latestRecord.leave !== "none") {
        let params = {
          user: req.user.name,
          attendance: dayjs().format('YYYYMMDDHHmmss'),
          workspot: "debug spot",
          leave: "none"
        };
        documentClient
          .put({
            TableName: "Timecards",
            Item: params,
          })
          .promise()
          .then((result) => res.json({ "message": "insert success" }))
          .catch((e) => res.status(500).json({ errors: e }));
      } else {
        let params = {
          TableName: "Timecards",
          Key:{
            user: req.user.name,
            attendance: latestRecord.attendance
          },
          ExpressionAttributeNames: { '#l': 'leave' },
          ExpressionAttributeValues: { ':val': dayjs().format('YYYYMMDDHHmmss') },
          UpdateExpression: 'SET #l = :val'
        }
        documentClient.update(params).promise()
          .then((result) => res.json({ "message": "update success" }))
          .catch((e) => res.status(500).json({ errors: e }));
      }
    })
})

router.post("/admin/new", helper.authenticateToken, helper.adminUserCheck, (req, res) => {
  const params = {
    user: req.body.user,
    attendance: req.body.attendance,
    workspot: "debug spot",
    leave: req.body.leave || "none"
  };
  documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then((result) => res.json({ "message": "insert success" }))
    .catch((e) => res.status(500).json({ errors: e }));
})

router.delete("/admin/delete", helper.authenticateToken, helper.adminUserCheck,(req, res) => {
  const params = {
    TableName: 'Timecards',
    Key: {
      user: req.body.user,
      attendance: req.body.attendance
    }
  };
  documentClient.delete(params).promise()
    .then((result) => res.json({ message: "delete success" }))
    .catch((e) => res.status(500).json({ errors: e }));
})

module.exports = router;
