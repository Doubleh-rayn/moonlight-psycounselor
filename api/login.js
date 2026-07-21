// api/login.js
// POST { password } — 비밀번호가 맞으면 세션을 발급하고 쿠키를 내려줍니다.
// 비밀번호는 Vercel 프로젝트의 환경변수 ADMIN_PASSWORD에 설정합니다(코드에는 저장하지 않음).

const crypto = require("crypto");
const { getClient } = require("./_lib/redis");
const { serializeCookie } = require("./_lib/cookies");
const { SESSION_COOKIE } = require("./_lib/auth");

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7일
const MAX_ATTEMPTS = 8;
const LOCK_WINDOW_SECONDS = 10 * 60; // 10분

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({ error: "서버에 ADMIN_PASSWORD 환경변수가 설정되어 있지 않습니다." });
    return;
  }

  const client = await getClient();

  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  const attemptsKey = `login-attempts:${ip}`;
  const attempts = parseInt((await client.get(attemptsKey)) || "0", 10);
  if (attempts >= MAX_ATTEMPTS) {
    res.status(429).json({ error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." });
    return;
  }

  const { password } = req.body || {};
  if (typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "비밀번호를 입력해 주세요." });
    return;
  }

  if (password !== adminPassword) {
    await client.set(attemptsKey, String(attempts + 1), { EX: LOCK_WINDOW_SECONDS });
    res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    return;
  }

  await client.del(attemptsKey);

  const token = crypto.randomBytes(24).toString("hex");
  await client.set(`session:${token}`, "1", { EX: SESSION_TTL_SECONDS });

  res.setHeader(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL_SECONDS })
  );
  res.status(200).json({ ok: true });
};
