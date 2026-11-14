import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Replace Better Auth: sessions come from the x-test-user header instead of the database
vi.mock('../lib/auth.js', () => ({
	auth: {
		handler: async () => new Response(null, { status: 404 }),
		api: {
			getSession: async ({ headers }: { headers: Headers }) => {
				const raw = headers.get('x-test-user');
				if (!raw) return null;
				const user = JSON.parse(raw);
				return { user, session: { token: 'test', userId: user.id } };
			},
		},
	},
}));

import { app } from '../app.js';
import { Beer } from '../models/beerModel.js';
import { Review } from '../models/reviewModel.js';
import { useTestDb } from './db.js';
import { as, makeUser, TestUser } from './helpers.js';

useTestDb();

const owner = makeUser('Owner');
const alice = makeUser('Alice');
const bob = makeUser('Bob');
const admin = makeUser('Admin', { role: 'admin' });
const banned = makeUser('Banned', { banned: true });

const newBeer = { name: 'Pils', type: 'Pilsner', rating: 4, alcohol: 5, description: 'Crisp.' };

const createBeer = async (user: TestUser = owner, body = newBeer) => {
	const res = await request(app).post('/api/beers').set(as(user)).send(body);
	expect(res.status).toBe(200);
	return res.body as { _id: string; ratingAvg: number; ratingCount: number };
};

const review = (beerId: string, user: TestUser, body: object) =>
	request(app).put(`/api/beers/${beerId}/reviews/me`).set(as(user)).send(body);

const names = (body: { results: { userName: string }[] }) => body.results.map((r) => r.userName);

describe('creating beers', () => {
	it('turns the creator rating into their first review', async () => {
		const beer = await createBeer();

		expect(beer).toMatchObject({ ratingAvg: 4, ratingCount: 1 });
		expect(beer).not.toHaveProperty('rating');
		const reviews = await Review.find({ beer: beer._id }).lean();
		expect(reviews).toHaveLength(1);
		expect(reviews[0]).toMatchObject({ userName: 'Owner', rating: 4 });
		expect(reviews[0].user.toString()).toBe(owner.id);
	});

	it('rejects an invalid creator rating', async () => {
		const res = await request(app)
			.post('/api/beers')
			.set(as(owner))
			.send({ ...newBeer, rating: 7 });
		expect(res.status).toBe(400);
		expect(await Beer.countDocuments()).toBe(0);
	});
});

describe('PUT /api/beers/:id/reviews/me', () => {
	let beerId: string;
	beforeEach(async () => {
		beerId = (await createBeer())._id;
	});

	it('creates, then edits a single review per user and updates the average', async () => {
		let res = await review(beerId, alice, { rating: 1, comment: '  Too bitter  ' });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ratingAvg: 2.5, ratingCount: 2 });
		expect(res.body.review).toMatchObject({ rating: 1, comment: 'Too bitter', userName: 'Alice' });

		res = await review(beerId, alice, { rating: 5 });
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ratingAvg: 4.5, ratingCount: 2 });
		expect(res.body.review.comment).toBeUndefined();
		expect(await Review.countDocuments({ beer: beerId })).toBe(2);

		const beer = await request(app).get(`/api/beers/${beerId}`);
		expect(beer.body).toMatchObject({ ratingAvg: 4.5, ratingCount: 2 });
	});

	it('rounds the average to one decimal', async () => {
		await review(beerId, alice, { rating: 5 });
		const res = await review(beerId, bob, { rating: 5 });
		expect(res.body.ratingAvg).toBe(4.7);
	});

	it.each([0, 6, 3.5, 'abc', '', null, undefined, true])('rejects rating %s', async (rating) => {
		const res = await review(beerId, alice, { rating });
		expect(res.status).toBe(400);
	});

	it('accepts a numeric string rating', async () => {
		const res = await review(beerId, alice, { rating: '3' });
		expect(res.status).toBe(200);
		expect(res.body.review.rating).toBe(3);
	});

	it('rejects a too long or non-text comment', async () => {
		expect((await review(beerId, alice, { rating: 3, comment: 'x'.repeat(1001) })).status).toBe(400);
		expect((await review(beerId, alice, { rating: 3, comment: { $gt: '' } })).status).toBe(400);
		expect((await review(beerId, alice, { rating: 3, comment: 'x'.repeat(1000) })).status).toBe(200);
	});

	it('requires a session and blocks banned users', async () => {
		const anon = await request(app).put(`/api/beers/${beerId}/reviews/me`).send({ rating: 3 });
		expect(anon.status).toBe(401);
		expect((await review(beerId, banned, { rating: 3 })).status).toBe(403);
	});

	it('returns 404 for a missing or malformed beer id', async () => {
		expect((await review('64b000000000000000000000', alice, { rating: 3 })).status).toBe(404);
		expect((await review('not-an-id', alice, { rating: 3 })).status).toBe(404);
	});
});

describe('reading reviews', () => {
	it('lists reviews newest first with pagination and only public fields', async () => {
		const { _id: beerId } = await createBeer();
		await review(beerId, alice, { rating: 2, comment: 'Meh' });
		await review(beerId, bob, { rating: 5, comment: 'Great' });

		const res = await request(app).get(`/api/beers/${beerId}/reviews?limit=2&page=1`);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ currentPage: 1, itemCount: 3, pageCount: 2, limitPerPage: 2 });
		expect(names(res.body)).toEqual(['Bob', 'Alice']);
		expect(Object.keys(res.body.results[0]).sort()).toEqual(
			['_id', 'beer', 'comment', 'createdAt', 'rating', 'updatedAt', 'user', 'userName'].sort()
		);

		const page2 = await request(app).get(`/api/beers/${beerId}/reviews?limit=2&page=2`);
		expect(names(page2.body)).toEqual(['Owner']);
	});

	it('caps the page size and ignores bad paging values', async () => {
		const { _id: beerId } = await createBeer();
		let res = await request(app).get(`/api/beers/${beerId}/reviews?limit=1000`);
		expect(res.body.limitPerPage).toBe(50);
		res = await request(app).get(`/api/beers/${beerId}/reviews?limit=-1&page=abc`);
		expect(res.body).toMatchObject({ currentPage: 1, limitPerPage: 10 });
	});

	it('returns the signed-in user review or null', async () => {
		const { _id: beerId } = await createBeer();
		const mine = await request(app).get(`/api/beers/${beerId}/reviews/me`).set(as(owner));
		expect(mine.body).toMatchObject({ rating: 4 });
		const none = await request(app).get(`/api/beers/${beerId}/reviews/me`).set(as(alice));
		expect(none.status).toBe(200);
		expect(none.body).toBeNull();
		expect((await request(app).get(`/api/beers/${beerId}/reviews/me`)).status).toBe(401);
	});
});

describe('deleting reviews', () => {
	let beerId: string;
	let aliceReviewId: string;
	beforeEach(async () => {
		beerId = (await createBeer())._id;
		aliceReviewId = (await review(beerId, alice, { rating: 2 })).body.review._id;
	});

	const remove = (id: string, user: TestUser, bid = beerId) =>
		request(app).delete(`/api/beers/${bid}/reviews/${id}`).set(as(user));

	it('lets the author delete their own review', async () => {
		const res = await remove('me', alice);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ratingAvg: 4, ratingCount: 1 });
		expect((await remove('me', alice)).status).toBe(404);
	});

	it('forbids deleting a review written by someone else', async () => {
		const res = await remove(aliceReviewId, bob);
		expect(res.status).toBe(403);
		expect(await Review.countDocuments({ beer: beerId })).toBe(2);
	});

	it('lets an admin delete any review and the author delete by id', async () => {
		let res = await remove(aliceReviewId, admin);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ratingAvg: 4, ratingCount: 1 });

		const again = await review(beerId, alice, { rating: 1 });
		res = await remove(again.body.review._id, alice);
		expect(res.status).toBe(200);
	});

	it('resets the average when the last review is removed', async () => {
		await remove('me', alice);
		const res = await remove('me', owner);
		expect(res.body).toMatchObject({ ratingAvg: 0, ratingCount: 0 });
	});

	it('does not delete a review through another beer id', async () => {
		const other = await createBeer(bob);
		expect((await remove(aliceReviewId, admin, other._id)).status).toBe(404);
		expect((await remove('bad-id', admin)).status).toBe(404);
	});

	it('removes reviews when the beer is deleted', async () => {
		const res = await request(app).delete(`/api/beers/${beerId}`).set(as(owner));
		expect(res.status).toBe(200);
		expect(await Review.countDocuments({ beer: beerId })).toBe(0);
	});
});

describe('updating beers', () => {
	it('ignores cached rating fields and owner changes in the body', async () => {
		const { _id: beerId } = await createBeer();
		const res = await request(app)
			.put(`/api/beers/${beerId}`)
			.set(as(owner))
			.send({ name: 'Pils 2', ratingAvg: 5, ratingCount: 999, user: bob.id });

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ name: 'Pils 2', ratingAvg: 4, ratingCount: 1 });
		expect(res.body.user).toBe(owner.id);
	});

	it('updates the editor review when a rating is sent', async () => {
		const { _id: beerId } = await createBeer();
		const res = await request(app).put(`/api/beers/${beerId}`).set(as(owner)).send({ rating: 2 });
		expect(res.body).toMatchObject({ ratingAvg: 2, ratingCount: 1 });
	});
});
