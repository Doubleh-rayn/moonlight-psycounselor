// api/_lib/redis.js
// Vercel의 Redis 통합(REDIS_URL)에 연결하는 공용 클라이언트.
// 서버리스 함수가 재사용될 때 연결도 재사용되도록 모듈 스코프에 캐시합니다.

const { createClient } = require("redis");

let clientPromise = null;

function getClient() {
  if (!clientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (err) => console.error("Redis Client Error", err));
    clientPromise = client.connect().then(() => client);
  }
  return clientPromise;
}

module.exports = { getClient };
