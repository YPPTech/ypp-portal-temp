"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function CurriculumSearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue ?? "");
  const [, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("search", value.trim());
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.push(`/curriculum?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search classes by title…"
        className="input"
        style={{ flex: 1, fontSize: 14 }}
      />
      <button type="submit" className="button secondary" style={{ fontSize: 13, flexShrink: 0 }}>
        Search
      </button>
      {defaultValue && (
        <button
          type="button"
          className="button secondary"
          style={{ fontSize: 13, flexShrink: 0 }}
          onClick={() => {
            setValue("");
            const params = new URLSearchParams(searchParams.toString());
            params.delete("search");
            router.push(`/curriculum?${params.toString()}`);
          }}
        >
          ✕
        </button>
      )}
    </form>
  );
}
