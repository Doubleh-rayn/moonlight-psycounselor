import { openDemo, BASE } from "./lib.mjs";
const { browser, ctx, page, errors } = await openDemo({ member: "엄마" });
const log = (...a) => console.log(...a);

await page.screenshot({ path: "e2e/out/s4-today.png", fullPage: true });
const countText = async (p) => (await p.locator("text=/\\d+ \\/ \\d+ 완료/").first().innerText());
log("before:", await countText(page));

// 체크 토글
const cb = page.getByRole("checkbox", { name: "밥 3분의 1공기 덜기" });
const before = await cb.getAttribute("aria-checked");
await cb.click();
await page.waitForTimeout(600);
const after = await cb.getAttribute("aria-checked");
log("toggle:", before, "->", after, "| count:", await countText(page));

// 두 번째 탭(다른 기기 흉내): 새로고침 없이 반영되는지
const page2 = await ctx.newPage();
await page2.goto(BASE + "/", { waitUntil: "networkidle" });
const cb2 = page2.getByRole("checkbox", { name: "밥 3분의 1공기 덜기" });
log("tab2 sees:", await cb2.getAttribute("aria-checked"));
await cb.click(); // tab1 에서 다시 토글
await page2.waitForFunction(
  (expected) => document.querySelector('[role=checkbox][aria-label="밥 3분의 1공기 덜기"]')?.getAttribute("aria-checked") === expected,
  before,
  { timeout: 5000 },
).then(() => log("tab2 updated without reload: OK")).catch(() => log("tab2 NOT updated"));

// 횟수·분 입력
await page.getByRole("button", { name: "빠르게 걷기 30분 값 입력" }).click();
await page.getByLabel(/오늘 한 양/).fill("20");
await page.getByRole("button", { name: "저장" }).click();
await page.waitForTimeout(500);
log("minutes progress:", await page.locator("text=/20\\/30분/").count() > 0 ? "20/30분 shown" : "missing", "| checked:", await page.getByRole("checkbox", { name: "빠르게 걷기 30분" }).getAttribute("aria-checked"));
await page.getByRole("button", { name: "빠르게 걷기 30분 값 입력" }).click();
await page.getByRole("button", { name: /목표만큼/ }).click();
await page.getByRole("button", { name: "저장" }).click();
await page.waitForTimeout(500);
log("after full:", await page.getByRole("checkbox", { name: "빠르게 걷기 30분" }).getAttribute("aria-checked"));

// 가족 공동 퀘스트 (월·수·금에만 보임)
const fam = page.locator("text=가족 공동 퀘스트");
log("family quest visible today:", await fam.count());
if (await fam.count()) {
  const fcb = page.getByRole("checkbox", { name: /산책/ });
  await fcb.click();
  await page.waitForTimeout(400);
  log("family done text:", await page.locator("text=/명 중 \\d+명 완료|전원 완료/").first().innerText());
}

// 응원 보내기 → 지우 화면에서 받은 응원
await page.getByRole("button", { name: "지우에게 응원 보내기" }).click();
await page.getByRole("button", { name: "오늘도 힘내!" }).click();
await page.waitForTimeout(400);
await page2.goto(BASE + "/profiles", { waitUntil: "networkidle" });
await page2.getByRole("button", { name: /지우/ }).click();
await page2.waitForURL(BASE + "/");
await page2.waitForTimeout(500);
log("jiwoo received:", await page2.locator("[aria-label='오늘 받은 응원'] li").allInnerTexts());
await page2.screenshot({ path: "e2e/out/s4-jiwoo.png", fullPage: true });

// 어제 토글
await page.getByRole("radio", { name: "어제" }).click();
await page.waitForTimeout(300);
log("yesterday items:", await page.getByRole("checkbox").count());

log("errors:", errors);
await browser.close();
