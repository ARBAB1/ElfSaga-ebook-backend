const express = require("express");
const multer = require("multer");
const router = express.Router();
const uploadController = require("../controllers/uploadController");

const storage = multer.memoryStorage();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/upload",
  upload.fields([
    { name: "chunk", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadController.uploadVideoAndThumbnail
);
router.post(
  "/upload-thumbnail",
  upload.single("thumbnail"),
  uploadController.uploadVideoAndThumbnail
);
router.get("/videos", uploadController.getAllVideos);
router.delete("/video/:fileId", uploadController.deleteVideo);
router.put("/video", upload.single("video"), uploadController.updateVideo);
router.put(
  "/thumbnail",
  upload.single("thumbnail"),
  uploadController.updateThumbnail
);

module.exports = router;
