"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { prepareClerkSignIn } from "@/app/actions/auth";
import { ContactLine, FormError, LoginHeading, LoginShell, NotRegistered } from "@/components/LoginCard";

type Step = "email" | "code" | "not-registered";
type ClerkErr = { code?: string; message?: string; longMessage?: string; errors?: { code?: string; message?: string; longMessage?: string }[] };
type ClerkResult = { error: ClerkErr | null };


/**
 * Real email-code verification through Clerk (v7 "future" sign-in API), with
 * the same UI as demo mode. The server first checks the email is a registered
 * member and provisions the Clerk user if needed, so the browser only ever
 * performs a sign-in. There is no sign-up flow and no CAPTCHA.
 */
export function ClerkLoginForm() {
  const router = useRouter();
  const { signIn } = useSignIn();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const ready = Boolean(signIn);

  function fail(res: ClerkResult): never {
    const e = res.error;
    const first = e?.errors?.[0];
    throw new Error(first?.longMessage ?? first?.message ?? e?.longMessage ?? e?.message ?? "Something went wrong.");
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setPending(true);
    try {
      const gate = await prepareClerkSignIn(email);
      if (gate.status === "not-registered") return setStep("not-registered");
      if (gate.status === "error") return setError(gate.message);

      const sent = await signIn.emailCode.sendCode({ emailAddress: gate.email });
      if (sent.error) fail(sent);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError(null);
    setPending(true);
    try {
      const res = await signIn.emailCode.verifyCode({ code });
      if (res.error) fail(res);
      if (signIn.status !== "complete") throw new Error("Verification incomplete. Please try again.");
      const fin = await signIn.finalize();
      if (fin.error) fail(fin);
      router.push("/directory");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function restart() {
    setStep("email");
    setCode("");
    setError(null);
    await signIn?.reset();
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
            <button type="submit" className="btn-primary w-full" disabled={pending || !ready}>
              {pending ? "Sending…" : "Send Verification Email"}
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
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Verifying…" : "Verify & Log In"}
            </button>
          </form>
          <button type="button" className="mt-6 text-sm link" onClick={restart}>
            Use a different email
          </button>
        </>
      )}

      {step === "not-registered" && (
        <>
          <LoginHeading title="Member Access" text="" />
          <NotRegistered email={email} />
          <button type="button" className="mt-6 text-sm link" onClick={restart}>
            Try another email
          </button>
        </>
      )}
    </LoginShell>
  );
}
