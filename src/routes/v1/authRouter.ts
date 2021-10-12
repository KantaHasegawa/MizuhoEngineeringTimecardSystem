import express from 'express';
import {login, token} from '../../controllers/authController'
const router = express.Router();

router.post("/login", login);
router.post("/login", token);

export default router;
