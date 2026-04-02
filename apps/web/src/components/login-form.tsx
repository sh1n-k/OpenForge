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
    <main className="login-screen">
      <form onSubmit={handleSubmit} className="login-card">
        <h1 className="login-title">OpenForge</h1>

        {error ? (
          <div className="doc-panel doc-panel-warn login-error">
            <p>{error}</p>
          </div>
        ) : null}

        <div className="login-field">
          <label className="login-label">비밀번호</label>
          <input
            type="password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="운영 비밀번호를 입력하세요"
            autoFocus
            required
          />
        </div>

        <button
          type="submit"
          className="button-primary login-submit"
          disabled={isLoading}
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
