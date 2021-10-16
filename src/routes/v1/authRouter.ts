import express from 'express';
import { login, token, logout } from '../../controllers/authController'
import { authenticateToken } from '../../helper/helper'
const router = express.Router();

router.post("/login", login);
router.post("/logout", authenticateToken, logout )
router.post("/refresh", token);

export default router;
