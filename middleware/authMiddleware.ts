import jsonwebtoken from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { User } from '../models/userModel';
import {NextFunction, Request, Response} from "express";
import {JwtPayload} from "../types";
import {ObjectId} from "mongoose";



export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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

export const decodeUserIdFromToken = (req: Request): ObjectId => {
    const token = req.headers.authorization.split(' ')[1];

    const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET) as JwtPayload;

    const userId = decoded.id;

    return userId;
}