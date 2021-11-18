import express from "express";
import documentClient from "../helper/dbconnect";
import XlsxPopulate from "xlsx-populate";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import "dayjs/locale/ja";
import HttpException from "../exceptions/HttpException";
dayjs.locale("ja");
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import { Client, middleware } from "@line/bot-sdk";

type TypeCalculateWorkingTimeReturn = {
  workTime: number;
  leave: string;
  rest: number;
  regularWorkTime: number;
  irregularWorkTime: number;
};

export const pushLINE = async (text: string) => {
  const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "default",
    channelSecret: process.env.LINE_CHANNEL_SECRET || "default",
  };
  console.log(config);
  middleware(config);
  const client = new Client(config);
  try {
    await client.broadcast({
      type: "text",
      text: text,
    });
  } catch (err) {
    console.log(err);
    throw new HttpException(500, "Failed push LINE message");
  }
};

const calculateWorkingTime = (
  ArgumentAttendance: string,
  ArgumentLeave?: string | undefined
): TypeCalculateWorkingTimeReturn => {
  const regularAttendanceTime: dayjs.Dayjs = dayjs(
    `${ArgumentAttendance.slice(0, 8)}0800`
  );
  const regularLeaveTime: dayjs.Dayjs = dayjs(
    `${ArgumentAttendance.slice(0, 8)}1700`
  );
  const leave: string = ArgumentLeave ?? dayjs().format("YYYYMMDDHHmmss");
  const dayjsObjLeave: dayjs.Dayjs = dayjs(leave);
  const dayjsObjAttendance: dayjs.Dayjs = dayjs(ArgumentAttendance);
  const workTime: number = dayjsObjLeave.diff(dayjsObjAttendance, "minute");
  const rest: number = workTime >= 60 ? 60 : 0;

  const early: number = dayjsObjLeave.isSameOrBefore(regularAttendanceTime)
    ? workTime
    : regularAttendanceTime.diff(dayjsObjAttendance, "minute") > 0
    ? regularAttendanceTime.diff(dayjsObjAttendance, "minute")
    : 0;

  const late: number = dayjsObjAttendance.isSameOrAfter(regularLeaveTime)
    ? workTime
    : dayjsObjLeave.diff(regularLeaveTime, "minute") > 0
    ? dayjsObjLeave.diff(regularLeaveTime, "minute")
    : 0;

  if (workTime - rest - early - late < 0) {
    const irregularRest: number = 0 - (workTime - rest - early - late);
    const regularWorkTime = 0;
    const irregularWorkTime: number = rest + early - irregularRest;
    return {
      workTime: workTime,
      leave: leave,
      rest: rest,
      regularWorkTime: regularWorkTime,
      irregularWorkTime: irregularWorkTime,
    };
  } else {
    const irregularWorkTime: number = early + late;
    const regularWorkTime: number = workTime - irregularWorkTime - rest;
    return {
      workTime: workTime,
      leave: leave,
      rest: rest,
      regularWorkTime: regularWorkTime,
      irregularWorkTime: irregularWorkTime,
    };
  }
};

export const indexTimecard = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
    ExpressionAttributeValues: {
      ":userval": req.params.username,
      ":attendanceval": `${req.params.year}${req.params.month}`,
    },
    KeyConditionExpression: "#u = :userval AND begins_with(#a, :attendanceval)",
  };
  documentClient
    .query(params)
    .promise()
    .then((result) => {
      res.json(result.Items);
    })
    .catch((err) => next(err));
};

export const latestTimecard = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
    ExpressionAttributeValues: {
      ":userval": req.params.username,
      ":attendanceval": "2",
    },
    KeyConditionExpression: "#u = :userval AND begins_with(#a, :attendanceval)",
  };
  documentClient
    .query(params)
    .promise()
    .then((result) => {
      if (!result) {
        throw new HttpException(406, "Latest TimeCard does not exist");
      } else {
        const dummyData = {
          user: req.params.username,
          workspot: "dummySpot",
          attendance: "190001010000",
          leave: "190001010000",
          rest: 0,
          workTime: 0,
          regularWorkTime: 0,
          irregularWorkTime: 0,
        };
        console.log(result.Items)
        res.json(result.Items && result.Items.length ? result.Items[result.Items.length - 1] : dummyData);
      }
    })
    .catch((err) => next(err));
};

export const commonTimecard = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
    ExpressionAttributeValues: {
      ":userval": req.user.name,
      ":attendanceval": "2",
    },
    KeyConditionExpression: "#u = :userval AND begins_with(#a, :attendanceval)",
  };

  try {
    const timecardsResult = await documentClient.query(params).promise();
    type TypeLatestTimecard = {
      attendance: string;
      leave: string;
    };
    const timecardsResultItems = timecardsResult.Items as
      | TypeLatestTimecard[]
      | undefined;
    const latestRecord = timecardsResultItems
      ? timecardsResultItems[timecardsResultItems.length - 1]
      : null;
    if (!latestRecord || latestRecord.leave !== "none") {
      const user = req.user.name;
      const attendance = dayjs().format("YYYYMMDDHHmmss");
      const workspot = req.userLocation;
      const params = {
        user: user,
        attendance: attendance,
        workspot: workspot,
        leave: "none",
        rest: 0,
        workTime: 0,
        regularWorkTime: 0,
        irregularWorkTime: 0,
      };
      await documentClient
        .put({
          TableName: "Timecards",
          Item: params,
        })
        .promise();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      pushLINE(
        `${user}さんが${workspot}で${attendance.slice(
          4,
          6
        )}月${attendance.slice(6, 8)}日${attendance.slice(
          8,
          10
        )}時${attendance.slice(10, 12)}分に出勤しました`
      );
      res.json({ message: "insert success" });
    } else {
      const results = calculateWorkingTime(latestRecord.attendance);
      const user = req.user.name;
      const leave = results.leave;
      const params = {
        TableName: "Timecards",
        Key: {
          user: req.user.name,
          attendance: latestRecord.attendance,
        },
        ExpressionAttributeNames: {
          "#l": "leave",
          "#r": "rest",
          "#w": "workTime",
          "#g": "regularWorkTime",
          "#i": "irregularWorkTime",
        },
        ExpressionAttributeValues: {
          ":lval": results.leave,
          ":rval": results.rest,
          ":wval": results.workTime,
          ":gval": results.regularWorkTime,
          ":ival": results.irregularWorkTime,
        },
        UpdateExpression:
          "SET #l = :lval, #r = :rval, #w = :wval, #g = :gval, #i = :ival",
      };
      await documentClient.update(params).promise();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      pushLINE(
        `${user}さんが${leave.slice(4, 6)}月${leave.slice(6, 8)}日${leave.slice(
          8,
          10
        )}時${leave.slice(10, 12)}分に退勤しました`
      );
      res.json({ message: "update success" });
    }
  } catch (err) {
    next(err);
  }
};

type TypeAdminNewTimecardRequestBody = {
  user: string;
  workspot: string;
  attendance: string;
  leave: string;
};

export const adminNewTimecard = (
  req: express.Request<unknown, unknown, TypeAdminNewTimecardRequestBody>,
  res: express.Response,
  next: express.NextFunction
) => {
  const results: TypeCalculateWorkingTimeReturn = calculateWorkingTime(
    req.body.attendance,
    req.body.leave
  );
  const params = {
    user: req.body.user,
    attendance: req.body.attendance,
    workspot: req.body.workspot,
    leave: results.leave,
    rest: results.rest,
    workTime: results.workTime,
    regularWorkTime: results.regularWorkTime,
    irregularWorkTime: results.irregularWorkTime,
  };
  return documentClient
    .put({
      TableName: "Timecards",
      Item: params,
    })
    .promise()
    .then(() => res.json({ message: "insert success" }))
    .catch((err) => next(err));
};

type AdminDeleteTimecardRequestBody = {
  user: string;
  attendance: string;
};

export const adminDeleteTimecard = (
  req: express.Request<unknown, unknown, AdminDeleteTimecardRequestBody>,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    TableName: "Timecards",
    Key: {
      user: req.body.user,
      attendance: req.body.attendance,
    },
  };
  documentClient
    .delete(params)
    .promise()
    .then(() => res.json({ message: "delete success" }))
    .catch((err) => next(err));
};

export const excelTimecard = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const params = {
    TableName: "Timecards",
    ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
    ExpressionAttributeValues: {
      ":userval": req.params.username,
      ":attendanceval": `${req.params.year}${req.params.month}`,
    },
    KeyConditionExpression: "#u = :userval AND begins_with(#a, :attendanceval)",
  };
  try {
    const workbook = await XlsxPopulate.fromFileAsync(
      "public/timecard_template.xlsx"
    );
    const sheet1 = workbook.sheet("Sheet1");
    const results = await documentClient.query(params).promise();
    type TypeTimecard = {
      attendance: string;
      workTime: number;
      regularWorkTime: number;
      irregularWorkTime: number;
      rest: number;
    };
    const timecards = results.Items as TypeTimecard[] | undefined;
    if (!timecards) {
      throw new HttpException(500, "Result is null");
    }
    sheet1.cell("B3").value(req.params.username);
    sheet1.cell("B4").value(`${req.params.year}年 ${req.params.month}月`);
    for (const timecard of timecards) {
      const row = Number(timecard.attendance.slice(6, 8)) + 5;
      sheet1.cell(`B${row}`).value(timecard.workTime);
      sheet1.cell(`C${row}`).value(timecard.regularWorkTime);
      sheet1.cell(`D${row}`).value(timecard.irregularWorkTime);
      sheet1.cell(`E${row}`).value(timecard.rest);
    }
    await workbook.toFileAsync(
      `public/tmp/${req.params.year}年${req.params.month}月${req.params.username}.xlsx`
    );
    res.download(
      `public/tmp/${req.params.year}年${req.params.month}月${req.params.username}.xlsx`
    );
  } catch (err) {
    next(err);
  }
};

type TypeTimecardStatus = "NotAttend" | "NotLeave" | "AlreadyLeave";

export const getAllUserLatestTimecard = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  type TypeTimecard = {
    attendance: string;
    leave: string;
  };

  const isTimecardStatus = (timecard: TypeTimecard): TypeTimecardStatus => {
    const today = dayjs().format("YYYYMMDD");
    const result =
      timecard.leave === "none"
        ? "NotLeave"
        : timecard.attendance.slice(0, 8) === today
        ? "AlreadyLeave"
        : "NotAttend";
    return result;
  };

  const userIndexParams = {
    TableName: "Timecards",
    IndexName: "usersIndex",
    ExpressionAttributeNames: { "#a": "attendance", "#r": "role" },
    ExpressionAttributeValues: { ":aval": "user", ":rval": "common" },
    KeyConditionExpression: "#a = :aval",
    FilterExpression: "#r = :rval",
  };
  try {
    const usersResult = await documentClient.query(userIndexParams).promise();
    const notAttendTimecards = [];
    const notLeaveTimecards = [];
    const alreadyLeaveTimecards = [];
    if (usersResult.Items) {
      type TypeUser = {
        user: string;
      };
      const usersResultItems = usersResult.Items as TypeUser[];
      for (const user of usersResultItems) {
        const params = {
          TableName: "Timecards",
          ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
          ExpressionAttributeValues: {
            ":userval": user.user,
            ":attendanceval": "2",
          },
          KeyConditionExpression:
            "#u = :userval AND begins_with(#a, :attendanceval)",
        };
        const timecardResult = await documentClient.query(params).promise();
        const timecardResultItems = timecardResult.Items as
          | TypeTimecard[]
          | undefined;
        if (!timecardResultItems || !timecardResultItems.length) {
          notAttendTimecards.push({
            user: user.user,
            attendance: "none",
          });
        } else {
          switch (
            isTimecardStatus(
              timecardResultItems[timecardResultItems.length - 1]
            )
          ) {
            case "NotAttend":
              notAttendTimecards.push(
                timecardResultItems[timecardResultItems.length - 1]
              );
              break;
            case "NotLeave":
              notLeaveTimecards.push(
                timecardResultItems[timecardResultItems.length - 1]
              );
              break;
            case "AlreadyLeave":
              alreadyLeaveTimecards.push(
                timecardResultItems[timecardResultItems.length - 1]
              );
              break;
          }
        }
      }
    }
    res.json({ notAttendTimecards, notLeaveTimecards, alreadyLeaveTimecards });
  } catch (err) {
    next(err);
  }
};
