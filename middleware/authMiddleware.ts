import jsonwebtoken from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { User } from '../models/userModel';
import {NextFunction, Request, Response} from "express";
import {JwtPayload} from "../types";
import mongoose from "mongoose";
import { ValidationError } from "./errorMiddleware";

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

            if (req.user.token == token){
                next();
            } else {
                res.status(401)
                throw new Error('Unauthorized.');
            }
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


// Generate JWT
export const generateToken = (id: mongoose.Schema.Types.ObjectId, role: 'admin' | 'user', name: string, email: string) => {
    return jsonwebtoken.sign({id, role, name, email}, process.env.JWT_SECRET, {
        expiresIn: '1d'
    })
}
// Decode JWT token
export const decodeToken = (token: string) => {
    try {
        const base64Payload = token.split(".")[1];
        const payloadBuffer = Buffer.from(base64Payload, "base64");
        return JSON.parse(payloadBuffer.toString());
    } catch (error) {
      throw new ValidationError(error);
    }
  };