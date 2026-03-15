"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { signUp } from "@/lib/signup-actions";
import { useEffect, useState } from "react";
import ResendVerificationForm from "@/app/(public)/verify-email/resend-form";

const initialState = { status: "idle" as const, message: "" };

export default function SignupPage() {
  const [state, formAction] = useFormState(signUp, initialState);
  const [chapters, setChapters] = useState<Array<{ id: string; name: string }>>([]);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [accountType, setAccountType] = useState("STUDENT");

  useEffect(() => {
    async function loadChapters() {
      const response = await fetch("/api/chapters");
      if (!response.ok) return;
      const data = await response.json();
      setChapters(Array.isArray(data) ? data : []);
    }
    loadChapters();
  }, []);

  // Show "Application Submitted" confirmation for new applicants
  if (state.status === "success" && state.message === "APPLICATION_SUBMITTED") {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ justifySelf: "center" }}>
          <div className="login-card-header">
            <Image src="/logo-icon.svg" alt="YPP" width={44} height={44} />
            <div>
              <h1 className="page-title" style={{ fontSize: 20 }}>Application Submitted!</h1>
              <p className="page-subtitle mt-0" style={{ fontSize: 13 }}>
                We&apos;ve received your instructor application
              </p>
            </div>
          </div>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
            We sent a verification link to <strong>{submittedEmail || "your email"}</strong>.
            Please verify your email address first to activate your account.
          </p>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
            Once verified, an admin or chapter lead will review your application and reach out to schedule an interview. You can log in at any time to check your application status.
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
            Didn&apos;t get the verification email? Check your spam folder, or request a new link below.
          </p>
          <ResendVerificationForm initialEmail={submittedEmail} />
          <div className="login-help" style={{ marginTop: 16 }}>
            <Link href="/login">Back to Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  // Show "Check Your Email" confirmation after successful student signup
  if (state.status === "success" && state.message === "CHECK_EMAIL") {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ justifySelf: "center" }}>
          <div className="login-card-header">
            <Image src="/logo-icon.svg" alt="YPP" width={44} height={44} />
            <div>
              <h1 className="page-title" style={{ fontSize: 20 }}>Check Your Email</h1>
              <p className="page-subtitle mt-0" style={{ fontSize: 13 }}>
                One more step to get started
              </p>
            </div>
          </div>
          <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
            We sent a verification link to <strong>{submittedEmail || "your email"}</strong>.
            Click it to activate your account and sign in.
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
            Didn&apos;t get it? Check your spam folder, or request a new link below.
          </p>
          <ResendVerificationForm initialEmail={submittedEmail} />
          <div className="login-help" style={{ marginTop: 16 }}>
            <Link href="/login">Back to Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <div className="login-card" style={{ justifySelf: "center" }}>
        <div className="login-card-header">
          <Image
            src="/logo-icon.svg"
            alt="YPP"
            width={44}
            height={44}
          />
          <div>
            <h1 className="page-title" style={{ fontSize: 20 }}>
              Join Youth Passion Project
            </h1>
            <p className="page-subtitle mt-0" style={{ fontSize: 13 }}>
              Create a student account or apply to become an instructor
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="button secondary"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          Sign up with Google
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 12px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>or create account with email</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <form
          action={formAction}
          onSubmit={(e) => {
            const data = new FormData(e.currentTarget);
            setSubmittedEmail(String(data.get("email") ?? ""));
          }}
        >
          <label className="form-label" style={{ marginTop: 0 }}>
            Full Name
            <input className="input" name="name" placeholder="Your full name" required />
          </label>
          <label className="form-label">
            Email
            <input className="input" name="email" type="email" placeholder="you@example.com" required />
          </label>
          <label className="form-label">
            Phone (optional)
            <input className="input" name="phone" type="tel" placeholder="(555) 123-4567" />
          </label>
          <label className="form-label">
            Password
            <input className="input" name="password" type="password" placeholder="Min 8 characters" required />
          </label>
          <label className="form-label">
            Account Type
            <select
              className="input"
              name="accountType"
              defaultValue="STUDENT"
              onChange={(e) => setAccountType(e.target.value)}
            >
              <option value="STUDENT">Student</option>
              <option value="APPLICANT">Instructor Applicant (apply to become an instructor)</option>
            </select>
            {accountType === "APPLICANT" && (
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                Your application will be reviewed by an admin or chapter lead before you are approved as an instructor.
              </span>
            )}
          </label>
          <label className="form-label">
            Chapter (optional)
            <select className="input" name="chapterId" defaultValue="">
              <option value="">Select a chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </label>

          {/* Additional fields for instructor applicants */}
          {accountType === "APPLICANT" && (
            <>
              <label className="form-label">
                Why do you want to teach with YPP?
                <textarea
                  className="input"
                  name="motivation"
                  placeholder="Share what motivates you to teach and what you hope to bring to students..."
                  required
                  rows={4}
                  style={{ resize: "vertical" }}
                />
              </label>
              <label className="form-label">
                Teaching or mentoring experience
                <textarea
                  className="input"
                  name="teachingExperience"
                  placeholder="Describe any prior experience in teaching, tutoring, mentoring, or leading groups..."
                  required
                  rows={4}
                  style={{ resize: "vertical" }}
                />
              </label>
              <label className="form-label">
                Interview availability
                <input
                  className="input"
                  name="availability"
                  placeholder="e.g. Weekday evenings, Saturday mornings..."
                  required
                />
                <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  When are you generally available for a short interview call?
                </span>
              </label>
            </>
          )}

          {state.message && state.message !== "CHECK_EMAIL" && state.message !== "APPLICATION_SUBMITTED" && (
            <div className={state.status === "error" ? "form-error" : "form-success"}>
              {state.message}
            </div>
          )}
          <button className="button" type="submit">
            {accountType === "APPLICANT" ? "Submit Application" : "Create Account"}
          </button>
        </form>
        <div className="login-help">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
        <div className="login-help" style={{ marginTop: 8 }}>
          Are you a parent/guardian? <Link href="/signup/parent">Parent signup</Link>
        </div>
      </div>
    </div>
  );
}
