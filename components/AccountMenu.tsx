"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, EnvelopeSimple, GoogleLogo, SignOut } from "@phosphor-icons/react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { CAMPAIGN_SLOTS } from "@/lib/accounts";
import { currentAccount, requestEmailCode, signInLegacy, signInWithGoogle, signOut, subscribeAccount, verifyEmailCode, type Account } from "@/lib/saves";

type Mode = "signin" | "create" | "code" | "legacy";
const oauthError = "Google sign-in could not finish. Check the provider setup or try email instead.";

export default function AccountMenu({
  campaignCount,
  onChange,
}: {
  campaignCount: number;
  onChange?: () => void;
}) {
  const [account, setAccount] = useState<Account | null>(currentAccount());
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [startedAsCreate, setStartedAsCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("auth_error") ? oauthError : "");
  const [busy, setBusy] = useState(false);
  const titleId = useId();

  useEffect(() => subscribeAccount(() => {
    setAccount(currentAccount());
    onChange?.();
  }), [onChange]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("auth_error")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    }
  }, []);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setMessage("");
    setCode("");
    setPassword("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "code") {
        await verifyEmailCode(email, code);
        setCode("");
      } else if (mode === "legacy") {
        await signInLegacy(username, password);
        setPassword("");
      } else {
        const create = mode === "create";
        await requestEmailCode(email, create);
        setStartedAsCreate(create);
        setMode("code");
        setMessage("Check your inbox for a confirmation code.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError("");
    try { await signInWithGoogle(); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start Google sign-in.");
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError("");
    try {
      await requestEmailCode(email, startedAsCreate);
      setMessage("A new code is on its way. Check your inbox.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resend the code.");
    } finally { setBusy(false); }
  }

  const heading = account ? account.displayName : mode === "create" ? "Create account" : mode === "code" ? "Check your email" : mode === "legacy" ? "Existing account" : "Sign in";
  return (
    <div className="account-panel">
      <div className="account-heading">
        <span className="account-mark"><Image src="/novus-logo.svg" width={36} height={36} alt="" /></span>
        <div>
          <span className="account-eyebrow">NOVUS ARBITRIUM</span>
          <h2 id={titleId}>{heading}</h2>
          <p>{account ? `${campaignCount} of ${CAMPAIGN_SLOTS} campaign slots` : `${CAMPAIGN_SLOTS} campaign slots, synced to your account`}</p>
        </div>
      </div>

      {account ? (
        <div className="account-signed-in">
          {account.email && <p className="account-identity">{account.email}</p>}
          <button className="account-action" type="button" onClick={() => { void signOut().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not sign out.")); }}>
            <SignOut size={17} /> Sign out <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <>
          {(mode === "signin" || mode === "create") && (
            <div className="account-tabs" role="tablist" aria-label="Account action">
              <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => changeMode("signin")}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === "create"} onClick={() => changeMode("create")}>Create account</button>
            </div>
          )}
          <form className="account-form" onSubmit={(event) => void submit(event)}>
            {mode === "legacy" ? (
              <>
                <label>Username<input name="username" autoComplete="username" value={username} maxLength={20} required onChange={(event) => setUsername(event.target.value)} /></label>
                <label>Password<input name="password" type="password" autoComplete="current-password" value={password} minLength={8} maxLength={72} required onChange={(event) => setPassword(event.target.value)} /></label>
              </>
            ) : (
              <>
                <label>Email address<input name="email" type="email" autoComplete="email" value={email} maxLength={254} required readOnly={mode === "code"} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
                {mode === "code" && <label>Confirmation code<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} value={code} required onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="6-digit code" /></label>}
              </>
            )}
            {message && <p className="account-message" role="status">{message}</p>}
            {error && <p className="account-error" role="alert">{error}</p>}
            <button className="account-submit" type="submit" disabled={busy}>
              {mode === "code" ? "Verify and continue" : mode === "legacy" ? "Sign in with username" : mode === "create" ? "Send confirmation code" : "Send sign-in code"}
              <ArrowRight size={16} />
            </button>
          </form>
          {(mode === "signin" || mode === "create") && (
            <>
              <div className="account-divider"><span>or continue with</span></div>
              <button className="account-google" type="button" onClick={() => void google()} disabled={busy}><GoogleLogo size={18} weight="bold" /> Google</button>
              <p className="account-note"><EnvelopeSimple size={15} /> Email uses a one-time code; no password needed.</p>
              <button className="account-switch" type="button" onClick={() => changeMode("legacy")}>Have an older username account?</button>
            </>
          )}
          {mode === "code" && <div className="account-links"><button type="button" onClick={() => changeMode(startedAsCreate ? "create" : "signin")}><ArrowLeft size={14} /> Change email</button><button type="button" onClick={() => void resend()} disabled={busy}>Resend code</button></div>}
          {mode === "legacy" && <button className="account-switch" type="button" onClick={() => changeMode("signin")}><ArrowLeft size={14} /> Back to email sign-in</button>}
        </>
      )}
      {account && error && <p className="account-error" role="alert">{error}</p>}
    </div>
  );
}
