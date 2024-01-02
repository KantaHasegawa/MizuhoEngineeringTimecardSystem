import HttpException from "../exceptions/HttpException";
import XlsxPopulate from "xlsx-populate";
import dayjs from "../helper/dayjsSetting";
import {calculateWorkingTime, calculateSumRegularWorkTime, calculateSumIrregularWorkTime, calculateAvgIrregularWorkTime, calculateEarly, calculateLate, calculateAttendanceCount} from "../helper/calculateWorkingTime";
import isTimecardStatus, { TypeTimecard } from "../helper/isTimecardStatus";
import pushLINE from "../helper/pushLINE";
import path from "path";
import s3GenerateURL from "../helper/s3GenerateURL";
import * as fs from "fs/promises";

export type TimecardRow = {
  rest: number,
  workspot: string,
  irregularWorkTime: number,
  leave: string,
  user: string,
  workTime: number,
  attendance: string,
  regularWorkTime: number,
}

type allRes = {
  attendanceCount: number,
  sumRegularWorkTime: number,
  sumIrregularWorkTime: number,
  avgIrregularWorkTime: number,
  items: {
    rest: number;
    workspot: string;
    irregularWorkTime: number;
    leave: string;
    user: string;
    workTime: number;
    attendance: string;
    regularWorkTime: number;
    early: number;
    late: number;
  }[]
}

class Timecard {
  db: AWS.DynamoDB.DocumentClient;

  constructor(db: AWS.DynamoDB.DocumentClient) {
    this.db = db;
  }

  get = async (
    username: string | undefined,
    attendance: string | undefined
  ) => {
    if (!username || !attendance) {
      throw new HttpException(400, "Bad request");
    }
    const params = {
      TableName: process.env.TABLE_NAME || "Timecards",
      Key: {
        user: username,
        attendance: attendance,
      },
    };
    try {
      const result = await this.db.get(params).promise();
      return { timecard: result.Item };
    } catch (err) {
      throw err;
    }
  };

  all = async (username: string, year: string, month: string) => {
    const params = {
      TableName: process.env.TABLE_NAME || "Timecards",
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
      const cols = result.Items as TimecardRow[];
      const attendanceCount = calculateAttendanceCount(cols);
      const sumRegularWorkTime = calculateSumRegularWorkTime(cols);
      const sumIrregularWorkTime = calculateSumIrregularWorkTime(cols);
      const avgIrregularWorkTime = calculateAvgIrregularWorkTime(cols);
      const items = cols.map((col) => {
        const early = calculateEarly(col.attendance);
        const late = calculateLate(col.attendance, col.leave);
        return {
          ...col,
          early,
          late,
        };
      });
      const res: allRes = {
        attendanceCount,
        sumRegularWorkTime,
        sumIrregularWorkTime,
        avgIrregularWorkTime,
        items,
      };
      return res;
    } catch (err) {
      throw err;
    }
  };

  latest = async (username: string) => {
    const params = {
      TableName: process.env.TABLE_NAME || "Timecards",
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
        return result.Items && result.Items.length
          ? result.Items[result.Items.length - 1]
          : dummyData;
      }
    } catch (err) {
      throw err;
    }
  };

  latestAll = async () => {
    const userIndexParams = {
      TableName: process.env.TABLE_NAME || "Timecards",
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
            TableName: process.env.TABLE_NAME || "Timecards",
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
      TableName: process.env.TABLE_NAME || "Timecards",
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
        const attendance = dayjs().tz().format("YYYYMMDDHHmmss");
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
            TableName: process.env.TABLE_NAME || "Timecards",
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
        return { message: "Insert Success" };
      } else {
        const results = calculateWorkingTime(latestRecord.attendance);
        const user = username;
        const leave = results.leave;
        const params = {
          TableName: process.env.TABLE_NAME || "Timecards",
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
        pushLINE(
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
    leave: string,
    rest: number
  ) => {
    const results = calculateWorkingTime(attendance, leave, rest);
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
          TableName: process.env.TABLE_NAME || "Timecards",
          Item: params,
        })
        .promise();
    } catch (err) {
      throw err;
    }
  };

  delete = async (username: string, attendance: string) => {
    const params = {
      TableName: process.env.TABLE_NAME || "Timecards",
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

  excel = async (
    username: string,
    year: string,
    month: string,
    isMobile: boolean
  ) => {
    const params = {
      TableName: process.env.TABLE_NAME || "Timecards",
      ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
      ExpressionAttributeValues: {
        ":userval": username,
        ":attendanceval": `${year}${month}`,
      },
      KeyConditionExpression:
        "#u = :userval AND begins_with(#a, :attendanceval)",
    };
    try {
      const basePath =
        process.env.NODE_ENV === "production"
          ? `${process.env.LAMBDA_TASK_ROOT || "/var/task"}/public`
          : path.join(__dirname, "../../public");

      const workbook = await XlsxPopulate.fromFileAsync(
        `${basePath}/timecard_template.xlsx`
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
      if (isMobile) {
        const filePath =
          process.env.NODE_ENV === "development"
            ? `${basePath}/${year}年${month}月${username}.xlsx`
            : `/tmp/${year}年${month}月${username}.xlsx`;
        try {
          await workbook.toFileAsync(
            filePath
          );
          const item = await fs.readFile(
            filePath
          );
          const url = await s3GenerateURL(
            `${year}年${month}月${username}.xlsx`,
            item
          );
          return url;
        } catch (err) {
          console.log(err);
          throw err;
        }
      } else {
        const encodedWorkbook = await workbook.outputAsync("base64");
        return encodedWorkbook;
      }
    } catch (err) {
      throw err;
    }
  };
}

export default Timecard;
