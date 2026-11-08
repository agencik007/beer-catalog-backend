import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { admin, bearer } from 'better-auth/plugins';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { getAllowedOrigins } from '../config/origins.js';
import { actionEmailHtml, sendEmail } from './email.js';

const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.MONGO_URI) {
	throw new Error('MONGO_URI is not set.');
}

// Separate native driver client for Better Auth; mongoose keeps handling the Beer model.
export const mongoClient = new MongoClient(process.env.MONGO_URI);
const db = mongoClient.db();

// Transactions require a replica set (e.g. MongoDB Atlas). A standalone local server does not support them.
const useTransactions = process.env.MONGO_TRANSACTIONS === 'true';

const socialProviders = {
	...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
		? {
				google: {
					clientId: process.env.GOOGLE_CLIENT_ID,
					clientSecret: process.env.GOOGLE_CLIENT_SECRET,
				},
			}
		: {}),
	...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
		? {
				github: {
					clientId: process.env.GITHUB_CLIENT_ID,
					clientSecret: process.env.GITHUB_CLIENT_SECRET,
				},
			}
		: {}),
};

export const auth = betterAuth({
	appName: 'Beer Catalog',
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	trustedOrigins: getAllowedOrigins(),
	database: mongodbAdapter(db, useTransactions ? { client: mongoClient } : undefined),

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		minPasswordLength: 8,
		revokeSessionsOnPasswordReset: true,
		// bcrypt keeps password hashes created by the previous auth system valid
		password: {
			hash: (password) => bcrypt.hash(password, 10),
			verify: ({ hash, password }) => bcrypt.compare(password, hash),
		},
		sendResetPassword: async ({ user, url }) => {
			// Not awaited on purpose: avoids leaking account existence through response timing
			void sendEmail({
				to: user.email,
				subject: 'Reset your password',
				html: actionEmailHtml(
					'Reset your password',
					'Click the link below to set a new password. It expires in 1 hour.',
					url
				),
				link: url,
			}).catch((err) => console.error(err));
		},
	},

	emailVerification: {
		sendOnSignUp: true,
		// Unverified (e.g. migrated) users get a fresh verification link when they try to sign in
		sendOnSignIn: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			void sendEmail({
				to: user.email,
				subject: 'Verify your email address',
				html: actionEmailHtml(
					'Welcome to Beer Catalog!',
					'Click the link below to verify your email address.',
					url
				),
				link: url,
			}).catch((err) => console.error(err));
		},
	},

	socialProviders,

	rateLimit: {
		enabled: true,
		window: 60,
		max: 100,
		customRules: {
			'/sign-in/email': { window: 60, max: 5 },
			'/sign-up/email': { window: 60, max: 3 },
			'/request-password-reset': { window: 300, max: 3 },
			'/send-verification-email': { window: 300, max: 3 },
		},
	},

	advanced: {
		// Frontend and backend live on different domains; the OAuth callback relies on a cross-site cookie
		...(isProduction
			? { defaultCookieAttributes: { sameSite: 'none' as const, secure: true } }
			: {}),
	},

	plugins: [bearer(), admin({ defaultRole: 'user', adminRoles: ['admin'] })],
});

export type Session = typeof auth.$Infer.Session;
