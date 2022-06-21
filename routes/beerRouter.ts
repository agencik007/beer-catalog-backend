import {Router} from 'express';
import {createBeer, deleteBeer, getBeers, updateBeer} from "../controllers/beerController";

export const beerRouter = Router()

    .get('/', getBeers)

    .post('/', createBeer)

    .put('/:id', updateBeer)

    .delete('/:id', deleteBeer)