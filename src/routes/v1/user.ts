const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt")
const helper = require("../../helper")
const documentClient = require("../../dbconnect")
const geocoder = require("../../gecorderSetting")
const { check, validationResult } = require('express-validator');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });

router.get("/show/:name", helper.authenticateToken, helper.adminUserCheck, csrfProtection, (req, res) => {
    const params = {
      TableName: "Timecards",
      Key: {
        user: req.params.name,
        attendance: "user"
      }
    };
    documentClient.get(params).promise()
      .then((result) => res.json({ "user": result.Item, "csrfToken": req.csrfToken() }))
      .catch((e) => res.status(500).json({ errors : e}))
  })

router.get("/index", helper.authenticateToken, helper.adminUserCheck, csrfProtection, (req, res) => {
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
      res.json({ "users": result.Items,"csrfToken":req.csrfToken() })
      }
    })
});

router.post("/signup", helper.authenticateToken, helper.adminUserCheck, csrfProtection, [
  check("username").not().isEmpty().matches("^[ぁ-んァ-ヶｱ-ﾝﾞﾟ一-龠]*$").custom(value => {
    const params = {
      TableName: "Timecards",
      Key: {
        user: value,
        attendance: "user"
      }
    };
    return documentClient.get(params).promise().then((result) => {
      if (!!Object.keys(result).length) {
        throw new Error('このユーザー名は既に使用されています');
      }
      return true
    })
  }),
  check("password").not().isEmpty().isAlphanumeric().isLength({ min: 4, max: 15 })
],
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

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
    .then((result) => res.json({ message: "insert seccess", "csrfToken": req.csrfToken() }))
    .catch((e) => res.status(500).json({ errors: e }));
});

router.delete("/delete/:name", helper.authenticateToken, helper.adminUserCheck, csrfProtection, (req, res) => {
  const params = {
    TableName: 'Timecards',
    Key: {
      user: req.params.name,
      attendance: "user"
    }
  };
  documentClient.delete(params).promise()
    .then((result) => res.json({ message: "delete success","csrfToken": req.csrfToken() }))
    .catch((e) => res.status(500).json({ errors: e }));
})

router.post("/relation/update", helper.authenticateToken, helper.adminUserCheck, csrfProtection, async (req, res) => {
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
  } catch (e) {
    return res.status(500).json(e.message)
  }
  res.json({ "message": "insert success", "csrfToken": req.csrfToken() })
})

router.get("/relation/index/:username", csrfProtection, (req, res) => {
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
      res.json({ "relations": result.Items, "csrfToken": req.csrfToken() })
    }
  })
})

module.exports = router;
