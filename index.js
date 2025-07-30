import express from 'express';
import mongoDb from './db.js';
import userRouter from "./routes.js";
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
await mongoDb()

app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'Authorization'] }))
app.use('/api/webhook/razorpay', express.raw({ type: 'application/json' })); // mount raw route
app.use(express.json())

app.use('/api', userRouter);
// app.use('/api/payment/webhook', express.json({
//     verify: (req, res, buf) => {
//         req.rawBody = buf;
//     }
// }));


app.listen(port, () => {
    console.log(`server is running on port = ${port}`);
})


