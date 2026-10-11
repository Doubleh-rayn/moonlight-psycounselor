"use client";

/**
 * 가족 데이터 스토어.
 * - 저장소(repo)에서 스냅샷을 통째로 읽어 React 상태로 들고 있는다 (한 가족, 데이터 작음).
 * - 변경은 낙관적 업데이트 → 저장 → 실패 시 되돌림 → 성공 시 재조회.
 * - 실시간 이벤트가 오면 짧게 모아서 재조회한다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { addDays, startOfWeek, todayKey } from "@/lib/date";
import { getRepo, isDemoMode, RepoError, type AuthUser, type FamilyRepo, type FamilySnapshot, type NewMemberInput } from "@/lib/repo";
import type { MemberRow } from "@/lib/db/types";

export type AuthStatus = "loading" | "signed_out" | "signed_in";
export type FamilyStatus = "unknown" | "none" | "loading" | "ready" | "error";

const MEMBER_KEY = "fq.memberId";
/** 기본으로 읽어 두는 체크 기간: 8주 전 월요일부터 */
const DEFAULT_WEEKS_BACK = 8;

export interface FamilyStore {
  demo: boolean;
  authStatus: AuthStatus;
  user: AuthUser | null;
  familyStatus: FamilyStatus;
  snapshot: FamilySnapshot | null;
  error: string | null;
  /** 이 기기에서 선택한 구성원 (계정에 묶인 구성원이 있으면 그 구성원) */
  me: MemberRow | null;
  meId: string | null;
  /** 로그인 계정이 특정 구성원에 묶여 있어 프로필 선택이 필요 없는가 */
  lockedToMember: boolean;
  online: boolean;
  today: string;

  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<{ needsEmailConfirm: boolean }>;
  signOut(): Promise<void>;
  changePassword(newPassword: string): Promise<void>;
  createFamily(input: { name: string; pin: string; members: NewMemberInput[] }): Promise<void>;
  selectMember(id: string | null): void;
  reload(): Promise<void>;
  /** 이 날짜부터의 체크 기록이 필요할 때 (기록 화면 월간 이동 등) */
  ensureCheckinsFrom(date: string): Promise<void>;
  verifyPin(pin: string): Promise<boolean>;
  setPin(pin: string): Promise<void>;
  /**
   * 낙관적 변경. apply 로 화면을 먼저 바꾸고 commit 을 저장소에 보낸다.
   * 실패하면 이전 스냅샷으로 되돌리고 오류를 던진다.
   */
  mutate<T>(apply: (s: FamilySnapshot) => FamilySnapshot, commit: (repo: FamilyRepo) => Promise<T>): Promise<T>;
  repo: FamilyRepo | null;
}

const Ctx = createContext<FamilyStore | null>(null);

function readMemberId(): string | null {
  try {
    return window.localStorage.getItem(MEMBER_KEY);
  } catch {
    return null;
  }
}

const MEMBER_EVENT = "fq:member";

function writeMemberId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(MEMBER_KEY, id);
    else window.localStorage.removeItem(MEMBER_KEY);
  } catch {
    /* 무시 */
  }
  window.dispatchEvent(new Event(MEMBER_EVENT));
}

function subscribeMember(cb: () => void): () => void {
  window.addEventListener(MEMBER_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(MEMBER_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function subscribeToday(cb: () => void): () => void {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
}

function subscribeOnline(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function defaultCheckinsFrom(today: string): string {
  return addDays(startOfWeek(today), -7 * DEFAULT_WEEKS_BACK);
}

export function FamilyStoreProvider({ children }: { children: ReactNode }) {
  const [repo, setRepo] = useState<FamilyRepo | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [familyStatus, setFamilyStatus] = useState<FamilyStatus>("unknown");
  const [snapshot, setSnapshotState] = useState<FamilySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 서버 렌더에서는 빈 값 (Cache Components 의 현재시각 제한 회피). 클라이언트에서 30초마다 확인
  const today = useSyncExternalStore(subscribeToday, () => todayKey(), () => "");
  const meId = useSyncExternalStore(subscribeMember, readMemberId, () => null);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  // 낙관적 변경에서 최신 스냅샷을 읽기 위해 ref 와 state 를 함께 갱신한다
  const snapshotRef = useRef<FamilySnapshot | null>(null);
  const setSnapshot = useCallback((s: FamilySnapshot | null) => {
    snapshotRef.current = s;
    setSnapshotState(s);
  }, []);
  const fromRef = useRef<string | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSeq = useRef(0);

  // 저장소 준비
  useEffect(() => {
    let cancelled = false;
    getRepo().then((r) => {
      if (!cancelled) setRepo(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFamily = useCallback(
    async (r: FamilyRepo) => {
      const seq = ++loadSeq.current;
      try {
        const family = await r.getFamily();
        if (seq !== loadSeq.current) return;
        if (!family) {
          setFamilyStatus("none");
          setSnapshot(null);
          return;
        }
        setFamilyStatus((s) => (s === "ready" ? s : "loading"));
        let from = fromRef.current ?? (fromRef.current = defaultCheckinsFrom(todayKey()));
        let snap = await r.loadSnapshot(from);
        // 진행 중인 계획이 더 이전에 시작했으면 그 날짜부터 다시 읽는다
        const earliest = snap.plans
          .filter((p) => p.status === "active")
          .map((p) => p.start_date)
          .sort()[0];
        if (earliest && earliest < from) {
          from = earliest;
          fromRef.current = from;
          snap = await r.loadSnapshot(from);
        }
        if (seq !== loadSeq.current) return;
        setSnapshot(snap);
        setFamilyStatus("ready");
        setError(null);
      } catch (e) {
        if (seq !== loadSeq.current) return;
        setFamilyStatus("error");
        setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다");
      }
    },
    [setSnapshot],
  );

  // 인증 상태 추적
  useEffect(() => {
    if (!repo) return;
    let active = true;
    const apply = (u: AuthUser | null) => {
      if (!active) return;
      setUser(u);
      setAuthStatus(u ? "signed_in" : "signed_out");
      if (u) {
        setFamilyStatus("loading");
        void loadFamily(repo);
      } else {
        setFamilyStatus("unknown");
        setSnapshot(null);
      }
    };
    repo.getUser().then(apply);
    const off = repo.onAuthChange(apply);
    return () => {
      active = false;
      off();
    };
  }, [repo, loadFamily, setSnapshot]);

  const scheduleReload = useCallback(() => {
    if (!repo) return;
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null;
      void loadFamily(repo);
    }, 350);
  }, [repo, loadFamily]);

  // 실시간 구독 (가족이 준비된 뒤)
  useEffect(() => {
    if (!repo || familyStatus !== "ready") return;
    const off = repo.subscribe(() => scheduleReload());
    return off;
  }, [repo, familyStatus, scheduleReload]);

  // 로그인 계정에 묶인 구성원이 있으면 그 구성원으로 고정, 없으면 이 기기에서 고른 구성원
  const linked = useMemo(
    () => (snapshot && user ? snapshot.members.find((m) => m.user_id === user.id && m.active) ?? null : null),
    [snapshot, user],
  );
  const me = useMemo(() => {
    if (linked) return linked;
    if (!snapshot || !meId) return null;
    return snapshot.members.find((m) => m.id === meId && m.active) ?? null;
  }, [snapshot, meId, linked]);

  const store: FamilyStore = useMemo(
    () => ({
      demo: isDemoMode(),
      authStatus,
      user,
      familyStatus,
      snapshot,
      error,
      me,
      meId,
      lockedToMember: linked !== null,
      online,
      today,
      repo,

      async signIn(email, password) {
        if (!repo) throw new RepoError("준비 중입니다");
        await repo.signIn(email, password);
      },
      async signUp(email, password) {
        if (!repo) throw new RepoError("준비 중입니다");
        return repo.signUp(email, password);
      },
      async signOut() {
        if (!repo) return;
        writeMemberId(null);
        await repo.signOut();
      },
      async changePassword(newPassword) {
        if (!repo) throw new RepoError("준비 중입니다");
        await repo.changePassword(newPassword);
      },
      async createFamily(input) {
        if (!repo) throw new RepoError("준비 중입니다");
        await repo.createFamily(input);
        await loadFamily(repo);
      },
      selectMember(id) {
        writeMemberId(id);
      },
      async reload() {
        if (repo) await loadFamily(repo);
      },
      async ensureCheckinsFrom(date) {
        if (!repo) return;
        if (fromRef.current && date >= fromRef.current) return;
        fromRef.current = date;
        await loadFamily(repo);
      },
      async verifyPin(pin) {
        if (!repo) return false;
        return repo.verifyPin(pin);
      },
      async setPin(pin) {
        if (!repo) throw new RepoError("준비 중입니다");
        await repo.setPin(pin);
      },
      async mutate(apply, commit) {
        if (!repo) throw new RepoError("준비 중입니다");
        if (!navigator.onLine) throw new RepoError("인터넷 연결이 필요합니다", "network");
        const before = snapshotRef.current;
        if (before) setSnapshot(apply(before));
        try {
          const result = await commit(repo);
          scheduleReload();
          return result;
        } catch (e) {
          if (before) setSnapshot(before);
          throw e;
        }
      },
    }),
    [authStatus, user, familyStatus, snapshot, error, me, meId, linked, online, today, repo, loadFamily, scheduleReload, setSnapshot],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useFamily(): FamilyStore {
  const s = useContext(Ctx);
  if (!s) throw new Error("FamilyStoreProvider 안에서만 사용할 수 있습니다");
  return s;
}

/** 스냅샷과 선택 구성원이 준비된 화면에서만 쓰는 헬퍼 */
export function useReadyFamily(): FamilyStore & { snapshot: FamilySnapshot; me: MemberRow } {
  const s = useFamily();
  if (!s.snapshot || !s.me) throw new Error("가족 데이터가 준비되지 않았습니다");
  return s as FamilyStore & { snapshot: FamilySnapshot; me: MemberRow };
}
