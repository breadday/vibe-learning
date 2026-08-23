"use client";

import { useState } from "react";

export function CopyBlock({ title, value, language = "text" }: { title: string; value: string | null; language?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="copy-block">
      <div className="copy-toolbar">
        <div>
          <strong>{title}</strong>
          <span>{language}</span>
        </div>
        <button type="button" onClick={copy} disabled={!value}>
          {status === "copied" ? "복사됨" : status === "error" ? "복사 실패" : "복사"}
        </button>
      </div>
      <pre><code>{value ?? "TODO: 검수된 프롬프트 또는 코드가 아직 없습니다."}</code></pre>
      <span className="sr-only" aria-live="polite">
        {status === "copied" ? "클립보드에 복사했습니다." : status === "error" ? "복사하지 못했습니다." : ""}
      </span>
    </div>
  );
}
