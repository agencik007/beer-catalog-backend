import { Schema, Types } from 'mongoose';
import { Beer } from '../models/beerModel.js';
import { Review, REVIEW_COMMENT_MAX } from '../models/reviewModel.js';

type Id = Types.ObjectId | Schema.Types.ObjectId | string;

export interface RatingSummary {
	ratingAvg: number;
	ratingCount: number;
}

/** Returns a whole number 1–5, or null when the value is not a valid rating. */
export const parseRating = (value: unknown): number | null => {
	const rating = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
	return typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5
		? rating
		: null;
};

/**
 * Normalises an optional comment: undefined/null/blank → undefined (no comment).
 * Returns null when the value is not a string or is too long.
 */
export const parseComment = (value: unknown): string | undefined | null => {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') return null;
	const comment = value.trim();
	if (comment.length > REVIEW_COMMENT_MAX) return null;
	return comment === '' ? undefined : comment;
};

/** Recomputes the cached community rating on the beer from its reviews. */
export const recalcBeerRating = async (beerId: Id): Promise<RatingSummary> => {
	const [stats] = await Review.aggregate<{ avg: number; count: number }>([
		{ $match: { beer: new Types.ObjectId(String(beerId)) } },
		{ $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
	]);

	const summary: RatingSummary = {
		ratingAvg: stats ? Math.round(stats.avg * 10) / 10 : 0,
		ratingCount: stats?.count ?? 0,
	};

	await Beer.updateOne({ _id: String(beerId) }, { $set: summary });
	return summary;
};

/** Creates or replaces the user's single review of a beer and refreshes the beer average. */
export const upsertReview = async (input: {
	beerId: Id;
	userId: Id;
	userName: string;
	rating: number;
	comment?: string;
}) => {
	const review = await Review.findOneAndUpdate(
		{ beer: String(input.beerId), user: String(input.userId) },
		input.comment === undefined
			? { $set: { userName: input.userName, rating: input.rating }, $unset: { comment: 1 } }
			: { $set: { userName: input.userName, rating: input.rating, comment: input.comment } },
		{ upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
	).lean();

	const summary = await recalcBeerRating(input.beerId);
	return { review, summary };
};
