import 'dotenv/config';
import { connectDB } from './config/dbConnection.js';
import { app } from './app.js';

connectDB();

const port = Number(process.env.PORT) || 5000;
app.listen(port, () =>
	console.log(`Server started http://localhost:${port}`)
);
