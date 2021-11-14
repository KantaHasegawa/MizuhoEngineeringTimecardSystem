import express from "express";
const app: express.Express = express();
import router from "./routes/v1/index";
import cors from "cors";
import { errorMiddleware } from "./helper/helper";

const allowedOrigins = ["http://localhost:3000"];

const options: cors.CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(options));

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use("/", router);
app.use(errorMiddleware);

export default app;
