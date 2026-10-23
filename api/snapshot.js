// api/snapshot.js
// 일별 방문자 수를 Vercel에서 받아 Redis에 누적 저장합니다.
//  - Vercel Cron이 매일 자동 호출합니다 (vercel.json 참고). 이때는 Authorization: Bearer <CRON_SECRET> 헤더가 붙습니다.
//  - 관리자 페이지의 "지금 저장" 버튼(로그인 세션)으로도 호출할 수 있습니다.
//  - ?days=30 처럼 지정하면 그 일수만큼 소급 저장합니다(기본 7일, 최대 30일).

const { isAuthenticated } = require("./_lib/auth");
const { getConfig, fetchDaily, saveDaily } = require("./_lib/analytics");

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "GET 또는 POST 요청만 허용됩니다." });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || "";
  const isCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (!isCron && !(await isAuthenticated(req))) {
    res.status(401).json({ error: "권한이 없습니다." });
    return;
  }

  const config = getConfig();
  if (!config) {
    res.status(500).json({ error: "VERCEL_TOKEN / VERCEL_PROJECT_ID 환경변수가 설정되어 있지 않습니다." });
    return;
  }

  const requested = parseInt((req.query && req.query.days) || "7", 10);
  const days = Math.min(30, Math.max(1, isNaN(requested) ? 7 : requested));

  try {
    const rows = await fetchDaily(config, days);
    const saved = await saveDaily(rows);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      ok: true,
      saved,
      from: rows.length ? rows[0].date : null,
      to: rows.length ? rows[rows.length - 1].date : null,
      source: isCron ? "cron" : "manual",
    });
  } catch (err) {
    res.status(500).json({ error: "스냅샷 저장 실패: " + err.message });
  }
};
