const db = require("../config/db");

// CREATE
exports.create = async (req, res) => {
  const { name, email, phone, address, status, username, password } = req.body;
  try {
    db.query(
      "INSERT INTO companies (name, email, phone, address, status, username, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, email, phone, address, status || "active", username, password],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        res.status(201).json({
          id: result.insertId,
          name,
          email,
          phone,
          address,
          status,
          username,
          password,
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ALL with Pagination
exports.getAll = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  db.query(
    "SELECT COUNT(*) AS total FROM companies",
    (countErr, countResult) => {
      if (countErr) return res.status(500).json({ error: countErr.message });

      const total = countResult[0].total;

      db.query(
        "SELECT id, name, email, phone, address, status, username, password FROM companies LIMIT ? OFFSET ?",
        [limit, offset],
        (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });

          res.status(200).json({
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalRecords: total,
            data: rows,
          });
        }
      );
    }
  );
};

// UPDATE
exports.update = async (req, res) => {
  let { name, email, phone, address, username, password, status } = req.body;

  // Convert boolean to ENUM string
  status = status === true || status === "true" ? "active" : "inactive";

  db.query(
    "UPDATE companies SET name = ?, email = ?, phone = ?, address = ?, username = ?, password = ?, status = ?, updated_at = NOW() WHERE id = ?",
    [name, email, phone, address, username, password, status, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Company updated successfully" });
    }
  );
};

// DELETE
exports.delete = async (req, res) => {
  db.query(
    "DELETE FROM companies WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Company deleted successfully" });
    }
  );
};

// GET BY ID
exports.getById = async (req, res) => {
  const companyId = req.params.id;
  db.query(
    "SELECT id, name, email, phone, address, status, username, password FROM companies WHERE id = ?",
    [companyId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0)
        return res.status(404).json({ message: "Company not found" });

      res.json(rows[0]);
    }
  );
};

// SEARCH
exports.search = (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Missing search query" });

  db.query(
    "SELECT id, name, email, phone, address, status, username, password FROM companies WHERE name LIKE ?",
    [`%${query}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json(rows);
    }
  );
};

// CHECK IF USERNAME EXISTS
exports.checkUsername = (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: "Username is required" });

  db.query(
    "SELECT id FROM companies WHERE username = ?",
    [username],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json({ exists: rows.length > 0 });
    }
  );
};

// TOTAL COMPANIES
exports.freeVideos = (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM companies", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ total: rows[0].total });
  });
};

// ACTIVE COMPANIES
exports.paidVideos = (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM companies WHERE status = 'active'", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ total: rows[0].total });
  });
};

// TopTenCompanies
exports.allVideos = async (req, res) => {
  try {
    const query = `SELECT name, email FROM companies WHERE status = 'active' ORDER BY created_at DESC LIMIT 10`;
    db.query(query, (err, result) => {
      if (err) return res.status(500).json({ error: "DB error" });
      if (result.length === 0) return res.status(404).json({ message: "Company not found", status: 404 });
      res.status(200).json({ status: 200, data: result });
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
