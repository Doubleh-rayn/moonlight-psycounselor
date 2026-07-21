// api/_lib/auth.js
// 세션 쿠키를 Redis의 세션 토큰과 대조해 로그인 여부를 확인합니다.

const { getClient } = require("./redis");
const { parseCookies } = require("./cookies");

const SESSION_COOKIE = "admin_session";

async function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return false;
  const client = await getClient();
  const exists = await client.get(`session:${token}`);
  return Boolean(exists);
}

module.exports = { isAuthenticated, SESSION_COOKIE };
