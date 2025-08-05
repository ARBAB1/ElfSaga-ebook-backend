require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const companyRoutes = require("./routes/companyRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
app.use(express.json());
app.use(cookieParser());
const allowedOrigins = [
  "https://talesfromthenorthpole.xyz",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Content-Disposition", "inline");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);
app.use("/thumbnails", express.static(path.join(__dirname, "thumbnails")));

app.use("/auth", authRoutes);
app.use("/", studentRoutes);
app.use("/", uploadRoutes);
app.use("/api/company", companyRoutes);

app.listen(3100, () => {
  console.log("🚀 Server running at http://localhost:3100");
});
