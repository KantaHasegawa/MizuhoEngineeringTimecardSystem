const express = require('express');
const router = express.Router();
const geocoder = require("../../gecorderSetting")
const helper = require("../../helper")
const documentClient = require("../../dbconnect");
const dayjs = require('dayjs');
require("dayjs/locale/ja")
dayjs.locale("ja")

router.get("/show/:name", helper.authenticateToken, helper.adminUserCheck, (req, res) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#w': 'workspot' },
    ExpressionAttributeValues: { ':userval': 'workspot', ':workspotval': req.params.name },
    KeyConditionExpression: '#u = :userval',
    FilterExpression: '#w = :workspotval'
  };
  documentClient.query(params, (err, result) => {
    if (err) {
      res.status(500).json({ errors: err })
    } else {
      res.json(result.Items)
    }
  })
})

router.get("/index", helper.authenticateToken, helper.adminUserCheck, (req, res) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user' },
    ExpressionAttributeValues: { ':val': 'workspot' },
    KeyConditionExpression: '#u = :val'
  };
  documentClient.query(params, (err, result) => {
    if (err) {
      res.status(500).json({ errors: err })
    } else {
      res.json(result.Items)
    }
  })
})

router.post("/new", helper.authenticateToken, helper.adminUserCheck, async (req, res) => {
  const lat = req.body.lat;
  const lon = req.body.lon;
  try {
    const result = await geocoder.reverse({ lat: lat, lon: lon });
    const params = {
      user: "workspot",
      attendance: dayjs().format('YYYYMMDDHHmmss'),
      workspot: result[0].formattedAddress.split("、")[1],
      latitude: result[0].latitude,
      longitude: result[0].longitude
    };
    documentClient
      .put({
        TableName: "Timecards",
        Item: params,
      })
      .promise()
      .then((result) => res.json({ message: "insert seccess" }))
      .catch((e) => res.status(500).json({ errors: e }));
  } catch (error) {
    return res.json(501)
  }
})

router.delete("/delete/:attendance", helper.authenticateToken, helper.adminUserCheck, (req, res) => {
  const params = {
    TableName: 'Timecards',
    Key: {
      user: "workspot",
      attendance: req.params.attendance
    }
  };
  documentClient.delete(params).promise()
    .then((result) => res.json({ message: "delete success" }))
    .catch((e) => res.status(500).json({ errors: e }));
})

router.post("/relation/update", async (req, res) => {
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
  } catch (e) {
    return res.status(500).json(e)
  }
  res.json({"message":"update success"})
})

router.get("/relation/index/:workspot", (req, res) => {
  const workspot = req.params.workspot;
  const params = {
    TableName: 'Timecards',
    IndexName: 'usersIndex',
    ExpressionAttributeNames: { '#a': 'attendance' },
    ExpressionAttributeValues: { ':val': `relation ${workspot}` },
    KeyConditionExpression: '#a = :val'
  };
  documentClient.query(params, (err, result) => {
    if (err) {
      res.status(500).json({ errors: err })
    } else {
      res.json(result.Items)
    }
  })
})

module.exports = router;