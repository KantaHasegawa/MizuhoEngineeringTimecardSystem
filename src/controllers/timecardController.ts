import express from "express";
import db from "../helper/dbconnect";
import lineClient from "../helper/lineSetting";
import TimecardModel from "../models/timecard";
import TimecardValidator from '../validation/timecardValidator'

const Model = new TimecardModel(db, lineClient);
const Validator = new TimecardValidator(db)

type NewRequestBody = {
  user: string;
  workspot: string;
  attendance: string;
  leave: string;
};

type DeleteRequestBody = {
  user: string;
  attendance: string;
};

class TimecardController {
  index = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.all(
        req.params.username,
        req.params.year,
        req.params.month
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  latest = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.latest(req.params.username);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  latestAll = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.latestAll();
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  common = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.common(
        req.params.username,
        req.params.userLocation
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  new = async (
    req: express.Request<unknown, unknown, NewRequestBody>,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      await Validator.new(req.body)
      const result = await Model.new(
        req.body.user,
        req.body.workspot,
        req.body.attendance,
        req.body.leave
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  delete = async (
    req: express.Request<unknown, unknown, DeleteRequestBody>,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.delete(req.body.user, req.body.attendance);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  excel = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.excel(
        req.params.username,
        req.params.year,
        req.params.month
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export default TimecardController;
