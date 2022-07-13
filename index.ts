const path = require('path');
import express, {json, Router} from 'express';
import cors from 'cors';
import 'express-async-errors';
import {connectDB} from "./config/dbConnection";
import rateLimit from 'express-rate-limit';
import {beerRouter} from "./routes/beerRouter";
import {handleError} from "./middleware/errorMiddleware";
import 'dotenv/config';
import {userRouter} from "./routes/userRouter";
const port = process.env.PORT || 5000;

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
router.use('/users', userRouter);

app.use('/api', router);

// Serve frontend
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/build')));

    app.get('*', (req, res) => res.sendFile(path.resolve(__dirname, '../', 'frontend', 'build', 'index.html')))
} else {
    app.get('/', (req, res) => res.send('Please set to production'));
}

app.use(handleError);

app.listen(port, () => console.log(`Server started on port ${port}`));