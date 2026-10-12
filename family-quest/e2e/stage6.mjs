import { openDemo, BASE, enterPin, selectMember } from "./lib.mjs";
const { browser, page, errors } = await openDemo({ member: "지우" });
const log = (...a) => console.log(...a);
const balances = async () => (await page.locator("p.text-\\[24px\\]").allInnerTexts()).join("/");

// 지우: 잔액 확인, 교환 신청
await page.goto(BASE + "/rewards", { waitUntil: "networkidle" });
log("jiwoo balances (my/family):", await balances());
await page.screenshot({ path: "e2e/out/s6-rewards-jiwoo.png", fullPage: true });
const reqBtn = page.getByRole("button", { name: "주말 영화 고르기 교환 신청" });
log("request enabled:", await reqBtn.isEnabled());
await reqBtn.click();
await page.waitForTimeout(500);
log("after request:", await reqBtn.innerText(), "| balance unchanged:", await balances());

// 지우: 보상 제안 (proposed)
await page.getByRole("button", { name: /보상 제안/ }).click();
await page.getByLabel("보상 이름").fill("놀이공원 가기");
await page.getByLabel("필요 스티커").fill("40");
await page.getByRole("radio", { name: "가족 스티커" }).click();
await page.getByRole("button", { name: "제안하기" }).click();
await page.waitForTimeout(500);
log("proposal listed:", await page.locator("text=놀이공원 가기").count());

// 엄마(관리자): 승인 (PIN) → 지우 잔액 차감
await selectMember(page, "엄마");
await page.goto(BASE + "/rewards", { waitUntil: "networkidle" });
const beforeMom = await balances();
await page.getByRole("button", { name: "주말 영화 고르기 승인" }).click();
await enterPin(page, "1234");
await page.waitForTimeout(600);
log("status after approve:", await page.locator("text=승인됨 · 지급 대기").count() > 0 ? "approved" : "?");
await page.getByRole("button", { name: "주말 영화 고르기 지급 완료" }).click();
await enterPin(page, "1234");
await page.waitForTimeout(600);
log("open requests left:", await page.locator("text=교환 신청").count());
// 제안 승인
await page.getByRole("button", { name: "승인" }).first().click();
await enterPin(page, "1234");
await page.waitForTimeout(600);
log("family reward list has 놀이공원:", await page.getByRole("button", { name: "놀이공원 가기 교환 신청" }).count());
log("mom balances:", beforeMom, "->", await balances());

// 지우로 돌아가 잔액 10 차감 확인
await selectMember(page, "지우");
await page.goto(BASE + "/rewards", { waitUntil: "networkidle" });
log("jiwoo balances after fulfil:", await balances());
log("history:", await page.locator("main").locator("text=지급 완료").count());

// 틀린 PIN 시도
await selectMember(page, "엄마");
await page.goto(BASE + "/rewards", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "목록에서 숨기기" }).first().click();
const dlg = page.getByRole("dialog", { name: "관리자 PIN" });
for (const d of "0000") await dlg.getByRole("button", { name: d, exact: true }).click();
await page.waitForTimeout(300);
log("wrong pin message:", await dlg.getByRole("alert").innerText());

log("errors:", errors);
await browser.close();
