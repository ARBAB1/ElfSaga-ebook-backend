const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

let refreshTokens = [];

const generateAccessToken = (user) =>
  jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

const generateRefreshToken = (user) => {
  const token = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
  refreshTokens.push(token);
  return token;
};

exports.register = (req, res) => {
  const { username, password } = req.body;
  const hashed = bcrypt.hashSync(password, 10);
  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashed],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Registered successfully" });
    }
  );
};

exports.login = (req, res) => {
  const { username, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    (err, results) => {
      if (err || results.length === 0)
        return res.status(401).send("Invalid credentials");
      const user = results[0];
      if (!bcrypt.compareSync(password, user.password))
        return res.status(403).send("Wrong password");

      const userPayload = { id: user.id, username: user.username };
      const accessToken = generateAccessToken(userPayload);
      const refreshToken = generateRefreshToken(userPayload);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "strict",
      });
      res.json({ accessToken });
    }
  );
};

exports.refresh = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken || !refreshTokens.includes(refreshToken))
    return res.sendStatus(403);

  await jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    (err, user) => {
      if (err) return res.sendStatus(403);
      const newAccessToken = generateAccessToken({
        id: user.id,
        username: user.username,
      });
      // res.json({ accessToken: newAccessToken });
      req.newAccessToken = newAccessToken; // Store the new access token in the request object for further use
      next(); // Call next middleware or route handler
    }
  );
};

exports.sendToken = (req, res) => {
  res.json({
    newAccessToken: req.newAccessToken || null, // new token added from middleware
  });
};
exports.logout = (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({ message: "No refresh token found" });
  }

  // OPTIONAL: Remove from memory or DB if you track issued refresh tokens
  refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    sameSite: "Lax", // or 'Strict' depending on client/server origin
    path: "/auth", // Make sure it matches where you originally set the cookie
  });

  return res.status(200).json({ message: "Logged out successfully" });
};
