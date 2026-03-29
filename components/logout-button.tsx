"use client";

import type { CSSProperties } from "react";
import { signOut } from "next-auth/react";

export default function LogoutButton({
  className = "button small ghost",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      className={className}
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{ width: "100%", ...style }}
    >
      Sign Out
    </button>
  );
}
