import asyncHandler from "express-async-handler";
import bcrypt from 'bcryptjs';
import {Request, Response} from "express";
import {ValidationError} from "../middleware/errorMiddleware";
import {UserEntity} from "../types";
import {User} from "../models/userModel";
import { decodeToken, generateToken } from "../middleware/authMiddleware";

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

    const setTokenOnUser = await User.findOne({email});

    setTokenOnUser.token = generateToken(setTokenOnUser._id, setTokenOnUser.role, setTokenOnUser.name, setTokenOnUser.email);

    await setTokenOnUser.save();
    
    if (user) {
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            token: setTokenOnUser.token
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
        const token = generateToken(user._id, user.role, user.name, user.email);
        user.token = token;
        await user.save();

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        })
    } else {
        res.status(400);
        throw new ValidationError('Invalid email or password.');
    }
})

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
    const decodedToken = decodeToken(req.header('authorization').split(" ")[1]);
    const userIdFromToken = decodedToken.id;
    
    // Check for user id
    const user = await User.findOne({_id:userIdFromToken});

    user.token = '';
    await user.save();
    res.status(200).json({
        message: 'User succesfully logged out.'
    });
})

// @desc   Get user data
// @route  GET /api/users/me
// @access Private
export const getMe = asyncHandler(async (req: Request, res: Response) => {
    // const userBeers = await Beer.find({user: req.user.id})

    res.status(200).json({
        user: req.user,
        // userBeers,
    })
})

