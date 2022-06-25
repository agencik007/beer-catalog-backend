import {Router} from "express";
import {getMe, loginUser, registerUser} from '../controllers/userController';
import {protect} from "../middleware/auth";

export const userRouter = Router()

    .post('/', registerUser)

    .post('/login', loginUser)

    .get('/me', protect, getMe)
