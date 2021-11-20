import { Client } from "@line/bot-sdk";
import HttpException from "../exceptions/HttpException";
import XlsxPopulate from "xlsx-populate";
import dayjs from "dayjs";
import "dayjs/locale/ja";

type TypeCalculateWorkingTimeReturn = {
  workTime: number;
  leave: string;
  rest: number;
  regularWorkTime: number;
  irregularWorkTime: number;
};

type TypeTimecardStatus = "NotAttend" | "NotLeave" | "AlreadyLeave";

class Timecard {
  db: AWS.DynamoDB.DocumentClient;
  lineClient: Client;

  constructor(db: AWS.DynamoDB.DocumentClient, lineClient: Client) {
    this.db = db;
    this.lineClient = lineClient;
  }

  pushLINE = async (text: string) => {
    try {
      await this.lineClient.broadcast({
        type: "text",
        text: text,
      });
    } catch (err) {
      throw new HttpException(500, "Failed push LINE message");
    }
  };

  calculateWorkingTime = (
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

  all = async (username: string, year: string, month: string) => {
    const params = {
      TableName: "Timecards",
      ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
      ExpressionAttributeValues: {
        ":userval": username,
        ":attendanceval": `${year}${month}`,
      },
      KeyConditionExpression:
        "#u = :userval AND begins_with(#a, :attendanceval)",
    };
    try {
      const result = await this.db.query(params).promise();
      return result.Items;
    } catch (err) {
      throw err;
    }
  };

  latest = async (username: string) => {
    const params = {
      TableName: "Timecards",
      ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
      ExpressionAttributeValues: {
        ":userval": username,
        ":attendanceval": "2",
      },
      KeyConditionExpression:
        "#u = :userval AND begins_with(#a, :attendanceval)",
    };
    try {
      const result = await this.db.query(params).promise();
      if (!result) {
        throw new HttpException(406, "Latest TimeCard does not exist");
      } else {
        const dummyData = {
          user: username,
          workspot: "dummySpot",
          attendance: "190001010000",
          leave: "190001010000",
          rest: 0,
          workTime: 0,
          regularWorkTime: 0,
          irregularWorkTime: 0,
        };
        console.log(result.Items);
        return result.Items && result.Items.length
          ? result.Items[result.Items.length - 1]
          : dummyData;
      }
    } catch (err) {
      throw err;
    }
  };

  latestAll = async () => {
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
      const usersResult = await this.db.query(userIndexParams).promise();
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
          const timecardResult = await this.db.query(params).promise();
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
      return {
        notAttendTimecards,
        notLeaveTimecards,
        alreadyLeaveTimecards,
      };
    } catch (err) {
      throw err;
    }
  };

  common = async (username: string, userLocation: string) => {
    const params = {
      TableName: "Timecards",
      ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
      ExpressionAttributeValues: {
        ":userval": username,
        ":attendanceval": "2",
      },
      KeyConditionExpression:
        "#u = :userval AND begins_with(#a, :attendanceval)",
    };

    try {
      const timecardsResult = await this.db.query(params).promise();
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
        const user = username;
        const attendance = dayjs().format("YYYYMMDDHHmmss");
        const workspot = userLocation;
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
        await this.db
          .put({
            TableName: "Timecards",
            Item: params,
          })
          .promise();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.pushLINE(
          `${user}さんが${workspot}で${attendance.slice(
            4,
            6
          )}月${attendance.slice(6, 8)}日${attendance.slice(
            8,
            10
          )}時${attendance.slice(10, 12)}分に出勤しました`
        );
        return { message: "Insert Success" };
      } else {
        const results = this.calculateWorkingTime(latestRecord.attendance);
        const user = username;
        const leave = results.leave;
        const params = {
          TableName: "Timecards",
          Key: {
            user: username,
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
        await this.db.update(params).promise();
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.pushLINE(
          `${user}さんが${leave.slice(4, 6)}月${leave.slice(
            6,
            8
          )}日${leave.slice(8, 10)}時${leave.slice(10, 12)}分に退勤しました`
        );
        return { message: "Upadate Success" };
      }
    } catch (err) {
      throw err;
    }
  };

  new = async (
    user: string,
    workspot: string,
    attendance: string,
    leave: string
  ) => {
    const results: TypeCalculateWorkingTimeReturn = this.calculateWorkingTime(
      attendance,
      leave
    );
    const params = {
      user: user,
      attendance: attendance,
      workspot: workspot,
      leave: results.leave,
      rest: results.rest,
      workTime: results.workTime,
      regularWorkTime: results.regularWorkTime,
      irregularWorkTime: results.irregularWorkTime,
    };
    try {
      await this.db
        .put({
          TableName: "Timecards",
          Item: params,
        })
        .promise();
    } catch (err) {
      throw err;
    }
  };

  delete = async (username: string, attendance: string) => {
    const params = {
      TableName: "Timecards",
      Key: {
        user: username,
        attendance: attendance,
      },
    };
    try {
      await this.db.delete(params).promise();
      return { message: "Delete Success" };
    } catch (err) {
      throw err;
    }
  };

  excel = async (username: string, month: string, year: string) => {
    const params = {
      TableName: "Timecards",
      ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
      ExpressionAttributeValues: {
        ":userval": username,
        ":attendanceval": `${year}${month}`,
      },
      KeyConditionExpression:
        "#u = :userval AND begins_with(#a, :attendanceval)",
    };
    try {
      const workbook = await XlsxPopulate.fromFileAsync(
        "public/timecard_template.xlsx"
      );
      const sheet1 = workbook.sheet("Sheet1");
      const results = await this.db.query(params).promise();
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
      sheet1.cell("B3").value(username);
      sheet1.cell("B4").value(`${year}年 ${month}月`);
      for (const timecard of timecards) {
        const row = Number(timecard.attendance.slice(6, 8)) + 5;
        sheet1.cell(`B${row}`).value(timecard.workTime);
        sheet1.cell(`C${row}`).value(timecard.regularWorkTime);
        sheet1.cell(`D${row}`).value(timecard.irregularWorkTime);
        sheet1.cell(`E${row}`).value(timecard.rest);
      }
      const encodedWorkbook = await workbook.outputAsync("base64");
      return encodedWorkbook;
    } catch (err) {
      throw err;
    }
  };
}

export default Timecard;
