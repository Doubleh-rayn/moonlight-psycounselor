import { openDemo, BASE, enterPin } from "./lib.mjs";
const { browser, page, errors } = await openDemo({ member: "엄마" });
const log = (...a) => console.log(...a);

// 오늘 화면: 달성률이 0 이 아닌지 (시드 보정 확인)
const rings = await page.locator("[aria-label*='주간 달성률']").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
log("rings:", rings);

// 부모 프로필에서 자녀(지우)의 생활습관 항목이 보이는가 (5단계 완료 기준)
await page.goto(BASE + "/records?member=", { waitUntil: "networkidle" });
await page.getByRole("radio", { name: "지우" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: "e2e/out/s5-records-jiwoo.png", fullPage: true });
const rows = await page.locator("main ul li p.truncate").allInnerTexts();
log("jiwoo goals:", rows);
const summary = await page.locator("main .grid p.text-\\[20px\\]").allInnerTexts();
log("summary all/health/habit:", summary);

// 과거 날짜(3일 전) 체크 수정 → PIN 요구
const dots = page.locator("button[aria-label$='미완료']");
const n = await dots.count();
log("editable dots:", n);
const past = page.locator("button[aria-label^='2026-10-08']").first();
if (await past.count()) {
  await past.click();
  const dlg = page.getByRole("dialog", { name: "관리자 PIN" });
  log("pin dialog opened:", await dlg.isVisible());
  await enterPin(page, "1234");
  await page.waitForTimeout(500);
  log("after pin, label:", await page.locator("button[aria-label^='2026-10-08']").first().getAttribute("aria-label"));
}

// 월간 전환
await page.getByRole("radio", { name: "월간" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "e2e/out/s5-records-month.png", fullPage: true });
log("month title:", await page.locator("span.min-w-\\[120px\\]").innerText());

// 체중 기록 (엄마 본인)
await page.goto(BASE + "/records", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "체중 기록" }).click();
await page.getByLabel(/오늘 체중/).fill("59.2");
await page.getByRole("button", { name: "저장" }).click();
await page.waitForTimeout(500);
log("weights:", await page.locator("[aria-label='체중 기록'] li").allInnerTexts());

// 가족 공동
await page.getByRole("radio", { name: "가족 공동" }).click();
await page.waitForTimeout(400);
log("family rows:", await page.locator("main ul li p.truncate").allInnerTexts());

log("errors:", errors);
await browser.close();
