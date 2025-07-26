const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const redis = require("../config/redisClient");
const { v4: uuidv4 } = require("uuid");

exports.uploadVideoAndThumbnail = async (req, res) => {
  let { fileId, chunkIndex, totalChunks } = req.body;
  if (!fileId) fileId = uuidv4();

  const chunkDir = path.join(__dirname, "../temp", fileId);
  const uploadDir = path.join(__dirname, "../uploads");
  const thumbDir = path.join(__dirname, "../thumbnails");
  const fileName = `${fileId}.mp4`;
  const filePath = path.join(uploadDir, fileName);

  fs.mkdirSync(chunkDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(thumbDir, { recursive: true });

  // Process chunk (if exists)
  if (req.files && req.files.chunk) {
    const chunkFile = path.join(chunkDir, `${chunkIndex}`);
    fs.writeFileSync(chunkFile, req.files.chunk[0].buffer);
    await redis.sAdd(`upload:${fileId}`, chunkIndex);
    await redis.expire(`upload:${fileId}`, 3600);
  }

  // Process thumbnail (if exists)
  if (req.files && req.files.thumbnail) {
    const thumbPath = `${fileId}_thumb_${Date.now()}.jpg`;
    const dest = path.join(thumbDir, thumbPath);
    fs.writeFileSync(dest, req.files.thumbnail[0].buffer);
    await redis.set(`thumb:${fileId}`, thumbPath);
    await redis.expire(`thumb:${fileId}`, 3600);
  }

  // Check chunk completion
  const received = await redis.sMembers(`upload:${fileId}`);
  if (totalChunks && received.length === parseInt(totalChunks)) {
    const writeStream = fs.createWriteStream(filePath);
    for (let i = 0; i < totalChunks; i++) {
      const chunk = fs.readFileSync(path.join(chunkDir, `${i}`));
      writeStream.write(chunk);
    }
    writeStream.end();
    fs.rmSync(chunkDir, { recursive: true });
    await redis.del(`upload:${fileId}`);

    const thumbPath = await redis.get(`thumb:${fileId}`);
    await redis.del(`thumb:${fileId}`);

    db.query(
      "INSERT INTO videos (file_id, file_path, thumbnail_path) VALUES (?, ?, ?)",
      [fileId, fileName, thumbPath || null],
      (err) => {
        if (err) return res.status(500).json({ message: "DB insert error" });
        res.status(200).json({
          message: "Upload complete",
          fileId,
          video: `/uploads/${fileName}`,
          thumbnail: thumbPath ? `/thumbnails/${thumbPath}` : null,
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

  db.query("SELECT COUNT(*) as total FROM videos", (countErr, countResult) => {
    if (countErr) return res.status(500).json({ message: "DB count error" });
    const total = countResult[0].total;
    db.query(
      "SELECT file_id, file_path, thumbnail_path, created_at FROM videos ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset],
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
            createdAt: row.created_at,
          })),
        });
      }
    );
  });
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
