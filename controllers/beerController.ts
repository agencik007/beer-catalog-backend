import {Request, Response} from "express";
import {ValidationError} from "../middleware/errorMiddleware";
import asyncHandler from "express-async-handler";
import {Beer} from "../models/beerModel";
import {BeerEntity} from "../types";
import {decodeUserIdFromToken} from "../middleware/authMiddleware";

// @desc   Get beers
// @route  GET /api/beers
// @access Private
export const getBeers = asyncHandler(async (req: Request, res: Response) => {
    const beers = await Beer.find({});

    console.log(beers);

    res.status(200).json(beers);
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

    const beer =  await Beer.create({
        user: await decodeUserIdFromToken(req),
        name: req.body.name,
        type: req.body.type,
        rating: req.body.rating,
        alcohol: req.body.alcohol,
        description: req.body.description,
        avatar: req.body.avatar
    } as BeerEntity);

    await beer.save();

    res.status(200).json(beer);
})

// @desc   Update beer
// @route  PUT /api/beers/:id
// @access Private
export const updateBeer = asyncHandler(async (req: Request, res: Response) => {
    const beer = await Beer.findById(req.params.id);

    if (!beer) {
        res.status(400);
        throw new ValidationError('Beer not found.');
    }

    const updatedBeer = await Beer.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
    })

    res.status(200).json(updatedBeer);
})

// @desc   Delete beer
// @route  DELETE /api/beers/:id
// @access Private
export const deleteBeer = asyncHandler(async (req: Request, res: Response) => {
    const beer = await Beer.findById(req.params.id);

    if (!beer) {
        res.status(400);
        throw new ValidationError('Beer not found.');
    }

    await beer.remove();

    res.status(200).json({id: req.params.id});
})