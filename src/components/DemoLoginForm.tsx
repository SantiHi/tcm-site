"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { demoRequestCode, demoVerifyCode } from "@/app/actions/auth";
import { ContactLine, FormError, LoginHeading, LoginShell, NotRegistered } from "@/components/LoginCard";

type Step = "email" | "code" | "not-registered";

export function DemoLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await demoRequestCode(email);
      if (res.status === "ok") setStep("code");
      else if (res.status === "not-registered") setStep("not-registered");
      else setError(res.message);
    });
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await demoVerifyCode(email, code);
      if (res.status === "ok") {
        router.push("/directory");
        router.refresh();
      } else if (res.status === "not-registered") setStep("not-registered");
      else setError(res.message);
    });
  }

  return (
    <LoginShell>
      {step === "email" && (
        <>
          <LoginHeading title="Member Access" text="Enter your registered email to receive a verification email" />
          <form onSubmit={sendCode} className="text-left">
            <FormError message={error} />
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Checking…" : "Send Verification Email"}
            </button>
          </form>
          <ContactLine />
        </>
      )}

      {step === "code" && (
        <>
          <LoginHeading title="Check your email" text={`We sent a 6-digit code to ${email}.`} />
          <form onSubmit={verify} className="text-left">
            <FormError message={error} />
            <label htmlFor="code" className="label">Verification code</label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              className="input mb-4 tracking-[0.3em] text-center text-lg"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
            />
            <p className="text-xs text-body mb-4">Demo mode: any 6-digit code works.</p>
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Verifying…" : "Verify & Log In"}
            </button>
          </form>
          <button type="button" className="mt-6 text-sm link" onClick={() => { setStep("email"); setCode(""); }}>
            Use a different email
          </button>
        </>
      )}

      {step === "not-registered" && (
        <>
          <LoginHeading title="Member Access" text="" />
          <NotRegistered email={email} />
          <button type="button" className="mt-6 text-sm link" onClick={() => setStep("email")}>
            Try another email
          </button>
        </>
      )}
    </LoginShell>
  );
}
