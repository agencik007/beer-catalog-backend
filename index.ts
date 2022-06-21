import express, {json, Router} from 'express';
import cors from 'cors';
import 'express-async-errors';

import {connectDB} from "./config/db";
import rateLimit from 'express-rate-limit';
import {beerRouter} from "./routes/beerRouter";
import {handleError} from "./utlis/errors";
import 'dotenv/config';

(async () => {
    await connectDB();
})();

const app = express();

app.use(cors({
    origin: 'http://localhost:3000'
}));

app.use(json());

app.use(express.urlencoded({extended: false}));

app.use(rateLimit({
    windowMs: 5 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
}));

const router = Router();

router.use('/beers', beerRouter);

app.use('/api', router);

app.use(handleError);

app.listen(3001, '0.0.0.0', () => {
    console.log('Listening on http://localhost:3001');
});