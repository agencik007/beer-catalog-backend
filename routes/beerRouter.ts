import { Router } from 'express';
import {
	createBeer,
	deleteBeer,
	getBeer,
	getBeers,
	updateBeer,
	userBeers,
} from '../controllers/beerController.js';
import { protect } from '../middleware/authMiddleware.js';
import { reviewRouter } from './reviewRouter.js';

export const beerRouter = Router()
	.get('/', getBeers)

	.get('/userbeers', protect, userBeers)

	.use('/:id/reviews', reviewRouter)

	.get('/:id', getBeer)

	.post('/', protect, createBeer)

	.put('/:id', protect, updateBeer)

	.delete('/:id', protect, deleteBeer);
