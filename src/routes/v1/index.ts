import express from "express";
const router = express.Router();
import userRoute from "./userRouter";
import authRoute from "./authRouter";
import workspotRoute from "./workspotRouter";
import timecardRoute from "./timecardRouter";
import relationRoute from "./relationRouter";

router.use("/api/v1/user", userRoute);
router.use("/api/v1/auth", authRoute);
router.use("/api/v1/workspot", workspotRoute);
router.use("/api/v1/timecard", timecardRoute);
router.use("/api/v1/relation", relationRoute);

export default router;
