// api/stats.js
// GET — 로그인(관리자 세션)한 사용자에게 Vercel Web Analytics 방문자 통계를 돌려줍니다.
// 필요한 환경변수: VERCEL_TOKEN(개인 액세스 토큰), VERCEL_PROJECT_ID, VERCEL_TEAM_ID
// 무료(Hobby) 플랜은 최근 30일까지만 조회할 수 있습니다.

const { isAuthenticated } = require("./_lib/auth");

const API = "https://api.vercel.com/v1/query/web-analytics/visits";
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(ms) {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function vercelGet(path, params, token) {
  const url = new URL(API + path);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, v));
    else if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body && body.error && body.error.message) || `Vercel API ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return body.data;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "GET 요청만 허용됩니다." });
    return;
  }

  if (!(await isAuthenticated(req))) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return;
  }

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) {
    res.status(500).json({
      error: "통계 조회용 환경변수(VERCEL_TOKEN, VERCEL_PROJECT_ID)가 설정되어 있지 않습니다.",
      configured: false,
    });
    return;
  }

  const now = Date.now();
  const until = startOfUtcDay(now + DAY_MS).toISOString(); // 내일 0시(UTC)까지 = 오늘 포함
  const since30 = startOfUtcDay(now - 29 * DAY_MS).toISOString();
  const since7 = startOfUtcDay(now - 6 * DAY_MS).toISOString();
  const base = { projectId, teamId };

  try {
    const [totals7, totals30, daily, countries, devices, referrers, pages] = await Promise.all([
      vercelGet("/count", { ...base, since: since7, until }, token),
      vercelGet("/count", { ...base, since: since30, until }, token),
      vercelGet("/aggregate", { ...base, since: since30, until, by: ["day"], limit: 31 }, token),
      vercelGet("/aggregate", { ...base, since: since30, until, by: ["country"], limit: 8 }, token),
      vercelGet("/aggregate", { ...base, since: since30, until, by: ["deviceType"], limit: 5 }, token),
      vercelGet("/aggregate", { ...base, since: since30, until, by: ["referrerHostname"], limit: 8 }, token),
      vercelGet("/aggregate", { ...base, since: since30, until, by: ["requestPath"], limit: 8 }, token),
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
    });
  } catch (err) {
    res.status(err.status === 403 || err.status === 401 ? 502 : 500).json({
      error: "통계를 불러오지 못했습니다: " + err.message,
      configured: true,
    });
  }
};
