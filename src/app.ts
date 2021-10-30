import express from 'express';
const session = require('express-session');
const app: express.Express = express()
import router from "./routes/v1/index";
import cors from 'cors'
import cookieParser from "cookie-parser"
import { errorMiddleware } from './helper/helper'

interface ISess {
  secret: String,
  cookie: {
    maxAge: Number,
    secure?: Boolean
  },
  resave: Boolean,
  saveUninitialized: Boolean,
}

const sess: ISess = {
  secret: 'mizuhosecret',
  cookie: { maxAge: 60000 },
  resave: false,
  saveUninitialized: false,
}

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
  sess.cookie.secure = true
}

const allowedOrigins = ['http://localhost:3000'];

const options: cors.CorsOptions = {
  origin: allowedOrigins,
  credentials: true
};

app.use(cors(options))

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

app.use(session(sess));

app.use("/", router);
app.use(errorMiddleware)

export default app;
