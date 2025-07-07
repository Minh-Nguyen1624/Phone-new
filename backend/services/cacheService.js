const redis = require("redis");
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});
client.on("error", (err) => console.error("Redis Client Error", err));

const getCachedReport = async (key) => {
  return new Promise((resolve, reject) => {
    client.get(key, (err, data) => {
      if (err) return reject(err);
      resolve(data ? JSON.parse(data) : null);
    });
  });
};

const setCachedReport = async (key, value, expiry = 3600) => {
  client.setex(key, expiry, JSON.stringify(value));
};

module.exports = { getCachedReport, setCachedReport };