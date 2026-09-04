import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import { User } from './user.js';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // No token, unauthorized
    if (!token) return res.sendStatus(401);

    jwt.verify(
        token,
        process.env.SECRET_KEY,
        (err, user) => {
            // Token invalid, forbidden
            if (err) {
                return res.status(401).json({
                    success: false,
                    message: err.stack,
                });
            }
            req.user = user;
            next();
        });
}

export async function authorizeAdmin(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized access. No user identified." });
        }

        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
        }

        req.adminUser = user;
        next();
    } catch (err) {
        return res.status(500).json({ success: false, message: `Authorization failed: ${err.message}` });
    }
}

export default authenticateToken;

