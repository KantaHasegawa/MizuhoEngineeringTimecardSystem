import express from "express";
import { adminUserCheck, authenticateToken } from "../../helper/helper";
import WorkspotController from "../../controllers/workspotController";
const router = express.Router();
const Controller = new WorkspotController()

router.get("/show/:name", authenticateToken, adminUserCheck, Controller.show);
router.get("/index", authenticateToken, adminUserCheck, Controller.index);
router.get("/ids", Controller.allIDs);
router.post("/new", authenticateToken, adminUserCheck, Controller.new);
router.post("/delete", authenticateToken, adminUserCheck, Controller.delete);

export default router;
