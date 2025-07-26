const mysql = require("mysql2");
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "studentdb",
  port: 8889,
});
db.connect((err) => {
  if (err) throw err;
  console.log("✅ MySQL Connected");
});
module.exports = db;
