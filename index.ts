import 'dotenv/config';
import express, { json, Router } from 'express';
import cors from 'cors';
import 'express-async-errors';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { connectDB } from './config/dbConnection.js';
import { getAllowedOrigins } from './config/origins.js';
import { auth } from './lib/auth.js';
import { beerRouter } from './routes/beerRouter.js';
import { handleError } from './middleware/errorMiddleware.js';

connectDB();

const app = express();

// Render and similar hosts sit behind a proxy; needed for correct client IPs in rate limiting
app.set('trust proxy', 1);

const allowedOrigins = getAllowedOrigins();
app.use(
	cors({
		origin: (origin, callback) => {
			// allow requests with no origin like mobile apps or curl
			if (!origin) return callback(null, true);
			if (allowedOrigins.includes(origin)) {
				return callback(null, true);
			}
			return callback(new Error('Not allowed by CORS'));
		},
		credentials: true,
		// Better Auth bearer plugin returns the session token in this header
		exposedHeaders: ['set-auth-token'],
	})
);

app.use(
	rateLimit({
		windowMs: 5 * 60 * 1000, // 5 minutes
		limit: 100, // Limit each IP to 100 requests per `window`
		standardHeaders: true,
		legacyHeaders: false,
	})
);

// Better Auth must be mounted before body parsers (Express v4 wildcard syntax)
app.all('/api/auth/*', toNodeHandler(auth));

app.use(json());

app.use(express.urlencoded({ extended: false }));

const router = Router();

router.use('/beers', beerRouter);

app.use('/api', router);

app.use(handleError);

const port = Number(process.env.PORT) || 5000;
app.listen(port, () =>
	console.log(`Server started http://localhost:${port}`)
);
