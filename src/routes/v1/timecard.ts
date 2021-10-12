import express from 'express';
const router = express.Router();
import {adminUserCheck, authenticateToken} from "../../helper";
import { GeoPosition } from 'geo-position.ts';
import documentClient from "../../dbconnect";
const XlsxPopulate = require("xlsx-populate");
import { check, validationResult } from 'express-validator';
import dayjs from "dayjs";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import "dayjs/locale/ja"
dayjs.locale("ja")
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

type TypeCalculateWorkingTimeReturn = {
  workTime: number,
  leave: string,
  rest: number,
  regularWorkTime: number,
  irregularWorkTime: number
}

const calculateWorkingTime = (attendance: any): TypeCalculateWorkingTimeReturn => {
  const regularAttendanceTime: dayjs.Dayjs = dayjs(`${attendance.slice(0, 8)}0800`)
  const regularLeaveTime: dayjs.Dayjs = dayjs(`${attendance.slice(0, 8)}1700`)
  const leave: string = dayjs().format('YYYYMMDDHHmmss')
  const dayjsObjLeave: dayjs.Dayjs = dayjs(leave)
  const dayjsObjAttendance: dayjs.Dayjs = dayjs(attendance)
  const workTime: number = dayjsObjLeave.diff(dayjsObjAttendance, 'minute')
  const rest: number = workTime >= 60 ? 60 : 0

  const early: number = dayjsObjLeave.isSameOrBefore(regularAttendanceTime)
    ? workTime
    : regularAttendanceTime.diff(dayjsObjAttendance, 'minute') > 0
      ? regularAttendanceTime.diff(dayjsObjAttendance, 'minute')
      : 0

  const late: number = dayjsObjAttendance.isSameOrAfter(regularLeaveTime)
    ? workTime
    : dayjsObjLeave.diff(regularLeaveTime, 'minute') > 0
      ? dayjsObjLeave.diff(regularLeaveTime, 'minute')
      : 0

  if (workTime - rest - early - late < 0) {
    const irregularRest: number = 0 - (workTime - rest - early - late);
    const regularWorkTime: number = 0
    const irregularWorkTime: number = rest + early - irregularRest;
    return {
      workTime: workTime,
      leave: leave,
      rest: rest,
      regularWorkTime: regularWorkTime,
      irregularWorkTime: irregularWorkTime
    };
  } else {
    const irregularWorkTime: number = early + late
    const regularWorkTime: number = workTime - irregularWorkTime - rest
    return {
      workTime: workTime,
      leave: leave,
      rest: rest,
      regularWorkTime: regularWorkTime,
      irregularWorkTime: irregularWorkTime
    };
  }
}

const checkUserLocation = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const username: string = req.user.name;
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':uval': username, ':aval': "relation" },
    KeyConditionExpression: '#u = :uval AND begins_with(#a, :aval)'
  }
  try {
    const result = await documentClient.query(params).promise();
    const workspots: any = result.Items;
    const userLocation: GeoPosition = new GeoPosition(req.body.lat, req.body.lon)
    const distanceArray: number[] = []
    const distanceNameArray: string[] = []
    for (let workspot of workspots) {
      let workspotLocation: GeoPosition = new GeoPosition(workspot.latitude, workspot.longitude);
      let result: number = +userLocation.Distance(workspotLocation).toFixed(0);
      distanceArray.push(result);
      distanceNameArray.push(workspot.workspot)
    }
    const minDistance = Math.min.apply(null, distanceArray)
    if (minDistance >= 1000) {
      throw new Error("指定された勤務地の半径1km以内に移動してください");
    } else {
      const distanceIndex: number = distanceArray.indexOf(minDistance);
      const userLocation: string = distanceNameArray[distanceIndex];
      req.userLocation = userLocation
      next();
    }
  } catch (e: any) {
    res.status(501).json(e.message)
  }
}

router.get("/index/:username/:year/:month", authenticateToken, adminUserCheck, (req: express.Request, res: express.Response) => {
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

router.get("/latest/:username", authenticateToken, async (req: express.Request, res: express.Response) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.params.username, ':attendanceval': "2" },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result: any) => { res.json(result.Items[result.Items.length - 1]) })
    .catch((e: any) => res.status(500).json({ errors: e }));
})

router.post("/common", authenticateToken, checkUserLocation, (req: express.Request, res: express.Response) => {
  let params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.user.name, ':attendanceval': "2" },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result: any) => {
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

router.post("/admin/new", authenticateToken, adminUserCheck, [
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
    return documentClient.query(params).promise().then((results: any) => {
      if (!Object.keys(results.Items).length) throw new Error('登録されていない勤務地です')
      return true
    })
  })
],
  (req: express.Request, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  const params = {
    user: req.body.user,
    attendance: req.body.attendance,
    workspot: req.body.workspot,
    leave: req.body.leave ?? "none"
  };
  return documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then((result) => res.json({ "message": "insert success" }))
    .catch((e) => res.status(500).json({ errors: e }));
})

router.delete("/admin/delete", authenticateToken, adminUserCheck, (req: express.Request, res: express.Response) => {
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

router.get("/excel/:username/:year/:month", authenticateToken, adminUserCheck, async (req: express.Request, res: express.Response) => {
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
    const timecards: any = results.Items
    console.log(timecards)
    sheet1.cell("B3").value(req.params.username);
    sheet1.cell("B4").value(`${req.params.year}年 ${req.params.month}月`);
    for (let timecard of timecards) {
      const row = Number(timecard.attendance.slice(6, 8)) + 5
      sheet1.cell(`B${row}`).value(timecard.workTime);
      sheet1.cell(`C${row}`).value(timecard.regularWorkTime);
      sheet1.cell(`D${row}`).value(timecard.irregularWorkTime);
      sheet1.cell(`E${row}`).value(timecard.rest);
    }
    await workbook.toFileAsync(`public/tmp/${req.params.year}年${req.params.month}月${req.params.username}.xlsx`)
    res.download(`public/tmp/${req.params.year}年${req.params.month}月${req.params.username}.xlsx`)
  } catch (e: any) {
    res.status(501).json(e.message)
  }
})

module.exports = router;
