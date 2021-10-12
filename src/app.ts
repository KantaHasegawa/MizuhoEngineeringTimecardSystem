import express from 'express';
const session = require('express-session');
const app: express.Express = express()
const router = require("./routes/v1/index");

if (process.env.NODE_ENV === "development") {
  require('dotenv').config();
}

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

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(session(sess));

app.use("/", router);

export default app;
