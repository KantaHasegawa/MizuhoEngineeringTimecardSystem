const express = require('express');
const router = express.Router();
const helper = require("../../helper")
const { GeoPosition } = require('geo-position.ts');
const documentClient = require("../../dbconnect")
const XlsxPopulate = require("xlsx-populate");
const { check, validationResult } = require('express-validator');
const dayjs = require("dayjs")
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
require("dayjs/locale/ja")
dayjs.locale("ja")
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const calculateWorkingTime = (attendance) => {
  const regularAttendanceTime = dayjs(`${attendance.slice(0, 8)}0800`)
  const regularLeaveTime = dayjs(`${attendance.slice(0, 8)}1700`)
  const leave = dayjs().format('YYYYMMDDHHmmss')
  const dayjsObjLeave = dayjs(leave)
  const dayjsObjAttendance = dayjs(attendance)
  const workTime = dayjsObjLeave.diff(dayjsObjAttendance, 'minute')
  const rest = workTime >= 60 ? 60 : 0

  const early = dayjsObjLeave.isSameOrBefore(regularAttendanceTime)
    ? workTime
    : regularAttendanceTime.diff(dayjsObjAttendance, 'minute') > 0
      ? dregularAttendanceTime.diff(dayjsObjAttendance, 'minute')
      : 0

  const late = dayjsObjAttendance.isSameOrAfter(regularLeaveTime)
    ? workTime
    : dayjsObjLeave.diff(regularLeaveTime, 'minute') > 0
      ? dayjsObjLeave.diff(regularLeaveTime, 'minute')
      : 0

  if (workTime - rest - early - late < 0) {
    const irregularRest = 0 - (workTime - rest - early - late);
    const regularWorkTime = 0
    const irregularWorkTime = rest + early - irregularRest;
    return {
      workTime: workTime,
      leave: leave,
      rest: rest,
      regularWorkTime,
      irregularWorkTime
    };
  } else {
    const irregularWorkTime = early + late
    const regularWorkTime = workTime - irregularWorkTime - rest
    return {
      workTime: workTime,
      leave: leave,
      rest: rest,
      regularWorkTime,
      irregularWorkTime
    };
  }
}

const checkUserLocation = async (req, res, next) => {
  const username = req.user.name;
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':uval': username, ':aval': "relation" },
    KeyConditionExpression: '#u = :uval AND begins_with(#a, :aval)'
  }
  try {
    const result = await documentClient.query(params).promise();
    const workspots = result.Items;
    const userLocation = new GeoPosition(req.body.lat, req.body.lon)
    const distanceArray = []
    const distanceNameArray = []
    for (let workspot of workspots) {
      let workspotLocation = new GeoPosition(workspot.latitude, workspot.longitude);
      let result = +userLocation.Distance(workspotLocation).toFixed(0);
      distanceArray.push(result);
      distanceNameArray.push(workspot.workspot)
    }
    const minDistance = Math.min.apply(null, distanceArray)
    if (minDistance >= 1000) {
      throw new Error("指定された勤務地の半径1km以内に移動してください");
    } else {
      const distanceIndex = distanceArray.indexOf(minDistance);
      const userLocation = distanceNameArray[distanceIndex];
      req.userLocation = userLocation
      next();
    }
  } catch (e) {
    res.status(501).json(e.message)
  }
}

router.get("/index/:username/:year/:month", (req, res) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.params.username, ':attendanceval': `${req.params.year}${req.params.month}` },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result) => { res.json(result.Items) })
    .catch((e) => res.status(500).json({ errors: e }));
})

router.get("/latest/:username", async (req, res) => {
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

router.post("/common", helper.authenticateToken, checkUserLocation, (req, res) => {
  let params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.user.name, ':attendanceval': "2" },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result) => {
      const latestRecord = result.Items[result.Items.length - 1]
      if (!latestRecord || latestRecord.leave !== "none") {
        let params = {
          user: req.user.name,
          attendance: dayjs().format('YYYYMMDDHHmmss'),
          workspot: req.userLocation,
          leave: "none",
          rest: 0,
          workTime: 0,
          regularWorkTime: 0,
          irregularWorkTime: 0
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
        const results = calculateWorkingTime(latestRecord.attendance)
        let params = {
          TableName: "Timecards",
          Key:{
            user: req.user.name,
            attendance: latestRecord.attendance
          },
          ExpressionAttributeNames: { '#l': 'leave', '#r': 'rest', '#w': 'workTime', '#g': 'regularWorkTime', '#i': 'irregularWorkTime' },
          ExpressionAttributeValues: { ':lval': results.leave, ':rval': results.rest, ':wval': results.workTime, ':gval': results.regularWorkTime, ':ival': results.irregularWorkTime },
          UpdateExpression: 'SET #l = :lval, #r = :rval, #w = :wval, #g = :gval, #i = :ival'
        }
        documentClient.update(params).promise()
          .then((result) => res.json({ "message": "update success" }))
          .catch((e) => res.status(500).json({ errors: e }));
      }
    })
})

router.post("/admin/new", helper.authenticateToken, helper.adminUserCheck, [
  check("user").not().isEmpty().matches("^[ぁ-んァ-ヶｱ-ﾝﾞﾟ一-龠]*$"),
  check("attendance").not().isEmpty().isNumeric().isLength({ min: 14, max: 14 }),
  check("leave").custom((value, { req }) => {
    const dayjsObjLeave = dayjs(value)
    const dayjsObjAttendance = dayjs(req.body.attendance)
    if (value) {
      if (value.length !== 14) throw new Error('無効な日付です');
      if (dayjsObjLeave.isSameOrBefore(dayjsObjAttendance)) throw new Error("無効な退勤時間です")
      return true
    } else {
      return true
    }
  }),
  check("workspot").not().isEmpty().custom((value) => {
    const params = {
      TableName: 'Timecards',
      ExpressionAttributeNames: { '#u': 'user', '#w':'workspot' },
      ExpressionAttributeValues: { ':uval': 'workspot',':wval': value },
      KeyConditionExpression: '#u = :uval',
      FilterExpression: '#w = :wval'
    };
    return documentClient.query(params).promise().then((results) => {
      if (!Object.keys(results.Items).length) throw new Error('登録されていない勤務地です')
      return true
    })
  })
],
  (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  const params = {
    user: req.body.user,
    attendance: req.body.attendance,
    workspot: req.body.workspot,
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

router.get("/excel/:username/:year/:month", async(req, res) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.params.username, ':attendanceval': `${req.params.year}${req.params.month}` },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  try {
    const workbook = await XlsxPopulate.fromFileAsync("public/timecard_template.xlsx")
    const sheet1 = workbook.sheet("Sheet1")
    const results = await documentClient.query(params).promise()
    const timecards = results.Items
    console.log(timecards)
    sheet1.cell("B3").value(req.params.username);
    sheet1.cell("B4").value(`${req.params.year}年 ${req.params.month}月`);
    for (timecard of timecards) {
      const row = Number(timecard.attendance.slice(6, 8)) + 5
      sheet1.cell(`B${row}`).value(timecard.workTime);
      sheet1.cell(`C${row}`).value(timecard.regularWorkTime);
      sheet1.cell(`D${row}`).value(timecard.irregularWorkTime);
      sheet1.cell(`E${row}`).value(timecard.rest);
    }
    await workbook.toFileAsync(`public/tmp/${req.params.year}年${req.params.month}月${req.params.username}.xlsx`)
    res.download(`public/tmp/${req.params.year}年${req.params.month}月${req.params.username}.xlsx`)
  } catch (e) {
    res.status(501).json(e.message)
  }
})

module.exports = router;
