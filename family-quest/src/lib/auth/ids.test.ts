import { describe, expect, it } from "vitest";
import { displayLoginId, toLoginEmail } from "./ids";

describe("로그인 아이디", () => {
  it("아이디에 고정 도메인을 붙인다", () => {
    expect(toLoginEmail("hhu2000")).toBe("hhu2000@family-quest.local");
    expect(toLoginEmail("  Ebora1004 ")).toBe("ebora1004@family-quest.local");
  });
  it("이메일은 그대로 쓴다", () => {
    expect(toLoginEmail("hhu2004@gmail.com")).toBe("hhu2004@gmail.com");
  });
  it("표시할 때는 도메인을 뗀다", () => {
    expect(displayLoginId("sunny150327@family-quest.local")).toBe("sunny150327");
    expect(displayLoginId("hhu2004@gmail.com")).toBe("hhu2004@gmail.com");
  });
});
