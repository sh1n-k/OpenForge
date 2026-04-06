"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      setIsLoading(true);
      await login(password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-5 bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-[400px] grid gap-6 px-8 py-10 border border-border-soft rounded-2xl bg-surface shadow-medium">
        <h1 className="m-0 text-center font-sans text-2xl font-black tracking-[0.12em] uppercase text-foreground leading-tight">OpenForge</h1>

        {error ? (
          <div className="p-4 rounded-xl bg-error-soft text-error border border-error/20 text-[0.875rem] font-medium flex items-start gap-2 shadow-sm text-center justify-center">
            <p className="m-0">{error}</p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <label className="text-muted text-sm font-medium">비밀번호</label>
          <input
            type="password"
            className="w-full rounded-xl border border-border bg-surface text-foreground px-4 py-3 outline-none text-[0.9375rem] transition-all hover:border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="운영 비밀번호를 입력하세요"
            autoFocus
            required
          />
        </div>

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 font-semibold rounded-xl bg-primary !text-white hover:bg-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 mt-2"
          disabled={isLoading}
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
