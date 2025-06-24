import express from 'express';
import mongoDb from './db.js';
import userRouter from "./routes.js";
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
await mongoDb()

app.use(express.json())
app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'Authorization'] }))

app.use('/api', userRouter);

app.listen(port, () => {
    console.log(`server is running on port = ${port}`);
})


