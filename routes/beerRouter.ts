import {Router} from 'express';
import {createBeer, deleteBeer, getBeers, updateBeer} from "../controllers/beerController";
import {protect} from "../middleware/authMiddleware";

export const beerRouter = Router()

    .get('/', getBeers)

    .post('/', protect, createBeer)

    .put('/:id', protect, updateBeer)

    .delete('/:id', protect, deleteBeer)