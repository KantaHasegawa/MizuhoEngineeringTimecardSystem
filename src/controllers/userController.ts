import express from "express";
import UserModel from "../models/user";
import db from '../helper/dbconnect'
const Model = new UserModel(db);

type RequestBody = {
  username: string;
  password: string;
};

class UserController {
  show = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.get(req.params.name);
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

  signup = async (
    req: express.Request<unknown, unknown, RequestBody>,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.create(req.body.username, req.body.password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  update = async (
    req: express.Request<unknown, unknown, RequestBody>,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.update(req.body.username, req.body.password);
      res.json(result)
    } catch (err) {
      next(err)
    }
  };

  delete = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.delete(req.params.name);
      res.json(result)
    } catch (err) {
      next(err)
    }
  };
}

export default UserController;
