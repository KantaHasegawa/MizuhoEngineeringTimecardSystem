import express from "express";
import { check, validationResult } from "express-validator";
import documentClient from "../helper/dbconnect";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import "dayjs/locale/ja";
dayjs.locale("ja");
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const isValidTime = (time: string): boolean => {
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
    !(1 <= day && day <= 31) ||
    !(0 <= hour && hour <= 24) ||
    !(0 <= minute && minute <= 60) ||
    !(0 <= second && second <= 60)
  ) {
    return false;
  } else {
    return true;
  }
};

export const adminNewTimecardValidation = [
  check("user").not().isEmpty().matches("^[ぁ-んァ-ヶｱ-ﾝﾞﾟ一-龠]*$"),
  check("attendance")
    .not()
    .isEmpty()
    .isNumeric()
    .custom(async (value: string, { req }) => {
      if (!isValidTime(value)) throw new Error("無効な時間です");
      const yearMonthDay = value.slice(0, 8);
      const params = {
        TableName: "Timecards",
        ExpressionAttributeNames: { "#u": "user", "#a": "attendance" },
        ExpressionAttributeValues: {
          /* eslint-disable @typescript-eslint/no-unsafe-assignment */
          /* eslint-disable @typescript-eslint/no-unsafe-member-access */
          ":userval": req.body.user,
          /* eslint-enable */
          ":attendanceval": `${yearMonthDay}`,
        },
        KeyConditionExpression:
          "#u = :userval AND begins_with(#a, :attendanceval)",
      };
      const results = await documentClient.query(params).promise();
      if (results.Items?.length) throw new Error("登録済みです");
      return true;
    }),
  check("leave").custom((value: string, { req }) => {
    const dayjsObjLeave = dayjs(value);
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const dayjsObjAttendance = dayjs(req.body.attendance);
    /* eslint-enable */
    if (value) {
      if (!isValidTime(value)) throw new Error("無効な時間です");
      if (dayjsObjLeave.isSameOrBefore(dayjsObjAttendance))
        throw new Error("無効な退勤時間です");
      return true;
    } else {
      return true;
    }
  }),
  check("workspot")
    .not()
    .isEmpty()
    .custom((value: string) => {
      const params = {
        TableName: "Timecards",
        ExpressionAttributeNames: { "#u": "user", "#w": "workspot" },
        ExpressionAttributeValues: { ":uval": "workspot", ":wval": value },
        KeyConditionExpression: "#u = :uval",
        FilterExpression: "#w = :wval",
      };
      return documentClient
        .query(params)
        .promise()
        .then((results) => {
          if (!results.Items?.length) {
            throw new Error("登録されていない勤務地です");
          }
          return true;
        });
    }),
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    } else next();
  },
];
