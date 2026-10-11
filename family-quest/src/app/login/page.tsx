"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { useFamily } from "@/lib/store/FamilyStore";
import { useToast } from "@/components/app/Toast";
import { DEMO_EMAIL, DEMO_PASSWORD, seedDemo } from "@/lib/repo/demoSeed";
import type { MemoryRepo } from "@/lib/repo/memory";
import { toLoginEmail } from "@/lib/auth/ids";

export default function LoginPage() {
  const { signIn, signUp, demo, repo } = useFamily();
  const toast = useToast();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "in") await signIn(toLoginEmail(email), password);
      else {
        const r = await signUp(toLoginEmail(email), password);
        if (r.needsEmailConfirm) toast("확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인하지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  const startDemo = async () => {
    if (!repo || repo.mode !== "demo") return;
    setBusy(true);
    try {
      await seedDemo(repo as MemoryRepo);
      await signIn(DEMO_EMAIL, DEMO_PASSWORD);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-4 py-8">
      <h1 className="text-[28px] font-extrabold">가족 퀘스트</h1>
      <p className="mt-1 text-[14px] font-medium text-muted">자기 아이디로 로그인하면 바로 내 화면이 열립니다</p>

      <Card className="mt-5">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="아이디" hint={mode === "up" ? "(또는 이메일)" : undefined}>
            <TextInput type="text" autoComplete="username" autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="예: hhu2000" />
          </Field>
          <Field label="비밀번호" hint={mode === "up" ? "(6자 이상)" : undefined}>
            <TextInput
              type="password"
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <p role="alert" className="text-[13px] font-semibold text-peach-deep">
              {error}
            </p>
          )}
          <Button type="submit" tone="gold" size="lg" block disabled={busy}>
            {mode === "in" ? "로그인" : "가족 계정 만들기"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-3 min-h-[44px] w-full text-[14px] font-bold text-blue-deep"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "처음이신가요? 가족 계정 만들기" : "이미 계정이 있나요? 로그인"}
        </button>
      </Card>

      {demo && (
        <Card tone="lavender" className="mt-4">
          <p className="text-[14px] font-bold">데모 모드</p>
          <p className="mt-1 text-[13px]">Supabase 가 설정되지 않아 이 브라우저 안에서만 동작합니다. 예시 가족으로 바로 둘러볼 수 있습니다.</p>
          <Button tone="lavender" block className="mt-3" onClick={() => void startDemo()} disabled={busy}>
            데모 가족으로 시작 (PIN 1234)
          </Button>
        </Card>
      )}
    </main>
  );
}
