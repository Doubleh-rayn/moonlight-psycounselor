// api/content.js
// GET  — 누구나 호출 가능. Vercel KV에 저장된 콘텐츠가 있으면 그것을, 없으면 data/content.json 기본값을 반환합니다.
// PUT  — 로그인(관리자 세션 쿠키)한 사용자만 호출 가능. 새 콘텐츠를 KV에 저장합니다.

const { kv } = require("@vercel/kv");
const { isAuthenticated } = require("./_lib/auth");
const defaultContent = require("../data/content.json");

const CONTENT_KEY = "content";

function readDefaultContent() {
  // 매 요청마다 같은 객체 참조를 돌려주지 않도록 얕은 복제
  return JSON.parse(JSON.stringify(defaultContent));
}

// 아주 가벼운 형태 검증: 최상위 필수 키가 모두 있는지만 확인합니다.
function isValidContent(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const requiredKeys = ["site", "nav", "about", "approaches", "works", "contact", "footer"];
  return requiredKeys.every((key) => key in body);
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const stored = await kv.get(CONTENT_KEY);
      const content = stored || readDefaultContent();
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(content);
    } catch (err) {
      // KV를 아직 연결하지 않은 상태(로컬 미리보기 등)에서도 사이트가 뜨도록 기본값으로 대체
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(readDefaultContent());
    }
    return;
  }

  if (req.method === "PUT") {
    const authed = await isAuthenticated(req);
    if (!authed) {
      res.status(401).json({ error: "로그인이 필요합니다." });
      return;
    }

    const body = req.body;
    if (!isValidContent(body)) {
      res.status(400).json({ error: "콘텐츠 형식이 올바르지 않습니다." });
      return;
    }

    await kv.set(CONTENT_KEY, body);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "GET 또는 PUT 요청만 허용됩니다." });
};
