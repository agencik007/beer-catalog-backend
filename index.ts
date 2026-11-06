import express, { json, Router } from 'express';
import cors from 'cors';
import 'express-async-errors';
import { connectDB } from './config/dbConnection';
import rateLimit from 'express-rate-limit';
import { beerRouter } from './routes/beerRouter';
import { handleError } from './middleware/errorMiddleware';
import { userRouter } from './routes/userRouter';
import 'dotenv/config';

connectDB();

const app = express();

// CORS: allow local dev (CRA/Vite) or comma-separated list in CORS_ORIGINS
const defaultAllowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];
const allowedOrigins = (process.env.CORS_ORIGINS || '')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);
app.use(
	cors({
		origin: (origin, callback) => {
			// allow requests with no origin like mobile apps or curl
			if (!origin) return callback(null, true);
			const origins = allowedOrigins.length ? allowedOrigins : defaultAllowedOrigins;
			if (origins.includes(origin)) {
				return callback(null, true);
			}
			return callback(new Error('Not allowed by CORS'));
		},
		credentials: true,
	})
);

app.use(json());

app.use(express.urlencoded({ extended: false }));

app.use(
	rateLimit({
		windowMs: 5 * 60 * 1000, // 15 minutes
		limit: 100, // Limit each IP to 100 requests per `window`
		standardHeaders: true,
		legacyHeaders: false,
	})
);

const router = Router();

router.use('/beers', beerRouter);
router.use('/users', userRouter);

app.use('/api', router);

app.use(handleError);

const port = Number(process.env.PORT) || 5000;
app.listen(port, () =>
	console.log(`Server started http://localhost:${port}`)
);
