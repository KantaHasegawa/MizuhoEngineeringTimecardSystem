import Ajv from "ajv";
import HttpException from "../exceptions/HttpException";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isLeapYear from "dayjs/plugin/isLeapYear";
import "dayjs/locale/ja";
dayjs.locale("ja");
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isLeapYear);
const ajv = new Ajv();

type Timecard = {
  user: string;
  workspot: string;
  attendance: string;
  leave: string;
};

class TimecardValidator {
  db: AWS.DynamoDB.DocumentClient;

  constructor(db: AWS.DynamoDB.DocumentClient) {
    this.db = db;
  }

  schemaNew = {
    type: "object",
    properties: {
      user: {
        type: "string",
      },
      workspot: {
        type: "string",
      },
      attendance: {
        type: "string",
      },
      leave: {
        type: "string",
      },
    },
    required: ["user", "workspot", "attendance", "leave"],
  };

  validateNew = ajv.compile(this.schemaNew);

  isValidTime = (time: string): boolean => {
    const year = Number(time.slice(0, 4));
    const month = Number(time.slice(4, 6));
    const day = Number(time.slice(6, 8));
    const hour = Number(time.slice(8, 10));
    const minute = Number(time.slice(10, 12));
    const second = Number(time.slice(12, 14));
    if (!Number(time)) {
      return false;
    } else if (
      !(2021 <= year && year <= 2100) ||
      !(1 <= month && month <= 12) ||
      !(0 <= hour && hour <= 24) ||
      !(0 <= minute && minute <= 60) ||
      !(0 <= second && second <= 60)
    ) {
      return false;
    } else if (month == 2) {
      if (dayjs(year).isLeapYear()) {
        if (!(1 <= day && day <= 29)) {
          return false;
        }
        return true;
      } else {
        if (!(1 <= day && day <= 28)) {
          return false;
        }
        return true;
      }
    } else if (
      month == 1 ||
      month == 3 ||
      month == 5 ||
      month == 7 ||
      month == 8 ||
      month == 10 ||
      month == 12
    ) {
      if (!(1 <= day && day <= 31)) {
        return false;
      }
      return true;
    } else {
      if (!(1 <= day && day <= 30)) {
        return false;
      }
      return true;
    }
  };

  new = async (data: Timecard) => {
    try {
      if (this.validateNew(data)) {
        if (
          !this.isValidTime(data.attendance) ||
          !this.isValidTime(data.leave)
        ) {
          throw new HttpException(400, "不正な入力です");
        }
        if (dayjs(data.leave).isSameOrBefore(dayjs(data.attendance))) {
          throw new HttpException(400, "不正な入力です");
        }
        const paramsUser = {
          TableName: "Timecards",
          Key: {
            user: data.user,
            attendance: "user",
          },
        };
        const resultUser = await this.db.get(paramsUser).promise();
        if (!Object.keys(resultUser).length) {
          throw new HttpException(400, "ユーザーが存在しません");
        }
        const paramsWorkspot = {
          TableName: "Timecards",
          ExpressionAttributeNames: { "#u": "user", "#w": "workspot" },
          ExpressionAttributeValues: {
            ":uval": "workspot",
            ":wval": data.workspot,
          },
          KeyConditionExpression: "#u = :uval",
          FilterExpression: "#w = :wval",
        };
        const resultWorkspot = await this.db.query(paramsWorkspot).promise();
        if (!resultWorkspot.Items?.length) {
          throw new HttpException(400, "勤務地が存在しません");
        }
        const paramsAttendance = {
          TableName: "Timecards",
          ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
          ExpressionAttributeValues: {
            ":userval": data.user,
            ":attendanceval": `${data.attendance.slice(0, 8)}`,
          },
          KeyConditionExpression:
            "#u = :userval AND begins_with(#a, :attendanceval)",
        };
        const results = await this.db.query(paramsAttendance).promise();
        if (results.Items?.length) {
          throw new HttpException(400, "登録済みです");
        }
      }
    } catch (err) {
      throw err;
    }
  };
}

export default TimecardValidator;
