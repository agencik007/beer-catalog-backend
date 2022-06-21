import {Request, Response} from "express";
import {ValidationError} from "../utlis/errors";
import asyncHandler from "express-async-handler";


// @desc   Get beers
// @route  GET /api/beers
// @access Private
export const getBeers = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({message: 'Get beers'});
})

// @desc   Create beers
// @route  POST /api/beers
// @access Private
export const createBeer = asyncHandler(async (req: Request, res: Response) => {
    if (!req.body.name) {
        res
            .status(400)
            throw new ValidationError('Please add the name of the beer.')

    }
    res.status(200).json({message: 'Create beer'});
})

// @desc   Update beer
// @route  PUT /api/beers/:id
// @access Private
export const updateBeer = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({message: `Update beer ${req.params.id}`});
})

// @desc   Delete beer
// @route  DELETE /api/beers/:id
// @access Private
export const deleteBeer = asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({message: `Delete beer ${req.params.id}`});
})