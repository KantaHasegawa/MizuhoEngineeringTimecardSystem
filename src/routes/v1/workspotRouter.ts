import express from 'express';
import { adminUserCheck, authenticateToken } from "../../helper/helper";
import {showWorkspot, indexWorkspot,newWorkspot,deleteWorkspot,updateWorkspotRelation,indexWorkspotRelation} from '../../controllers/workspotController'
const router = express.Router();

router.get("/show/:name", authenticateToken, adminUserCheck, showWorkspot)
router.get("/index", authenticateToken, adminUserCheck, indexWorkspot)
router.get("/relation/index/:workspot", authenticateToken, adminUserCheck, indexWorkspotRelation)
router.post("/new", authenticateToken, adminUserCheck, newWorkspot)
router.post("/relation/update", authenticateToken, adminUserCheck, updateWorkspotRelation)
router.delete("/delete/:attendance", authenticateToken, adminUserCheck, deleteWorkspot)

export default router;
