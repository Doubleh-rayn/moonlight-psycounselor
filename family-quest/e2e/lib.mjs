import { chromium } from "playwright";
export const BASE = "http://localhost:3100";
export async function openDemo({ member = "엄마", width = 390 } = {}) {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /데모 가족으로 시작/ }).click();
  await page.waitForURL("**/profiles", { timeout: 15000 });
  await page.getByRole("button", { name: new RegExp(member) }).click();
  await page.waitForURL(BASE + "/", { timeout: 15000 });
  await page.waitForSelector("h1");
  return { browser, ctx, page, errors };
}
export async function selectMember(page, name) {
  await page.goto(BASE + "/profiles", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.waitForURL(BASE + "/", { timeout: 15000 });
}
export async function enterPin(page, pin = "1234") {
  const dialog = page.getByRole("dialog", { name: "관리자 PIN" });
  await dialog.waitFor({ timeout: 5000 });
  for (const d of pin) await dialog.getByRole("button", { name: d, exact: true }).click();
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
}
