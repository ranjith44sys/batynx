const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");

const USERS_DIR = path.resolve(__dirname, "../../storage/users");

/**
 * Service to manage traditional user authentication data.
 */
class UserService {
    static async init() {
        await fs.ensureDir(USERS_DIR);
    }

    static async createUser({ name, email, phone, password }) {
        await this.init();

        const userPath = path.join(USERS_DIR, `${email.toLowerCase()}.json`);

        if (await fs.pathExists(userPath)) {
            throw new Error("User already exists with this email");
        }

        const hashedPassword = this.hashPassword(password);

        const userData = {
            name,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        await fs.outputJson(userPath, userData);

        // Return user without password
        const { password: _, ...userWithoutPassword } = userData;
        return userWithoutPassword;
    }

    static async validateUser(email, password) {
        await this.init();

        const userPath = path.join(USERS_DIR, `${email.toLowerCase()}.json`);

        if (!await fs.pathExists(userPath)) {
            throw new Error("Invalid email or password");
        }

        const userData = await fs.readJson(userPath);
        const hashedPassword = this.hashPassword(password);

        if (userData.password !== hashedPassword) {
            throw new Error("Invalid email or password");
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = userData;
        return userWithoutPassword;
    }

    static hashPassword(password) {
        return crypto.createHash("sha256").update(password).digest("hex");
    }
}

module.exports = UserService;
