/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import express from "express";
import db from "../helper/dbconnect";
import AuthModel from "../models/auth";

const Model = new AuthModel(db);

export type TypeUserToken = {
  name: string;
  role: string;
};

type LoginRequestBody = {
  username: string;
  password: string;
};

type LogoutRequestBody = {
  refreshToken: string;
};

class AuthController {
  login = async (
    req: express.Request<unknown, unknown, LoginRequestBody>,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.login(req.body.username, req.body.password);
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        domain: process.env.DOMAIN,
      });
      res.json({ accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  };

  token = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.token(req.cookies.refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  logout = async (
    req: express.Request<unknown, unknown, LogoutRequestBody>,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      console.log(req.cookies.refreshToken);
      const result = await Model.logout(req.cookies.refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  currentuser = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const authHeader = req.headers["authorization"];
      const accessToken = authHeader && authHeader.split(" ")[1];
      const result = Model.currentuser(accessToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export default AuthController;
