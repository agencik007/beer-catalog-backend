import {Router} from "express";
import {getMe, loginUser, logoutUser, registerUser} from '../controllers/userController';
import {protect} from "../middleware/authMiddleware";

export const userRouter = Router()

    .post('/register', registerUser)

    .post('/login', loginUser)

    .post('/logout', protect, logoutUser)

    .get('/me', protect, getMe)
