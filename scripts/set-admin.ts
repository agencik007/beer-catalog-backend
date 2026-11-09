/**
 * Grants (or revokes) the admin role for a Better Auth user.
 *
 * Usage: npm run set-admin -- <email> [--revoke]
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const main = async () => {
	const email = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
	const revoke = process.argv.includes('--revoke');

	if (!email) {
		console.error('Usage: npm run set-admin -- <email> [--revoke]');
		process.exit(1);
	}
	if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set.');

	const client = await MongoClient.connect(process.env.MONGO_URI);
	try {
		const role = revoke ? 'user' : 'admin';
		const result = await client
			.db()
			.collection('user')
			.updateOne(
				{ email: email.trim().toLowerCase() },
				{ $set: { role, updatedAt: new Date() } }
			);

		if (!result.matchedCount) {
			console.error(`User ${email} not found.`);
			process.exitCode = 1;
			return;
		}
		console.log(`User ${email} now has role "${role}".`);
	} finally {
		await client.close();
	}
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
