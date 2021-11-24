import express from "express";
import UserModel from "../models/user";
import db from "../helper/dbconnect";
import UserValidator from "../validation/userValidator";
const Model = new UserModel(db);
const Validator = new UserValidator(db);

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

  signup = async (
    req: express.Request<unknown, unknown, RequestBody>,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      await Validator.signup(req.body);
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
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  delete = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.delete(req.params.name);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export default UserController;
