import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import asyncHandler from 'express-async-handler';
import { ValidationError } from '../middleware/errorMiddleware.js';
import { isAdmin } from '../middleware/authMiddleware.js';
import { Beer } from '../models/beerModel.js';
import { Review, REVIEW_COMMENT_MAX } from '../models/reviewModel.js';
import { parseComment, parseRating, recalcBeerRating, upsertReview } from '../lib/reviews.js';

const MAX_PAGE_SIZE = 50;

// Public fields only (no emails)
const REVIEW_FIELDS = 'beer user userName rating comment createdAt updatedAt';

const requireBeer = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!isValidObjectId(id) || !(await Beer.exists({ _id: id }))) {
		res.status(404);
		throw new ValidationError('Beer not found.');
	}
	return id;
};

const positiveInt = (value: unknown, fallback: number) => {
	const n = Number(value);
	return Number.isInteger(n) && n > 0 ? n : fallback;
};

// @desc   List reviews of a beer
// @route  GET /api/beers/:id/reviews
// @access Public
export const getReviews = asyncHandler(async (req: Request, res: Response) => {
	const beerId = await requireBeer(req, res);
	const page = positiveInt(req.query.page, 1);
	const limit = Math.min(positiveInt(req.query.limit, 10), MAX_PAGE_SIZE);

	const [results, itemCount] = await Promise.all([
		Review.find({ beer: beerId })
			.select(REVIEW_FIELDS)
			.sort({ createdAt: -1, _id: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean()
			.exec(),
		Review.countDocuments({ beer: beerId }),
	]);

	res.status(200).json({
		currentPage: page,
		itemCount,
		pageCount: Math.ceil(itemCount / limit),
		limitPerPage: limit,
		results,
	});
});

// @desc   Get the signed-in user's review of a beer (null when none)
// @route  GET /api/beers/:id/reviews/me
// @access Private
export const getMyReview = asyncHandler(async (req: Request, res: Response) => {
	const beerId = await requireBeer(req, res);
	const review = await Review.findOne({ beer: beerId, user: req.user!.id })
		.select(REVIEW_FIELDS)
		.lean()
		.exec();

	res.status(200).json(review);
});

// @desc   Create or update the signed-in user's review of a beer
// @route  PUT /api/beers/:id/reviews/me
// @access Private
export const saveMyReview = asyncHandler(async (req: Request, res: Response) => {
	const beerId = await requireBeer(req, res);

	const rating = parseRating(req.body?.rating);
	if (rating === null) {
		res.status(400);
		throw new ValidationError('Rating must be a whole number from 1 to 5.');
	}

	const comment = parseComment(req.body?.comment);
	if (comment === null) {
		res.status(400);
		throw new ValidationError(`Comment must be text up to ${REVIEW_COMMENT_MAX} characters.`);
	}

	const { review, summary } = await upsertReview({
		beerId,
		userId: req.user!.id,
		userName: req.user!.name,
		rating,
		comment,
	});

	res.status(200).json({ review, ...summary });
});

// @desc   Delete the signed-in user's review of a beer
// @route  DELETE /api/beers/:id/reviews/me
// @access Private
export const deleteMyReview = asyncHandler(async (req: Request, res: Response) => {
	const beerId = await requireBeer(req, res);
	const deleted = await Review.findOneAndDelete({ beer: beerId, user: req.user!.id });

	if (!deleted) {
		res.status(404);
		throw new ValidationError('Review not found.');
	}

	const summary = await recalcBeerRating(beerId);
	res.status(200).json({ id: deleted._id, ...summary });
});

// @desc   Delete any review of a beer (its author or an admin)
// @route  DELETE /api/beers/:id/reviews/:reviewId
// @access Private
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
	const beerId = await requireBeer(req, res);
	const { reviewId } = req.params;

	const review = isValidObjectId(reviewId)
		? await Review.findOne({ _id: reviewId, beer: beerId })
		: null;

	if (!review) {
		res.status(404);
		throw new ValidationError('Review not found.');
	}

	if (review.user.toString() !== req.user!.id.toString() && !isAdmin(req)) {
		res.status(403);
		throw new ValidationError('Only the review author or an admin can delete this review.');
	}

	await review.deleteOne();
	const summary = await recalcBeerRating(beerId);
	res.status(200).json({ id: review._id, ...summary });
});
