import express from "express";
const app: express.Express = express();
import router from "./routes/v1/index";
import cors from "cors";
import cookieParser from 'cookie-parser';
import { errorMiddleware } from "./helper/helper";
import csrf from 'csurf'

const allowedOrigins = [process.env.CORS_URL || "default"];

const options: cors.CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

const csrfProtection = csrf({
  cookie: true,
});

app.use(cors(options));

app.use(express.json());

app.use(cookieParser());

app.use(csrfProtection);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use("/", router);
app.use(errorMiddleware);

export default app;
