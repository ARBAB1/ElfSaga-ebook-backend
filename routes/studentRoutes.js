const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const authController = require("../controllers/authController");
const authenticateToken = require("../middleware/authenticateToken");

router.get("/students", authenticateToken, authController.refresh, studentController.getStudents);
router.post("/students", authenticateToken, studentController.addStudent);
router.put("/students/:id", authenticateToken, studentController.updateStudent);

module.exports = router;
