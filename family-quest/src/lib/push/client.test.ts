import { describe, expect, it } from "vitest";
import { isIosBrowserTab, urlBase64ToUint8Array } from "./client";

describe("urlBase64ToUint8Array", () => {
  it("base64url(패딩 없음) 을 바이트로 바꾼다", () => {
    // "hello" 의 base64url = aGVsbG8
    expect(Array.from(urlBase64ToUint8Array("aGVsbG8"))).toEqual([104, 101, 108, 108, 111]);
  });
  it("-/_ 를 +// 로 되돌린다", () => {
    // 0xfb 0xff → base64 "+/8=" → base64url "-_8"
    expect(Array.from(urlBase64ToUint8Array("-_8"))).toEqual([251, 255]);
  });
  it("VAPID 공개키(65바이트 비압축 P-256 점) 길이를 보존한다", () => {
    const key = "BAIlO7rSlc9gJsKRoPzmlhKIwDWzHXnbMm16bwoTcBh3O4HTtQbkiOgzEkOP9kG6ja_bOV0D15n1UoKYm3nMLCI";
    const bytes = urlBase64ToUint8Array(key);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(4);
  });
});

describe("isIosBrowserTab", () => {
  const ios = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
  const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120.0 Mobile Safari/537.36";
  it("iPhone 브라우저 탭이면 true, 홈 화면 설치본이면 false", () => {
    expect(isIosBrowserTab(ios, false)).toBe(true);
    expect(isIosBrowserTab(ios, true)).toBe(false);
  });
  it("안드로이드는 false", () => {
    expect(isIosBrowserTab(android, false)).toBe(false);
  });
});
