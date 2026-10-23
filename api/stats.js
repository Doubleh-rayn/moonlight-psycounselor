// api/stats.js
// GET — 로그인(관리자 세션)한 사용자에게 방문자 통계를 돌려줍니다.
//  - 최근 7/30일: Vercel Web Analytics API를 실시간 조회 (무료 플랜은 30일까지만 제공)
//  - 누적(올해/전체/월별): 매일 스냅샷으로 Redis에 쌓인 이력을 합산 (api/snapshot.js 참고)

const { isAuthenticated } = require("./_lib/auth");
const { getConfig, vercelGet, loadHistory, startOfUtcDay, DAY_MS } = require("./_lib/analytics");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "GET 요청만 허용됩니다." });
    return;
  }

  if (!(await isAuthenticated(req))) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return;
  }

  const config = getConfig();
  if (!config) {
    res.status(500).json({
      error: "통계 조회용 환경변수(VERCEL_TOKEN, VERCEL_PROJECT_ID)가 설정되어 있지 않습니다.",
      configured: false,
    });
    return;
  }

  const { token, projectId, teamId } = config;
  const now = Date.now();
  const until = startOfUtcDay(now + DAY_MS).toISOString();
  const since30 = startOfUtcDay(now - 29 * DAY_MS).toISOString();
  const since7 = startOfUtcDay(now - 6 * DAY_MS).toISOString();
  const base = { projectId, teamId };

  try {
    const [totals7, totals30, daily, countries, devices, referrers, pages, history] = await Promise.all([
      vercelGet("/count", { ...base, since: since7, until }, token),
      vercelGet("/count", { ...base, since: since30, until }, token),
      vercelGet("/aggregate", { ...base, since: since30, until, by: ["day"], limit: 31 }, token),
      vercelGet("/aggregate", { ...base, since: since30, until, by: ["country"], limit: 8 }, token),
      vercelGet("/aggregate", { ...base, since: since30, until, by: ["deviceType"], limit: 5 }, token),
      vercelGet("/aggregate", { ...base, since: since30, until, by: ["referrerHostname"], limit: 8 }, token),
      vercelGet("/aggregate", { ...base, since: since30, until, by: ["requestPath"], limit: 8 }, token),
      loadHistory().catch(() => ({ recorded: false, days: 0, months: [] })),
    ]);

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      configured: true,
      range: { since: since30, until },
      totals7,
      totals30,
      daily,
      countries,
      devices,
      referrers,
      pages,
      history,
    });
  } catch (err) {
    res.status(err.status === 403 || err.status === 401 ? 502 : 500).json({
      error: "통계를 불러오지 못했습니다: " + err.message,
      configured: true,
    });
  }
};
