require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const companyRoutes = require("./routes/companyRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

app.use("/auth", authRoutes);
app.use("/", studentRoutes);
app.use("/", uploadRoutes);
app.use("/api/company", companyRoutes);

app.listen(3001, () => {
  console.log("🚀 Server running at http://localhost:3001");
});
