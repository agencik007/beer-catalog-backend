import {Router} from "express";
import {getMe, loginUser, registerUser} from '../controllers/userController';

export const userRouter = Router()

    .post('/', registerUser)

    .post('/login', loginUser)

    .get('/me', getMe)
