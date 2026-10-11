import { chromium } from "playwright";
const BASE = "http://localhost:3100";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const log = (...a) => console.log(...a);

// 1) 비로그인 → /login 으로 이동
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForURL("**/login");
log("redirect to login:", page.url());
await page.screenshot({ path: "e2e/out/s3-login.png" });

// 2) 데모 가족으로 시작 → /profiles
await page.getByRole("button", { name: /데모 가족으로 시작/ }).click();
await page.waitForURL("**/profiles", { timeout: 10000 });
log("profiles:", page.url());
await page.screenshot({ path: "e2e/out/s3-profiles.png" });
const names = await page.locator("main ul li button").allInnerTexts();
log("members:", names.map((n) => n.replace(/\s+/g, " ")).join(" | "));

// 3) 구성원 선택 → /
await page.getByRole("button", { name: /지우/ }).click();
await page.waitForURL(BASE + "/", { timeout: 10000 });
log("today:", page.url(), "stored member:", await page.evaluate(() => localStorage.getItem("fq.memberId")));

// 4) 새 탭(같은 기기)에서 다른 구성원 선택 가능해야 함 → 두 번째 컨텍스트(다른 기기) 로 같은 계정 로그인
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
// 데모 데이터는 localStorage 에 있으므로 같은 브라우저 컨텍스트가 아니면 비어 있다 → 같은 컨텍스트의 새 페이지로 '다른 기기' 흉내
await ctx2.close();
const page2 = await ctx.newPage();
await page2.goto(BASE + "/profiles", { waitUntil: "networkidle" });
// 같은 localStorage 이므로 이미 지우가 선택되어 있다. 다른 구성원 선택 후 원래 페이지의 선택과 독립적인지는 Supabase 모드에서만 의미가 있다.
await page2.getByRole("button", { name: /엄마/ }).click();
await page2.waitForURL(BASE + "/", { timeout: 10000 });
log("page2 member:", await page2.evaluate(() => localStorage.getItem("fq.memberId")));
await page2.close();

// 5) 로그아웃 → 새 계정 가입 → /setup 가족 생성
await page.goto(BASE + "/profiles", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "로그아웃" }).click();
await page.waitForURL("**/login");
await page.getByRole("button", { name: /가족 계정 만들기/ }).click();
await page.getByLabel("이메일").fill("new@example.com");
await page.getByLabel(/비밀번호/).fill("secret123");
await page.getByRole("button", { name: "가족 계정 만들기" }).click();
await page.waitForURL("**/setup", { timeout: 10000 });
log("setup:", page.url());
await page.getByLabel("가족 이름").fill("테스트 가족");
await page.getByLabel(/관리자 PIN/).fill("4321");
await page.getByLabel("PIN 확인").fill("4321");
const nameInputs = page.getByLabel("이름", { exact: true });
await nameInputs.nth(0).fill("아빠");
await nameInputs.nth(1).fill("딸");
await page.screenshot({ path: "e2e/out/s3-setup.png", fullPage: true });
await page.getByRole("button", { name: "가족 만들기" }).click();
await page.waitForTimeout(800); const alertText = await page.locator("[role=alert]").allInnerTexts(); log("alerts:", alertText);
await page.waitForURL("**/profiles", { timeout: 10000 });
log("after setup:", page.url(), (await page.locator("main ul li button").allInnerTexts()).map((n) => n.replace(/\s+/g, " ")).join(" | "));
await page.screenshot({ path: "e2e/out/s3-profiles2.png" });

log("errors:", errors);
await browser.close();
