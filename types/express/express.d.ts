import type { Session } from '../../lib/auth.js';

declare global {
	namespace Express {
		interface Request {
			user?: Session['user'];
			session?: Session['session'];
		}
	}
}

export {};
