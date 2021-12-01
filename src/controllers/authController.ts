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

export type Cookies = {
  accessToken?: string | undefined;
  refreshToken?: string | undefined;
};

class AuthController {
  login = async (
    req: express.Request<unknown, unknown, LoginRequestBody>,
    res: express.Response,
    next: express.NextFunction
  ) => {
    try {
      const result = await Model.login(req.body.username, req.body.password);
      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        domain: process.env.DOMAIN,
      });
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        domain: process.env.DOMAIN,
      });
      res.json({ message: "Login Success" });
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
      const cookies = req.cookies as Cookies;
      const result = await Model.token(cookies.refreshToken);
      res.cookie("accessToken", result, {
        sameSite: "none",
        secure: true,
        domain: process.env.DOMAIN,
      });
      res.json({ accessToken: result });
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
      const cookies = req.cookies as Cookies;
      const result = await Model.logout(cookies.refreshToken);
      res.cookie("accessToken", "", {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        domain: process.env.DOMAIN,
      });
      res.cookie("refreshToken", "", {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        domain: process.env.DOMAIN,
      });
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
      const cookies = req.cookies as Cookies;
      const result = Model.currentuser(cookies.accessToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  csrf = (req: express.Request, res: express.Response) => {
    res.json({ csrfToken: req.csrfToken() });
  };
}

export default AuthController;
