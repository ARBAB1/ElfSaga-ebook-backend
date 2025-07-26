const { createClient } = require("redis");
const redis = createClient();
redis.connect().then(() => console.log("✅ Redis Connected"));
module.exports = redis;
