import express from "express";
import { check, validationResult } from "express-validator";
import documentClient from "../helper/dbconnect";

export const signupUserValidation = [
  check("username")
    .not()
    .isEmpty()
    .matches("^[ぁ-んァ-ヶｱ-ﾝﾞﾟ一-龠]*$")
    .custom((value: string) => {
      const params = {
        TableName: "Timecards",
        Key: {
          user: value,
          attendance: "user",
        },
      };
      return documentClient
        .get(params)
        .promise()
        .then((result) => {
          if (Object.keys(result).length) {
            throw new Error("このユーザー名は既に使用されています");
          }
          return true;
        });
    }),
  check("password")
    .not()
    .isEmpty()
    .isAlphanumeric()
    .isLength({ min: 4, max: 15 }),
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    } else next();
  },
];

export const editUserValidation = [
  check("password")
    .not()
    .isEmpty()
    .isAlphanumeric()
    .isLength({ min: 4, max: 15 }),
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    } else next();
  },
];
