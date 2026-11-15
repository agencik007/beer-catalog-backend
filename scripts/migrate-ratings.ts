/**
 * Turns the legacy per-beer `rating` (set by whoever added the beer) into that
 * user's review, then caches the community average on the beer.
 *
 * - creates a review { beer, user: beer.user, userName: beer.createdBy, rating }
 *   unless that user already reviewed the beer (their review wins)
 * - legacy ratings are rounded and clamped to 1–5
 * - recomputes `ratingAvg` / `ratingCount` and removes the legacy `rating` field
 * - idempotent: beers without a `rating` field are skipped
 *
 * Usage: npm run migrate:ratings -- [--dry-run]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Review } from '../models/reviewModel.js';
import { recalcBeerRating } from '../lib/reviews.js';

interface LegacyBeer {
	_id: mongoose.Types.ObjectId;
	user?: mongoose.Types.ObjectId;
	createdBy?: string;
	rating?: unknown;
}

export const toReviewRating = (value: unknown): number | null => {
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) return null;
	return Math.min(5, Math.max(1, Math.round(n)));
};

export const migrateRatings = async ({ dryRun }: { dryRun: boolean }) => {
	const beers = mongoose.connection.db!.collection<LegacyBeer>('beers');
	await Review.syncIndexes();

	const legacy = await beers.find({ rating: { $exists: true } }).toArray();
	console.log(`Found ${legacy.length} beer(s) with a legacy rating.${dryRun ? ' (dry run)' : ''}`);

	const stats = { created: 0, alreadyReviewed: 0, invalid: 0 };

	for (const beer of legacy) {
		const rating = toReviewRating(beer.rating);
		const exists = beer.user ? await Review.exists({ beer: beer._id, user: beer.user }) : null;

		if (!beer.user || rating === null) stats.invalid++;
		else if (exists) stats.alreadyReviewed++;
		else stats.created++;

		if (dryRun) continue;

		if (beer.user && rating !== null && !exists) {
			await Review.create({
				beer: beer._id,
				user: beer.user,
				userName: beer.createdBy?.trim() || 'Unknown',
				rating,
			});
		}
		await recalcBeerRating(beer._id);
		await beers.updateOne({ _id: beer._id }, { $unset: { rating: '' } });
	}

	// Beers created without a legacy rating still need the cached fields
	if (!dryRun) {
		await beers.updateMany(
			{ ratingCount: { $exists: false } },
			{ $set: { ratingAvg: 0, ratingCount: 0 } }
		);
	}

	console.log(
		`Reviews created: ${stats.created}, already reviewed: ${stats.alreadyReviewed}, ` +
			`skipped (no owner or invalid rating): ${stats.invalid}`
	);
	return stats;
};

const isCli = process.argv[1]?.split(String.fromCharCode(92)).join('/').endsWith('scripts/migrate-ratings.ts');

if (isCli) {
	if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set.');
	await mongoose.connect(process.env.MONGO_URI);
	try {
		await migrateRatings({ dryRun: process.argv.includes('--dry-run') });
	} finally {
		await mongoose.disconnect();
	}
}
