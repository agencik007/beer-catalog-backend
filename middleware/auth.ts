import jsonwebtoken from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { User } from '../models/userModel';
import {Request, Response} from "express";
import {JwtPayload} from "../types";


export const protect = asyncHandler(async (req: Request, res: Response, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET) as JwtPayload;

            // Get user from the token
            req.user = await User.findById(decoded.id).select('-password');

            next();
        } catch (error) {
            console.log(error);
            res.status(401);
            throw new Error('Not authorized');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
})