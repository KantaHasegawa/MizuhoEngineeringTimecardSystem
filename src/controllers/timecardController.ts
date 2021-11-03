import express from 'express';
import documentClient from "../dbconnect";
const XlsxPopulate = require("xlsx-populate");
import dayjs from "dayjs";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import "dayjs/locale/ja"
import HttpException from '../exceptions/HttpException';
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

const calculateWorkingTime = (ArgumentAttendance: string, ArgumentLeave?: string | undefined): TypeCalculateWorkingTimeReturn => {
  const regularAttendanceTime: dayjs.Dayjs = dayjs(`${ArgumentAttendance.slice(0, 8)}0800`)
  const regularLeaveTime: dayjs.Dayjs = dayjs(`${ArgumentAttendance.slice(0, 8)}1700`)
  const leave: string = ArgumentLeave ?? dayjs().format('YYYYMMDDHHmmss')
  const dayjsObjLeave: dayjs.Dayjs = dayjs(leave)
  const dayjsObjAttendance: dayjs.Dayjs = dayjs(ArgumentAttendance)
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



export const indexTimecard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.params.username, ':attendanceval': `${req.params.year}${req.params.month}` },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result) => { res.json(result.Items) })
    .catch((err) => next(err));
}

export const latestTimecard = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.params.username, ':attendanceval': "2" },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result) => {
      if (!result?.Items) {
        throw new HttpException(406, "Latest TimeCard does not exist");
      } else {
        res.json(result.Items[result.Items.length - 1])
      }
    })
    .catch((err) => next(err));
}

export const commonTimecard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  let params = {
    TableName: 'Timecards',
    ExpressionAttributeNames: { '#u': 'user', '#a': 'attendance' },
    ExpressionAttributeValues: { ':userval': req.user.name, ':attendanceval': "2" },
    KeyConditionExpression: '#u = :userval AND begins_with(#a, :attendanceval)',
  };
  documentClient.query(params).promise()
    .then((result) => {
      const latestRecord = result.Items ? result.Items[result.Items.length - 1] : undefined
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
          .catch((err) => next(err));
      } else {
        const results = calculateWorkingTime(latestRecord.attendance)
        let params = {
          TableName: "Timecards",
          Key: {
            user: req.user.name,
            attendance: latestRecord.attendance
          },
          ExpressionAttributeNames: { '#l': 'leave', '#r': 'rest', '#w': 'workTime', '#g': 'regularWorkTime', '#i': 'irregularWorkTime' },
          ExpressionAttributeValues: { ':lval': results.leave, ':rval': results.rest, ':wval': results.workTime, ':gval': results.regularWorkTime, ':ival': results.irregularWorkTime },
          UpdateExpression: 'SET #l = :lval, #r = :rval, #w = :wval, #g = :gval, #i = :ival'
        }
        documentClient.update(params).promise()
          .then((result) => res.json({ "message": "update success" }))
          .catch((err) => next(err));
      }
    })
}

export const adminNewTimecard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const results: TypeCalculateWorkingTimeReturn = calculateWorkingTime(req.body.attendance, req.body.leave)
    const params = {
      user: req.body.user,
      attendance: req.body.attendance,
      workspot: req.body.workspot,
      leave: results.leave,
      rest: results.rest,
      workTime: results.workTime,
      regularWorkTime: results.regularWorkTime,
      irregularWorkTime: results.irregularWorkTime
    };
    return documentClient
      .put({
        TableName: "Timecards",
        Item: params,
      })
      .promise()
      .then((result) => res.json({ "message": "insert success" }))
      .catch((err) => next(err));
  }

export const adminDeleteTimecard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const params = {
    TableName: 'Timecards',
    Key: {
      user: req.body.user,
      attendance: req.body.attendance
    }
  };
  documentClient.delete(params).promise()
    .then((result) => res.json({ message: "delete success" }))
    .catch((err) => next(err));
}

export const excelTimecard = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
  } catch (err) {
    next(err)
  }
}
