// api/_lib/auth.js
// 세션 쿠키를 Vercel KV의 세션 토큰과 대조해 로그인 여부를 확인합니다.

const { kv } = require("@vercel/kv");
const { parseCookies } = require("./cookies");

const SESSION_COOKIE = "admin_session";

async function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return false;
  const exists = await kv.get(`session:${token}`);
  return Boolean(exists);
}

module.exports = { isAuthenticated, SESSION_COOKIE };
