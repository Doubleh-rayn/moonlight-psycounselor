import { openDemo, BASE, enterPin, selectMember } from "./lib.mjs";
const { browser, page, errors } = await openDemo({ member: "엄마" });
const log = (...a) => console.log(...a);

// 계획 만들기 (엄마: 60 → 57, 162cm, 1985-04 여, 보통)
await page.goto(BASE + "/settings/plan", { waitUntil: "networkidle" });
await page.getByLabel("현재 체중 (kg)").fill("60");
await page.getByLabel("목표 체중 (kg)").fill("57");
await page.getByLabel("키 (cm)").fill("165");
await page.getByLabel("활동량").selectOption("moderate");
await page.waitForTimeout(300);
log("summary:", (await page.locator("text=/감량 · \\d+주/").first().innerText()));
log("split:", (await page.locator("text=/적응 \\d+주/").first().innerText()).slice(0, 80));
const rows = await page.locator("table tbody tr").allInnerTexts();
log("table rows:", rows.length, "| first:", rows[0].replace(/\s+/g, " "), "| w3:", rows[2].replace(/\s+/g, " "), "| w6:", rows[5].replace(/\s+/g, " "));
await page.screenshot({ path: "e2e/out/s7-plan-preview.png", fullPage: true });

// 직접 수정: 기간 4주 → 한도 때문에 늘어남
await page.getByRole("button", { name: "직접 수정" }).click();
await page.getByLabel(/기간 \(주\)/).fill("4");
await page.waitForTimeout(300);
log("override notes:", await page.locator("p.text-peach-deep").allInnerTexts());
await page.getByLabel(/기간 \(주\)/).fill("");

// 시작 (PIN)
await page.getByRole("button", { name: "이 계획으로 시작" }).click();
await enterPin(page, "1234");
await page.waitForURL("**/quest", { timeout: 10000 });
await page.waitForTimeout(800);
await page.screenshot({ path: "e2e/out/s7-quest-map.png", fullPage: true });
log("map header:", await page.locator("main p.text-\\[16px\\].font-bold").first().innerText());
log("stage cards:", (await page.locator("ol[aria-label='단계'] > li").count()));
log("stage1 quests:", await page.locator("ol[aria-label='단계'] li").first().locator("ul li span.truncate").allInnerTexts());
log("guide:", (await page.locator("text=이번 주 가이드").first().innerText()));

// 오늘 화면: 단계 표시 + plan 퀘스트
await page.goto(BASE + "/", { waitUntil: "networkidle" });
log("hero stage:", await page.locator("header a p.font-bold").first().innerText());
log("today quests:", await page.locator("main ul li p.truncate").allInnerTexts());

// 미성년 (지우): BMI 백분위수 + 유지/감량
await page.goto(BASE + "/settings/plan", { waitUntil: "networkidle" });
await page.getByRole("radio", { name: "지우" }).click();
await page.getByLabel("현재 체중 (kg)").fill("48");
await page.getByLabel("목표 체중 (kg)").fill("45");
await page.waitForTimeout(300);
log("jiwoo bmi card:", (await page.locator("text=소아청소년 BMI 백분위수").locator("..").innerText()).replace(/\s+/g, " ").slice(0, 160));
log("jiwoo plan:", await page.locator("main p.text-\\[16px\\].font-bold").last().innerText());
await page.getByLabel("현재 체중 (kg)").fill("58");
await page.getByLabel("목표 체중 (kg)").fill("55");
await page.waitForTimeout(300);
log("jiwoo heavier:", (await page.locator("text=소아청소년 BMI 백분위수").locator("..").innerText()).replace(/\s+/g, " ").slice(0, 120), "|", await page.locator("main p.text-\\[16px\\].font-bold").last().innerText());

log("errors:", errors);
await browser.close();
