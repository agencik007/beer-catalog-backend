import {Router} from 'express';
import {createBeer, deleteBeer, getBeers, updateBeer, userBeers} from "../controllers/beerController";
import {protect} from "../middleware/authMiddleware";

export const beerRouter = Router()

    .get('/', getBeers)
    
    .get('/userbeers', protect, userBeers)

    .post('/', protect, createBeer)

    .put('/:id', protect, updateBeer)

    .delete('/:id', protect, deleteBeer)