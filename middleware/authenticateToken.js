const jwt = require("jsonwebtoken");

module.exports = function authenticateToken(req, res, next) {
    const token = req.cookies.refreshToken; // ✅ from cookie

    if (!token) return res.status(401).json({ message: "No token provided" });

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });

        req.user = user;
        next();
    });
};
