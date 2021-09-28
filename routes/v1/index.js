const express = require('express');
const router = express.Router();
const documentClient = require("../../dbconnect")

router.get("/api/v1/", (req, res) => {
  const env = process.env.NODE_ENV
  res.json({ message: `env is ${env}` });
});

router.get("/api/v1/records", (req, res) => {
  documentClient
    .scan({
      TableName: "Timecards",
    })
    .promise()
    .then((result) => res.json(result))
    .catch((e) => res.status(422).json({ errors: e }));
});

router.use('/api/v1/user', require('./user.js'));
router.use('/api/v1/auth', require('./auth.js'));
router.use('/api/v1/workspot', require('./workspot.js'));

module.exports = router;
