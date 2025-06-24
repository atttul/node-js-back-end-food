import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

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

export default authenticateToken;

