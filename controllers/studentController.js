const db = require("../config/db");
const refreshTokens = require("../controllers/authController").refresh;
exports.getStudents = (req, res) => {
  db.query("SELECT * FROM students", (err, results) => {
    if (err) return res.status(500).send(err);
    res.json({
      students: results,
      newAccessToken: req.newAccessToken || null, // new token added from middleware
    });
  });
};

exports.addStudent = (req, res) => {
  const { name, class_name, section, total_marks } = req.body;
  db.query(
    "INSERT INTO students (name, class_name, section, total_marks) VALUES (?, ?, ?, ?)",
    [name, class_name, section, total_marks],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({ id: result.insertId });
    }
  );
};

exports.updateStudent = (req, res) => {
  const { id } = req.params;
  const { name, class_name, section, total_marks } = req.body;
  db.query(
    "UPDATE students SET name=?, class_name=?, section=?, total_marks=? WHERE id=?",
    [name, class_name, section, total_marks, id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Updated successfully" });
    }
  );
};
