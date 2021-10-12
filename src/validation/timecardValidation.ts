import express from 'express';
import { check, validationResult } from 'express-validator';
import documentClient from "../dbconnect";
import dayjs from "dayjs";
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import "dayjs/locale/ja"
dayjs.locale("ja")
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export const adminNewTimecardValidation = [
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
      ExpressionAttributeNames: { '#u': 'user', '#w': 'workspot' },
      ExpressionAttributeValues: { ':uval': 'workspot', ':wval': value },
      KeyConditionExpression: '#u = :uval',
      FilterExpression: '#w = :wval'
    };
    return documentClient.query(params).promise().then((results: any) => {
      if (!Object.keys(results.Items).length) throw new Error('登録されていない勤務地です')
      return true
    })
  }),
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    else next();
  }
]
