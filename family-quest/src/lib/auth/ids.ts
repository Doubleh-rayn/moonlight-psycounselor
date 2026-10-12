/**
 * 구성원 로그인 아이디 규칙.
 * Supabase Auth 는 이메일만 받으므로, 아이디에 고정 도메인을 붙여 이메일로 쓴다.
 * 예: hhu2000 → hhu2000@family-quest.local
 */
export const LOGIN_EMAIL_DOMAIN = "family-quest.local";

export function toLoginEmail(idOrEmail: string): string {
  const v = idOrEmail.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${LOGIN_EMAIL_DOMAIN}`;
}

/** 화면 표시용: 고정 도메인이면 아이디만 보여 준다 */
export function displayLoginId(email: string | null | undefined): string {
  if (!email) return "";
  return email.endsWith(`@${LOGIN_EMAIL_DOMAIN}`) ? email.slice(0, -LOGIN_EMAIL_DOMAIN.length - 1) : email;
}
