/**
 * 브라우저 쪽 푸시 구독 도우미 (순수 함수 + 브라우저 API 래퍼).
 * 서비스 워커(/sw.js)가 push 이벤트를 받아 알림을 띄운다.
 */

export type PushSupport = "ok" | "unsupported" | "needs_install" | "denied";

/** VAPID 공개키(base64url) → PushManager.subscribe 가 받는 바이트 배열 */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** iPhone/iPad 는 홈 화면에 설치한 PWA 에서만 웹 푸시가 된다 (iOS 16.4+) */
export function isIosBrowserTab(ua: string, standalone: boolean): boolean {
  return /iPhone|iPad|iPod/i.test(ua) && !standalone;
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    return isIosBrowserTab(navigator.userAgent, standalone) ? "needs_install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

async function registration(): Promise<ServiceWorkerRegistration> {
  // PwaRegister 는 프로덕션에서만 등록하므로 여기서 한 번 더 (register 는 멱등)
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() === "unsupported") return null;
  const reg = await registration();
  return reg.pushManager.getSubscription();
}

/** 권한 요청 → 구독. 사용자 클릭 안에서 불러야 한다 */
export async function subscribePush(vapidPublicKey: string): Promise<PushSubscription> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("알림 권한이 허용되지 않았습니다");
  const reg = await registration();
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) });
}

export interface SubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function subscriptionKeys(sub: PushSubscription): SubscriptionKeys {
  const json = sub.toJSON();
  const keys = json.keys ?? {};
  if (!json.endpoint || !keys.p256dh || !keys.auth) throw new Error("구독 정보가 올바르지 않습니다");
  return { endpoint: json.endpoint, p256dh: keys.p256dh, auth: keys.auth };
}
