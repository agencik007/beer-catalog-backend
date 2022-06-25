import {Request, Response} from "express";
import bcrypt from 'bcryptjs';
import {ValidationError} from "../middleware/errors";
import asyncHandler from "express-async-handler";
import {User} from "../models/userModel";
import {UserEntity} from "../types";
import jsonwebtoken from 'jsonwebtoken';
import mongoose from "mongoose";


// @desc   Register new user
// @route  POST /api/users
// @access Public
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const {name, email, password} = req.body;

    if (!name || !email || !password) {
        res.status(400);
        throw new ValidationError('Please fill all fields.');
    }

    //Check if user exist
    const userExists = await User.findOne({email});

    console.log(userExists);

    if (userExists) {
        res.status(400);
        throw new ValidationError('User already exists.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user and admin
    const user: UserEntity = await User.create({
        name,
        email,
        password: hashedPassword,
        role: email === process.env.ADMIN_EMAIL ? 'admin' : 'user',
    })

    if (user) {
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id)
        })
    } else {
        res.status(400);
        throw new ValidationError('Invalid user data.');
    }
})

// @desc   Authenticate a user
// @route  POST /api/users/login
// @access Public
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const {email, password} = req.body;

    // Check for user email
    const user = await User.findOne({email});

    if (user && (await bcrypt.compare(password, user.password))) {
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id)
        })
    } else {
        res.status(400);
        throw new ValidationError('Invalid credentials.');
    }
})

// @desc   Get user data
// @route  GET /api/users/me
// @access Private
export const getMe = asyncHandler(async (req: Request, res: Response) => {
    const {_id, name, email} = await User.findById(req.user.id);

    res.status(200).json({
        id: _id,
        name,
        email,
    })

    res.json({message: 'User data display.'});
})

// Generate JWT
const generateToken = (id: mongoose.Schema.Types.ObjectId) => {
    return jsonwebtoken.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1d'
    })
}