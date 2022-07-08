import {Request, Response} from "express";
import {ValidationError} from "../middleware/errorMiddleware";
import asyncHandler from "express-async-handler";
import {Beer} from "../models/beerModel";
import {BeerEntity} from "../types";


// @desc   Get beers
// @route  GET /api/beers
// @access Private
export const getBeers = asyncHandler(async (req: Request, res: Response) => {
    const beers = await Beer.find({});

    res.status(200).json(beers);
})

// @desc   Create beers
// @route  POST /api/beers
// @access Private
export const createBeer = asyncHandler(async (req: Request, res: Response) => {
    if (!req.body.name || !req.body.type || !req.body.rating || !req.body.alcohol || !req.body.description || !req.body.avatar) {
        res.status(400);
        throw new ValidationError('Please fill all fields in form.');
    }

    const beer =  await Beer.create({
        user: req.user.id,
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

    const decodeUserId = req.user.id;

    if (beer.user.toString() !== decodeUserId.toString()) {
        res.status(401);
        throw new ValidationError('Only the beer creator can edit the beer entry.')
    } else {
        const updatedBeer = await Beer.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        })

        res.status(200).json(updatedBeer);
    }
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

    const decodeUserId = req.user.id;

    if (beer.user.toString() !== decodeUserId.toString()) {
        res.status(401);
        throw new ValidationError('Only the beer creator can delete the beer entry.')
    } else {
        await beer.remove();
        res.status(200).json({id: req.params.id});
    }
})