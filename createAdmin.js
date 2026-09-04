import mongoDb from './db.js';
import { User } from './user.js';
import dotenv from 'dotenv';
dotenv.config();

const createOrPromoteAdmin = async () => {
    try {
        await mongoDb();

        const args = process.argv.slice(2);
        const email = (args[0] || process.env.ADMIN_EMAIL || 'admin@merndine.com').trim().toLowerCase();
        const password = (args[1] || process.env.ADMIN_PASSWORD || 'admin123').trim();
        const name = (args[2] || 'Mern Dine Admin').trim();
        const phone = Number(args[3] || 9999999999);

        let user = await User.findOne({ email });

        if (user) {
            user.role = 'admin';
            if (password) user.password = password;
            await user.save();
            console.log(`Successfully promoted existing user (${email}) to ADMIN role.`);
        } else {
            user = await User.create({
                name,
                email,
                password,
                phone_number: phone,
                location: 'Central Admin Office',
                role: 'admin'
            });
            console.log(`Successfully created new ADMIN user (${email}).`);
        }

        console.log(`
==========================================
ADMIN ACCOUNT READY
==========================================
Email:    ${email}
Password: ${password}
Role:     admin
==========================================
        `);
        process.exit(0);
    } catch (error) {
        console.error("Failed to create/promote admin user:", error);
        process.exit(1);
    }
};

createOrPromoteAdmin();
