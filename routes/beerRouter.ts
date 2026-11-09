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

export const beerRouter = Router()
	.get('/', getBeers)

	.get('/userbeers', protect, userBeers)

	.get('/:id', getBeer)

	.post('/', protect, createBeer)

	.put('/:id', protect, updateBeer)

	.delete('/:id', protect, deleteBeer);
