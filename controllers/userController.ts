import {Request, Response} from "express";
import bcrypt from 'bcryptjs';
import {ValidationError} from "../utlis/errors";
import asyncHandler from "express-async-handler";
import {User} from "../models/userModel";
import {UserEntity} from "../types/user";


// @desc   Register new user
// @route  POST /api/users
// @access Public
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const {name, email, password} = req.body;

    if (!name || !email || !password) {
        res.status(400)
        throw new ValidationError('Please fill all fields.')
    }

    //Check if user exist
    const userExists = await User.findOne({email});

    console.log(userExists)

    if (userExists) {
        res.status(400)
        throw new ValidationError('User already exists.')
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
            email: user.email
        })
    } else {
        res.status(400)
        throw new ValidationError('Invalid user data.')
    }
})

// @desc   Authenticate a user
// @route  POST /api/users/login
// @access Public
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
    res.json({message: 'Login User.'});
})

// @desc   Get user data
// @route  GET /api/users/me
// @access Public
export const getMe = asyncHandler(async (req: Request, res: Response) => {
    res.json({message: 'User data display.'});
})