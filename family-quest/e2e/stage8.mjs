import { openDemo, BASE, enterPin, selectMember } from "./lib.mjs";
const { browser, page, errors } = await openDemo({ member: "하준" });
const log = (...a) => console.log(...a);

// 자녀(하준)가 습관 제안
await page.goto(BASE + "/habits/new", { waitUntil: "networkidle" });
await page.getByRole("radio", { name: "공부·독서" }).click();
await page.getByRole("button", { name: "책 20분 읽기" }).click();
await page.getByRole("checkbox", { name: "토" }).click(); // 토 해제 → 6일
await page.getByRole("radio", { name: "2개" }).click();
await page.screenshot({ path: "e2e/out/s8-new-habit.png", fullPage: true });
log("limit text:", await page.locator("text=/진행 중: 건강/").innerText());
await page.getByRole("button", { name: "제안하기" }).click();
await page.waitForURL(BASE + "/", { timeout: 10000 });
await page.waitForTimeout(400);
log("hajun today shows pending:", await page.locator("text=관리자 승인 대기 중").count());

// 한도: 하준에게 생활습관 3개째? (장난감 정리 1 + 제안 1 = 2 활성) → 하나 더 제안하면 3, 그 다음은 막힘
await page.goto(BASE + "/habits/new", { waitUntil: "networkidle" });
await page.getByRole("radio", { name: "수면" }).click();
await page.getByRole("button", { name: "10시 전에 잠자리" }).click();
await page.getByRole("button", { name: "제안하기" }).click();
await page.waitForURL(BASE + "/", { timeout: 10000 });
await page.goto(BASE + "/habits/new", { waitUntil: "networkidle" });
await page.getByRole("radio", { name: "기타" }).click();
log("limit alert:", await page.getByRole("alert").allInnerTexts(), "| button disabled:", await page.getByRole("button", { name: "제안하기" }).isDisabled());

// 부모(엄마)가 기록 화면에서 승인
await selectMember(page, "엄마");
await page.goto(BASE + "/records", { waitUntil: "networkidle" });
await page.getByRole("radio", { name: "하준" }).click();
await page.waitForTimeout(400);
log("pending list:", await page.locator("text=승인 대기 중인 습관").count());
await page.getByRole("button", { name: "책 20분 읽기 승인" }).click();
await enterPin(page, "1234");
await page.waitForTimeout(600);

// 하준의 오늘 화면에 나타나는지
await selectMember(page, "하준");
await page.waitForTimeout(400);
const titles = await page.locator("main ul li p.truncate").allInnerTexts();
log("hajun today quests:", titles);
log("approved appears:", titles.includes("책 20분 읽기"), "| still pending:", await page.locator("text=관리자 승인 대기 중").count());

// 관리자가 가족 공동 습관 추가 → 즉시 승인
await selectMember(page, "엄마");
await page.goto(BASE + "/habits/new", { waitUntil: "networkidle" });
await page.getByLabel("이름").fill("주말 아침 다같이 체조");
await page.getByRole("radio", { name: "가족 공동" }).click();
await page.getByRole("button", { name: "주말" }).click();
await page.getByRole("button", { name: "추가", exact: true }).click();
await page.waitForURL(BASE + "/", { timeout: 10000 });
await page.waitForTimeout(400);
log("family quest on today (Sunday):", await page.locator("text=주말 아침 다같이 체조").count());

log("errors:", errors);
await browser.close();
