import { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';

// Requires a valid Better Auth session (Bearer token or session cookie)
export const protect = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});

		if (!result) {
			res.status(401).json({ message: 'Not authorized.' });
			return;
		}

		if (result.user.banned) {
			res.status(403).json({ message: 'Account is banned.' });
			return;
		}

		req.user = result.user;
		req.session = result.session;
		next();
	} catch (error) {
		next(error);
	}
};

// Use after `protect`
export const requireRole =
	(...roles: string[]) =>
	(req: Request, res: Response, next: NextFunction) => {
		const userRoles = (req.user?.role ?? '').split(',').map((r) => r.trim());
		if (!roles.some((role) => userRoles.includes(role))) {
			res.status(403).json({ message: 'Forbidden.' });
			return;
		}
		next();
	};

export const isAdmin = (req: Request) =>
	(req.user?.role ?? '')
		.split(',')
		.map((r) => r.trim())
		.includes('admin');
