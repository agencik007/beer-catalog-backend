/**
 * Migrates accounts from the legacy `users` collection (custom JWT auth)
 * into Better Auth collections (`user` + `account`).
 *
 * - keeps the same `_id`, so `beer.user` references stay valid
 * - keeps the bcrypt password hash, so users log in with their old password
 * - marks emails as verified, so existing users are not locked out
 * - idempotent: already migrated users are skipped
 *
 * Usage: npm run migrate:users -- [--dry-run]
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

interface LegacyUser {
	_id: ObjectId;
	name?: string;
	email: string;
	password: string;
	role?: string;
	createdAt?: Date;
	updatedAt?: Date;
}

const dryRun = process.argv.includes('--dry-run');

const main = async () => {
	if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set.');

	const client = await MongoClient.connect(process.env.MONGO_URI);
	const db = client.db();
	const legacyUsers = db.collection<LegacyUser>('users');
	const users = db.collection('user');
	const accounts = db.collection('account');

	try {
		const legacy = await legacyUsers.find().toArray();
		console.log(`Found ${legacy.length} legacy user(s) in "users".${dryRun ? ' (dry run)' : ''}`);

		// Better Auth stores emails lowercased; detect collisions first
		const byEmail = new Map<string, LegacyUser[]>();
		for (const u of legacy) {
			const email = u.email.trim().toLowerCase();
			byEmail.set(email, [...(byEmail.get(email) ?? []), u]);
		}
		const duplicates = [...byEmail.entries()].filter(([, list]) => list.length > 1);
		if (duplicates.length) {
			console.error('Duplicate emails after lowercasing, resolve them manually first:');
			for (const [email, list] of duplicates) {
				console.error(`  ${email}: ${list.map((u) => u._id.toHexString()).join(', ')}`);
			}
			process.exitCode = 1;
			return;
		}

		let migrated = 0;
		let skipped = 0;

		for (const u of legacy) {
			const email = u.email.trim().toLowerCase();
			const existing = await users.findOne({ $or: [{ _id: u._id }, { email }] });
			if (existing) {
				if (!existing._id.equals(u._id)) {
					console.warn(`  ! ${email}: a different Better Auth user already uses this email, skipping.`);
				}
				skipped++;
				continue;
			}

			const now = new Date();
			const role = u.role === 'admin' ? 'admin' : 'user';
			console.log(`  + ${email} (${role})`);
			migrated++;
			if (dryRun) continue;

			await users.insertOne({
				_id: u._id,
				name: u.name || email.split('@')[0],
				email,
				emailVerified: true,
				image: null,
				role,
				banned: false,
				createdAt: u.createdAt ?? now,
				updatedAt: u.updatedAt ?? now,
			});

			await accounts.updateOne(
				{ userId: u._id, providerId: 'credential' },
				{
					$setOnInsert: {
						accountId: u._id.toHexString(),
						providerId: 'credential',
						userId: u._id,
						password: u.password,
						createdAt: now,
						updatedAt: now,
					},
				},
				{ upsert: true }
			);
		}

		console.log(`Done. ${dryRun ? 'Would migrate' : 'Migrated'}: ${migrated}, skipped: ${skipped}.`);
		if (!dryRun && migrated) {
			console.log('The legacy "users" collection was left untouched as a backup.');
		}
	} finally {
		await client.close();
	}
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
