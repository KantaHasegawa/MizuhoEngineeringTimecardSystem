import express from "express";
import { adminUserCheck, authenticateToken } from "../../helper/helper";
import {
  showWorkspot,
  indexWorkspot,
  newWorkspot,
  deleteWorkspot,
  workspotAllIDs,
} from "../../controllers/workspotController";
const router = express.Router();

router.get("/show/:name", authenticateToken, adminUserCheck, showWorkspot);
router.get("/index", authenticateToken, adminUserCheck, indexWorkspot);
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get("/ids", workspotAllIDs);
router.post("/new", authenticateToken, adminUserCheck, newWorkspot);
router.post("/delete", authenticateToken, adminUserCheck, deleteWorkspot);

export default router;
