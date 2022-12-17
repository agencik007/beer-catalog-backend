import { NextFunction, Request, Response } from 'express';

export class ValidationError extends Error {}

export const handleError = (
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const statusCode = res.statusCode ? res.statusCode : 500;

	res.status(statusCode);

	res.json({
		message:
			err instanceof ValidationError
				? err.message
				: 'Sorry, please try again later.',
		stack: process.env.NODE_ENV === 'production' ? null : err.stack,
	});
};
