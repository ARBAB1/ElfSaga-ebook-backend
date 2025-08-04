const fs = require("fs");
const path = require("path");
const db = require("../config/db");
// const redis = require("../config/redisClient");
const { v4: uuidv4 } = require("uuid");

// exports.uploadVideoAndThumbnail = async (req, res) => {
//   let { fileId, chunkIndex, totalChunks } = req.body;
//   if (!fileId) fileId = uuidv4();

//   const chunkDir = path.join(__dirname, "../temp", fileId);
//   const uploadDir = path.join(__dirname, "../uploads");
//   const thumbDir = path.join(__dirname, "../thumbnails");
//   const fileName = `${fileId}.mp4`;
//   const filePath = path.join(uploadDir, fileName);

//   fs.mkdirSync(chunkDir, { recursive: true });
//   fs.mkdirSync(uploadDir, { recursive: true });
//   fs.mkdirSync(thumbDir, { recursive: true });

//   // Process chunk (if exists)
//   if (req.files && req.files.chunk) {
//     const chunkFile = path.join(chunkDir, `${chunkIndex}`);
//     fs.writeFileSync(chunkFile, req.files.chunk[0].buffer);
//     await redis.sAdd(`upload:${fileId}`, chunkIndex);
//     await redis.expire(`upload:${fileId}`, 3600);
//   }

//   // Process thumbnail (if exists)
//   if (req.files && req.files.thumbnail) {
//     const thumbPath = `${fileId}_thumb_${Date.now()}.jpg`;
//     const dest = path.join(thumbDir, thumbPath);
//     fs.writeFileSync(dest, req.files.thumbnail[0].buffer);
//     await redis.set(`thumb:${fileId}`, thumbPath);
//     await redis.expire(`thumb:${fileId}`, 3600);
//   }

//   // Check chunk completion
//   const received = await redis.sMembers(`upload:${fileId}`);
//   if (totalChunks && received.length === parseInt(totalChunks)) {
//     const writeStream = fs.createWriteStream(filePath);
//     for (let i = 0; i < totalChunks; i++) {
//       const chunk = fs.readFileSync(path.join(chunkDir, `${i}`));
//       writeStream.write(chunk);
//     }
//     writeStream.end();
//     fs.rmSync(chunkDir, { recursive: true });
//     await redis.del(`upload:${fileId}`);

//     const thumbPath = await redis.get(`thumb:${fileId}`);
//     await redis.del(`thumb:${fileId}`);

//     db.query(
//       "INSERT INTO videos (file_id, file_path, thumbnail_path) VALUES (?, ?, ?)",
//       [fileId, fileName, thumbPath || null],
//       (err) => {
//         if (err) return res.status(500).json({ message: "DB insert error" });
//         res.status(200).json({
//           message: "Upload complete",
//           fileId,
//           video: `/uploads/${fileName}`,
//           thumbnail: thumbPath ? `/thumbnails/${thumbPath}` : null,
//         });
//       }
//     );
//   } else {
//     res.status(200).json({
//       message: "Chunk or thumbnail uploaded, waiting for more",
//       fileId,
//     });
//   }
// };

exports.uploadVideoAndThumbnail = async (req, res) => {
  let { fileId, chunkIndex, totalChunks, paid_flag } = req.body;

  // Default fileId if not provided
  if (!fileId) fileId = uuidv4();

  const chunkDir = path.join(__dirname, "../temp", fileId);
  const uploadDir = path.join(__dirname, "../uploads");
  const thumbDir = path.join(__dirname, "../thumbnails");
  const fileName = `${fileId}.mp4`;
  const filePath = path.join(uploadDir, fileName);

  fs.mkdirSync(chunkDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(thumbDir, { recursive: true });

  // Save chunk
  if (req.files && req.files.chunk) {
    const chunkFile = path.join(chunkDir, `${chunkIndex}`);
    fs.writeFileSync(chunkFile, req.files.chunk[0].buffer);
  }

  // Save thumbnail if uploaded
  let thumbnailPath = null;
  if (req.files && req.files.thumbnail) {
    const thumbName = `${fileId}_thumb_${Date.now()}.jpg`;
    const dest = path.join(thumbDir, thumbName);
    fs.writeFileSync(dest, req.files.thumbnail[0].buffer);
    thumbnailPath = thumbName;

    // Save thumbnail path temporarily in a text file
    fs.writeFileSync(path.join(chunkDir, "thumbnail.txt"), thumbName);
  }

  // Check if all chunks are received
  const uploadedChunks = fs
    .readdirSync(chunkDir)
    .filter((name) => !name.endsWith(".txt"));

  if (totalChunks && uploadedChunks.length === parseInt(totalChunks)) {
    const writeStream = fs.createWriteStream(filePath);

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `${i}`);
      const chunk = fs.readFileSync(chunkPath);
      writeStream.write(chunk);
    }

    writeStream.end();

    // Read thumbnail if saved
    const thumbFilePath = path.join(chunkDir, "thumbnail.txt");
    if (fs.existsSync(thumbFilePath)) {
      thumbnailPath = fs.readFileSync(thumbFilePath, "utf-8");
    }

    // Cleanup temp
    fs.rmSync(chunkDir, { recursive: true });

    // Insert into DB (handling `paid_flag`)
    const paidFlagValue = paid_flag === "true" ? 1 : 0; // Ensure the paid_flag is either 1 or 0
    db.query(
      "INSERT INTO videos (file_id, file_path, thumbnail_path, paid_flag) VALUES (?, ?, ?, ?)",
      [fileId, fileName, thumbnailPath || null, paidFlagValue],
      (err) => {
        if (err) return res.status(500).json({ message: "DB insert error" });

        res.status(200).json({
          message: "Upload complete",
          fileId,
          video: `/uploads/${fileName}`,
          thumbnail: thumbnailPath ? `/thumbnails/${thumbnailPath}` : null,
          paid_flag: paidFlagValue === 1, // Convert to boolean for response
        });
      }
    );
  } else {
    res.status(200).json({
      message: "Chunk or thumbnail uploaded, waiting for more",
      fileId,
    });
  }
};

exports.getAllVideos = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const paidFlag = req.query.paid; // Get the 'paid' flag from query parameter
  let paidCondition = ""; // Default condition if no paid flag is provided
  let queryParams = [limit, offset];

  if (paidFlag === "true") {
    paidCondition = "AND paid_flag = 1"; // Condition for paid videos
  } else if (paidFlag === "false") {
    paidCondition = "AND paid_flag = 0"; // Condition for free videos
  }

  // Get total count of videos with the paid flag condition
  db.query(
    `SELECT COUNT(*) as total FROM videos WHERE 1=1 ${paidCondition}`,
    queryParams,
    (countErr, countResult) => {
      if (countErr) return res.status(500).json({ message: "DB count error" });
      const total = countResult[0].total;

      // Get the list of videos with the paid flag condition
      db.query(
        `SELECT file_id, file_path, thumbnail_path, paid_flag, created_at FROM videos WHERE 1=1 ${paidCondition} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        queryParams,
        (err, results) => {
          if (err) return res.status(500).json({ message: "DB fetch error" });

          res.status(200).json({
            total,
            page,
            limit,
            videos: results.map((row) => ({
              fileId: row.file_id,
              video: `/uploads/${row.file_path}`,
              thumbnail: row.thumbnail_path
                ? `/thumbnails/${row.thumbnail_path}`
                : null,
              paid_flag: row.paid_flag === 1, // Converting the paid_flag into a boolean
              createdAt: row.created_at,
            })),
          });
        }
      );
    }
  );
};

exports.deleteVideo = (req, res) => {
  const { fileId } = req.params;
  db.query(
    "SELECT file_path, thumbnail_path FROM videos WHERE file_id = ?",
    [fileId],
    (err, results) => {
      if (err || results.length === 0)
        return res.status(404).json({ message: "Video not found" });

      const { file_path, thumbnail_path } = results[0];
      if (file_path)
        fs.rmSync(path.join(__dirname, "../uploads", file_path), {
          force: true,
        });
      if (thumbnail_path)
        fs.rmSync(path.join(__dirname, "../thumbnails", thumbnail_path), {
          force: true,
        });

      db.query("DELETE FROM videos WHERE file_id = ?", [fileId], (delErr) => {
        if (delErr) return res.status(500).json({ message: "Delete failed" });
        res.status(200).json({ message: "Video and thumbnail deleted" });
      });
    }
  );
};

exports.updateVideo = (req, res) => {
  const { fileId } = req.body;
  if (!req.file)
    return res.status(400).json({ message: "No video file provided" });

  const fileName = `${fileId}_updated_${Date.now()}.mp4`;
  const filePath = path.join(__dirname, "../uploads", fileName);
  fs.writeFileSync(filePath, req.file.buffer);

  db.query(
    "UPDATE videos SET file_path = ? WHERE file_id = ?",
    [fileName, fileId],
    (err) => {
      if (err) return res.status(500).json({ message: "DB update failed" });
      res
        .status(200)
        .json({ message: "Video updated", video: `/uploads/${fileName}` });
    }
  );
};

exports.updateThumbnail = (req, res) => {
  const { fileId } = req.body;
  if (!req.file)
    return res.status(400).json({ message: "No thumbnail file provided" });

  const thumbPath = `${fileId}_thumb_updated_${Date.now()}.jpg`;
  const filePath = path.join(__dirname, "../thumbnails", thumbPath);
  fs.writeFileSync(filePath, req.file.buffer);

  db.query(
    "UPDATE videos SET thumbnail_path = ? WHERE file_id = ?",
    [thumbPath, fileId],
    (err) => {
      if (err) return res.status(500).json({ message: "DB update failed" });
      res.status(200).json({
        message: "Thumbnail updated",
        thumbnail: `/thumbnails/${thumbPath}`,
      });
    }
  );
};
