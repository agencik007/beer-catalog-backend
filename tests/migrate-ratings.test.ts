import { describe, expect, it, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { Review } from '../models/reviewModel.js';
import { migrateRatings, toReviewRating } from '../scripts/migrate-ratings.js';
import { useTestDb } from './db.js';

useTestDb();

vi.spyOn(console, 'log').mockImplementation(() => {});

const beers = () => mongoose.connection.db!.collection('beers');

const legacyBeer = (rating: unknown, user: Types.ObjectId | null = new Types.ObjectId()) => ({
	_id: new Types.ObjectId(),
	...(user ? { user } : {}),
	createdBy: 'Owner',
	name: 'Old beer',
	type: 'Lager',
	rating,
	alcohol: 5,
	description: 'Legacy',
});

describe('toReviewRating', () => {
	it.each([
		[4, 4],
		[4.6, 5],
		[9, 5],
		['3', 3],
		[0.4, 1],
		[0, null],
		['abc', null],
		[null, null],
	])('%s -> %s', (input, expected) => {
		expect(toReviewRating(input)).toBe(expected);
	});
});

describe('migrateRatings', () => {
	it('dry run changes nothing', async () => {
		await beers().insertOne(legacyBeer(4));
		const stats = await migrateRatings({ dryRun: true });

		expect(stats).toEqual({ created: 1, alreadyReviewed: 0, invalid: 0 });
		expect(await Review.countDocuments()).toBe(0);
		expect(await beers().countDocuments({ rating: { $exists: true } })).toBe(1);
	});

	it('creates the owner review, caches the average and drops the legacy field', async () => {
		const beer = legacyBeer(4);
		const invalid = legacyBeer('n/a');
		const orphan = legacyBeer(3, null);
		await beers().insertMany([beer, invalid, orphan]);

		const stats = await migrateRatings({ dryRun: false });
		expect(stats).toEqual({ created: 1, alreadyReviewed: 0, invalid: 2 });

		const review = await Review.findOne({ beer: beer._id }).lean();
		expect(review).toMatchObject({ rating: 4, userName: 'Owner' });
		expect(review!.user.toString()).toBe(beer.user!.toString());

		expect(await beers().findOne({ _id: beer._id })).toMatchObject({ ratingAvg: 4, ratingCount: 1 });
		expect(await beers().findOne({ _id: invalid._id })).toMatchObject({ ratingAvg: 0, ratingCount: 0 });
		expect(await beers().countDocuments({ rating: { $exists: true } })).toBe(0);
	});

	it('keeps an existing review from the owner and is idempotent', async () => {
		const beer = legacyBeer(2);
		await beers().insertOne(beer);
		await Review.create({ beer: beer._id, user: beer.user, userName: 'Owner', rating: 5 });

		expect(await migrateRatings({ dryRun: false })).toEqual({ created: 0, alreadyReviewed: 1, invalid: 0 });
		expect(await migrateRatings({ dryRun: false })).toEqual({ created: 0, alreadyReviewed: 0, invalid: 0 });

		expect(await Review.countDocuments()).toBe(1);
		expect(await beers().findOne({ _id: beer._id })).toMatchObject({ ratingAvg: 5, ratingCount: 1 });
	});
});
