import express from "express";
import db from "../helper/dbconnect";
import geocoder from "../helper/gecorderSetting";
import RelationModel from "../models/relation";

const Model = new RelationModel(db, geocoder);

type TypeDeleteRelationRequestBody = {
  user: string;
  workspot: string;
};
type TypeNewRelationRequestBody = {
  user: string;
  workspot: string;
};

class RelationController {
  indexUser = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.indexUser(req.params.username);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  userSelectBoxItems = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.userSelectBoxItems(req.params.username);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  indexWorkspot = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.indexWorkspot(req.params.workspot);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  workspotSelectBoxItems = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.workspotSelectBoxItems(req.params.workspot);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  new = async (
    req: express.Request<unknown, unknown, TypeNewRelationRequestBody>,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.new(req.body.user, req.body.workspot);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  delete = async (
    req: express.Request<unknown, unknown, TypeDeleteRelationRequestBody>,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.delete(req.body.user, req.body.workspot);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export default RelationController;
