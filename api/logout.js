// api/logout.js
// POST — 현재 세션을 KV에서 삭제하고 쿠키를 만료시킵니다.

const { kv } = require("@vercel/kv");
const { parseCookies, serializeCookie } = require("./_lib/cookies");
const { SESSION_COOKIE } = require("./_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 허용됩니다." });
    return;
  }

  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (token) {
    await kv.del(`session:${token}`);
  }

  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE, "", { maxAge: 0 }));
  res.status(200).json({ ok: true });
};
