const express = require("express");
const router = express.Router();
const companyController = require("../controllers/companyController");

// Order matters: static routes before dynamic ones
router.post("/create", companyController.create);
router.get("/allVideos", companyController.allVideos);
router.get("/getAll", companyController.getAll);
router.get("/search", companyController.search); // MOVE ABOVE
router.get("/check-username", companyController.checkUsername);
router.get("/freeVideos", companyController.freeVideos);
router.get("/paidVideos", companyController.paidVideos);


router.put("/update/:id", companyController.update);
router.delete("/delete/:id", companyController.delete);
router.get("/:id", companyController.getById); // KEEP THIS LAST

module.exports = router;
