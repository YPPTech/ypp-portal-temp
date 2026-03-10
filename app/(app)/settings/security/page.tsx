"use client";

import { useState } from "react";
import { setupTwoFactor, enableTwoFactor, disableTwoFactor } from "@/lib/two-factor-actions";
import { useSession } from "next-auth/react";

type SetupState = "idle" | "scanning" | "confirming" | "recovery";

export default function SecuritySettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const has2FA = user?.twoFactorEnabled ?? false;

  // Setup flow state
  const [setupState, setSetupState] = useState<SetupState>("idle");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [plainSecret, setPlainSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStartSetup() {
    setError(null);
    setLoading(true);
    try {
      const result = await setupTwoFactor();
      setQrCodeUrl(result.qrCodeUrl);
      setPlainSecret(result.secret);
      setSetupState("scanning");
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable() {
    setError(null);
    setLoading(true);
    try {
      const result = await enableTwoFactor(plainSecret, verifyCode);
      setRecoveryCodes(result.recoveryCodes);
      setSetupState("recovery");
    } catch (e: any) {
      setError(e.message ?? "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setError(null);
    setLoading(true);
    try {
      await disableTwoFactor(disableCode);
      // Force session refresh so the UI reflects the change
      window.location.reload();
    } catch (e: any) {
      setError(e.message ?? "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "40px auto", padding: "0 20px" }}>
      <h1 className="page-title" style={{ fontSize: 22, marginBottom: 4 }}>Security Settings</h1>
      <p className="page-subtitle" style={{ marginBottom: 32 }}>
        Manage your account security and two-factor authentication.
      </p>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Two-Factor Authentication</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
              Add a second layer of security with a time-based one-time password (TOTP) app
              such as Google Authenticator, Authy, or 1Password.
            </p>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 99,
              background: has2FA ? "var(--success-light, #dcfce7)" : "var(--surface)",
              color: has2FA ? "var(--success, #16a34a)" : "var(--muted)",
              border: "1px solid",
              borderColor: has2FA ? "var(--success, #16a34a)" : "var(--border)",
              whiteSpace: "nowrap",
              marginLeft: 16,
            }}
          >
            {has2FA ? "Enabled" : "Disabled"}
          </span>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>
        )}

        {/* ── 2FA not enabled ── */}
        {!has2FA && setupState === "idle" && (
          <button className="button" onClick={handleStartSetup} disabled={loading}>
            {loading ? "Loading\u2026" : "Enable Two-Factor Authentication"}
          </button>
        )}

        {/* ── Step 1: Show QR code ── */}
        {setupState === "scanning" && (
          <div>
            <p style={{ fontSize: 14, marginBottom: 12 }}>
              Scan this QR code with your authenticator app, then click <strong>Next</strong>.
            </p>
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="2FA QR code" style={{ display: "block", marginBottom: 12, borderRadius: 8, border: "1px solid var(--border)" }} width={180} height={180} />
            )}
            <details style={{ marginBottom: 16 }}>
              <summary style={{ fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>
                Can&apos;t scan? Enter this key manually
              </summary>
              <code style={{ fontSize: 12, background: "var(--surface)", padding: "4px 8px", borderRadius: 4, display: "inline-block", marginTop: 6, letterSpacing: "0.1em" }}>
                {plainSecret}
              </code>
            </details>
            <button className="button" onClick={() => setSetupState("confirming")}>
              Next — Enter Code
            </button>
          </div>
        )}

        {/* ── Step 2: Verify first TOTP code ── */}
        {setupState === "confirming" && (
          <div>
            <p style={{ fontSize: 14, marginBottom: 12 }}>
              Enter the 6-digit code from your authenticator app to confirm setup.
            </p>
            <label className="form-label" style={{ marginTop: 0 }}>
              Verification Code
              <input
                className="input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
            </label>
            <button className="button" onClick={handleEnable} disabled={loading || verifyCode.length !== 6}>
              {loading ? "Verifying\u2026" : "Enable 2FA"}
            </button>
          </div>
        )}

        {/* ── Step 3: Show recovery codes ── */}
        {setupState === "recovery" && (
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
              Two-factor authentication is now enabled.
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
              Save these recovery codes in a safe place. Each code can only be used once
              if you lose access to your authenticator app.
            </p>
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "12px 16px",
              fontFamily: "monospace",
              fontSize: 13,
              lineHeight: 2,
              marginBottom: 16,
            }}>
              {recoveryCodes.map((code) => (
                <div key={code}>{code}</div>
              ))}
            </div>
            <button className="button secondary" onClick={() => window.location.reload()}>
              Done
            </button>
          </div>
        )}

        {/* ── 2FA enabled — allow disabling ── */}
        {has2FA && setupState === "idle" && (
          <div>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
              To disable two-factor authentication, enter a verification code from your authenticator app.
            </p>
            <label className="form-label" style={{ marginTop: 0 }}>
              Current Verification Code
              <input
                className="input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <button
              className="button"
              style={{ background: "var(--destructive, #dc2626)", color: "#fff" }}
              onClick={handleDisable}
              disabled={loading || disableCode.length !== 6}
            >
              {loading ? "Disabling\u2026" : "Disable 2FA"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
