/* 가족 퀘스트 서비스 워커.
 * 오프라인 저장은 만들지 않는다 (PLAN.md 5.7). 설치 가능 조건을 위해 존재하며 요청은 그대로 네트워크로 보낸다.
 * 네트워크가 없으면 간단한 안내 페이지를 돌려준다. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>가족 퀘스트</title><body style="font-family:sans-serif;background:#F4F3FA;color:#1F2547;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px;text-align:center"><div><p style="font-size:18px;font-weight:700">인터넷 연결이 필요합니다</p><p style="color:#4A5470">연결된 뒤 다시 열어 주세요.</p></div></body></html>',
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        ),
    ),
  );
});
