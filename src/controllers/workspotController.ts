import express from "express";
import geocoder from "../helper/gecorderSetting";
import db from "../helper/dbconnect";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import WorkspotModel from "../models/workspot";
dayjs.locale("ja");

const Model = new WorkspotModel(db, geocoder);

type NewRequestBody = {
  lat: number;
  lng: number;
};

type DeleteRequestBody = {
  attendance: string;
  workspot: string;
};

class WorkspotController {
  show = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const name = req.query.name as string | undefined;
    try {
      const result = await Model.get(name);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  index = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.all();
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  allIDs = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.allIDs();
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
      const result = await Model.new(req.body.lat, req.body.lng);
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
      const result = await Model.delete(req.body.attendance, req.body.workspot);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export default WorkspotController;
