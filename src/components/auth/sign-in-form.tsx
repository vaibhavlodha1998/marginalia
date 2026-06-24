"use client";

import { useActionState } from "react";
import { sendOtp, verifyOtp, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: AuthState = {};

export function SignInForm() {
  const [sendState, send, sending] = useActionState(sendOtp, initial);
  const [verifyState, verify, verifying] = useActionState(verifyOtp, initial);

  if (sendState.sent) {
    return (
      <form action={verify} className="flex max-w-[340px] flex-col gap-3">
        <input type="hidden" name="email" value={sendState.email} />
        <p className="text-[14px] leading-relaxed text-ink-2">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-ink">{sendState.email}</span>.
          Enter it below to continue.
        </p>
        <label className="text-[13px] font-semibold text-ink-2">
          Verification code
        </label>
        <Input
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          autoFocus
          required
          className="tracking-[0.5em]"
        />
        <Button type="submit" disabled={verifying} className="mt-1">
          {verifying ? "Verifying…" : "Verify & continue"}
        </Button>
        {verifyState.error && (
          <p className="text-[13px] text-wrong">{verifyState.error}</p>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-1 cursor-pointer text-[13px] text-ink-3 hover:text-ink-2"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form action={send} className="flex max-w-[340px] flex-col gap-3">
      <label className="text-[13px] font-semibold text-ink-2">Email</label>
      <Input
        name="email"
        type="email"
        placeholder="you@study.edu"
        autoComplete="email"
        autoFocus
        required
      />
      <Button type="submit" disabled={sending} className="mt-1">
        {sending ? "Sending code…" : "Continue"}
      </Button>
      {sendState.error && (
        <p className="text-[13px] text-wrong">{sendState.error}</p>
      )}
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
        By continuing you agree to the study terms. We never train on your
        documents.
      </p>
    </form>
  );
}
