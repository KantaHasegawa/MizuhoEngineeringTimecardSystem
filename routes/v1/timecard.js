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

router.post("/common", helper.authenticateToken, (req, res) => {
  const params = {
    user: "test",
    workspot: "debug spot",
    // attendance: dayjs().format('YYYYMMDDHHmmss'),
    attendance: "test",
    leave: "none"
  };
  documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then((result) => res.json(result))
    .catch((e) => res.status(500).json({ errors: e }));
})

module.exports = router;
