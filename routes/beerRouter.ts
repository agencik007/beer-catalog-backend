import { Router } from 'express';
import {
	createBeer,
	deleteBeer,
	getBeer,
	getBeers,
	updateBeer,
	userBeers,
} from '../controllers/beerController';
import { protect } from '../middleware/authMiddleware';

export const beerRouter = Router()
	.get('/', getBeers)

	.get('/userbeers', protect, userBeers)

	.get('/:id', getBeer)

	.post('/', protect, createBeer)

	.put('/:id', protect, updateBeer)

	.delete('/:id', protect, deleteBeer);
