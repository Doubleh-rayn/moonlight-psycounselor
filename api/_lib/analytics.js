// api/_lib/analytics.js
// Vercel Web Analytics API 호출과 일별 스냅샷 저장/조회를 담당하는 공용 모듈.
// 무료(Hobby) 플랜은 Vercel 쪽에 최근 30일만 남으므로, 매일 Redis에 복사해 두고 누적을 계산합니다.

const { getClient } = require("./redis");

const API = "https://api.vercel.com/v1/query/web-analytics/visits";
const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_KEY = "stats:daily"; // Redis hash: "YYYY-MM-DD" -> {"visitors":n,"pageviews":n}

function startOfUtcDay(ms) {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dateKey(input) {
  return new Date(input).toISOString().slice(0, 10);
}

function getConfig() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) return null;
  return { token, projectId, teamId };
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
    const err = new Error((body && body.error && body.error.message) || `Vercel API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body.data;
}

// 최근 N일(오늘 포함)의 일별 방문자/페이지뷰를 Vercel에서 가져옵니다.
async function fetchDaily(config, days) {
  const now = Date.now();
  const until = startOfUtcDay(now + DAY_MS).toISOString();
  const since = startOfUtcDay(now - (days - 1) * DAY_MS).toISOString();
  const rows = await vercelGet(
    "/aggregate",
    { projectId: config.projectId, teamId: config.teamId, since, until, by: ["day"], limit: days + 1 },
    config.token
  );
  return (rows || []).map((r) => ({
    date: dateKey(r.timestamp),
    visitors: r.visitors || 0,
    pageviews: r.pageviews || 0,
  }));
}

// 일별 데이터를 Redis에 저장(덮어쓰기)합니다. 오늘 날짜는 아직 진행 중이라도 저장해 두고 다음 날 다시 덮어씁니다.
async function saveDaily(rows) {
  if (!rows.length) return 0;
  const client = await getClient();
  const entries = {};
  rows.forEach((r) => {
    entries[r.date] = JSON.stringify({ visitors: r.visitors, pageviews: r.pageviews });
  });
  await client.hSet(DAILY_KEY, entries);
  return rows.length;
}

// 저장된 전체 이력을 읽어 누적·연도별·월별 합계를 계산합니다.
async function loadHistory() {
  const client = await getClient();
  const raw = await client.hGetAll(DAILY_KEY);
  const dates = Object.keys(raw).sort();
  if (dates.length === 0) {
    return { recorded: false, days: 0, firstDate: null, lastDate: null, allTime: null, thisYear: null, months: [] };
  }

  const thisYear = String(new Date().getUTCFullYear());
  const allTime = { visitors: 0, pageviews: 0 };
  const year = { visitors: 0, pageviews: 0 };
  const monthMap = {};

  dates.forEach((date) => {
    let v = { visitors: 0, pageviews: 0 };
    try {
      v = JSON.parse(raw[date]);
    } catch (e) {
      /* 손상된 항목은 0으로 처리 */
    }
    allTime.visitors += v.visitors || 0;
    allTime.pageviews += v.pageviews || 0;
    if (date.startsWith(thisYear)) {
      year.visitors += v.visitors || 0;
      year.pageviews += v.pageviews || 0;
    }
    const m = date.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = { month: m, visitors: 0, pageviews: 0 };
    monthMap[m].visitors += v.visitors || 0;
    monthMap[m].pageviews += v.pageviews || 0;
  });

  const months = Object.values(monthMap).sort((a, b) => (a.month < b.month ? 1 : -1));

  return {
    recorded: true,
    days: dates.length,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
    allTime,
    thisYear: { year: thisYear, ...year },
    months,
  };
}

module.exports = { getConfig, vercelGet, fetchDaily, saveDaily, loadHistory, startOfUtcDay, DAY_MS };
