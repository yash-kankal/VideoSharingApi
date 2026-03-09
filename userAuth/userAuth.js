const jwt = require("jsonwebtoken");

require("dotenv").config();

function userAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        req.user = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

module.exports = userAuth;
