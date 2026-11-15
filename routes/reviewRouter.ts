import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
	deleteMyReview,
	deleteReview,
	getMyReview,
	getReviews,
	saveMyReview,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

// Writes are cheap to spam; keep them well below the global limit
const writeLimiter = rateLimit({
	windowMs: 10 * 60 * 1000,
	limit: 20,
	standardHeaders: true,
	legacyHeaders: false,
	skip: () => process.env.NODE_ENV === 'test',
	message: { message: 'Too many review changes, please try again later.' },
});

// Mounted at /api/beers/:id/reviews
export const reviewRouter = Router({ mergeParams: true })
	.get('/', getReviews)

	.get('/me', protect, getMyReview)

	.put('/me', writeLimiter, protect, saveMyReview)

	.delete('/me', writeLimiter, protect, deleteMyReview)

	.delete('/:reviewId', writeLimiter, protect, deleteReview);
