"use client";

import Image from "next/image";
import { Eye, EyeSlash, GoogleLogo } from "@phosphor-icons/react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { currentAccount, requestEmailCode, requestPasswordReset, signIn, signInWithGoogle, signOut, signUp, subscribeAccount, verifyEmailCode, type Account } from "@/lib/saves";

type Mode = "signin" | "create" | "code" | "reset" | "reset-code";
type Purpose = "signup" | "signin" | "recovery";

export default function AccountMenu({
  onChange,
}: {
  campaignCount: number;
  onChange?: () => void;
}) {
  const [account, setAccount] = useState<Account | null>(currentAccount());
  const [mode, setMode] = useState<Mode>("signin");
  const [purpose, setPurpose] = useState<Purpose>("signin");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("auth_error") ? "Google sign-in could not finish. Try again." : "");
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
    setCode("");
    setPassword("");
    setShowPassword(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "code" || mode === "reset-code") {
        await verifyEmailCode(email, code, purpose, mode === "reset-code" ? password : undefined);
        setCode("");
        setPassword("");
      } else if (mode === "reset") {
        await requestPasswordReset(email);
        setPurpose("recovery");
        setMode("reset-code");
        setPassword("");
        setCode("");
      } else if (mode === "create") {
        const result = await signUp(username, email, password);
        if ("pending" in result) {
          setEmail(result.email);
          setPurpose("signup");
          setMode("code");
          setPassword("");
          setCode("");
        }
      } else {
        const result = await signIn(username, password);
        if ("pending" in result) {
          setEmail(result.email);
          setPurpose("signin");
          setMode("code");
          setPassword("");
          setCode("");
        }
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
    try {
      await signInWithGoogle();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start Google sign-in.");
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError("");
    try {
      await requestEmailCode(email, purpose);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  }

  const heading = account
    ? account.displayName
    : mode === "create"
      ? "Create account"
      : mode === "code"
        ? "Enter code"
        : mode === "reset" || mode === "reset-code"
          ? "Reset password"
          : "Sign in";
  const passwordLabel = mode === "reset-code" ? "New password" : "Password";

  return (
    <div className="account-panel">
      <div className="account-heading">
        <Image src="/novus-logo.svg" width={28} height={28} alt="" />
        <h2 id={titleId}>{heading}</h2>
      </div>

      {account ? (
        <>
          {account.email && <p className="account-identity">{account.email}</p>}
          <button className="outline-button" type="button" onClick={() => { void signOut().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not sign out.")); }}>Sign out</button>
          {error && <p className="account-error" role="alert">{error}</p>}
        </>
      ) : (
        <>
          <form className="account-form" onSubmit={(event) => void submit(event)}>
            {mode === "signin" && (
              <label>
                Username or email
                <input name="username" autoComplete="username" value={username} maxLength={254} required onChange={(event) => setUsername(event.target.value)} />
              </label>
            )}
            {mode === "create" && (
              <>
                <label>
                  Username
                  <input name="username" autoComplete="username" value={username} maxLength={20} required onChange={(event) => setUsername(event.target.value)} />
                </label>
                <label>
                  Email
                  <input name="email" type="email" autoComplete="email" value={email} maxLength={254} required onChange={(event) => setEmail(event.target.value)} />
                </label>
              </>
            )}
            {mode === "reset" && (
              <label>
                Email
                <input name="email" type="email" autoComplete="email" value={email} maxLength={254} required onChange={(event) => setEmail(event.target.value)} />
              </label>
            )}
            {(mode === "code" || mode === "reset-code") && (
              <label>
                Confirmation code
                <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} value={code} required onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
              </label>
            )}
            {(mode === "signin" || mode === "create" || mode === "reset-code") && (
              <label>
                {passwordLabel}
                <span className="secret-field">
                  <input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} minLength={8} maxLength={72} required onChange={(event) => setPassword(event.target.value)} />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeSlash /> : <Eye />}</button>
                </span>
              </label>
            )}
            {error && <p className="account-error" role="alert">{error}</p>}
            <button className="outline-button" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "code" || mode === "reset-code" ? "Verify" : mode === "reset" ? "Send code" : mode === "create" ? "Create account" : "Sign in"}
            </button>
          </form>
          {(mode === "signin" || mode === "create") && (
            <button className="outline-button" type="button" onClick={() => void google()} disabled={busy}><GoogleLogo size={18} weight="bold" /> Google</button>
          )}
          <div className="account-links">
            {mode === "signin" && (
              <>
                <button className="subtle-button" type="button" onClick={() => changeMode("create")}>Need an account? Create one</button>
                <button className="subtle-button" type="button" onClick={() => changeMode("reset")}>Forgot password?</button>
              </>
            )}
            {mode === "create" && <button className="subtle-button" type="button" onClick={() => changeMode("signin")}>Already have an account? Sign in</button>}
            {(mode === "code" || mode === "reset-code") && (
              <>
                <button className="subtle-button" type="button" onClick={() => void resend()} disabled={busy}>Resend code</button>
                <button className="subtle-button" type="button" onClick={() => changeMode(mode === "reset-code" ? "reset" : purpose === "signup" ? "create" : "signin")}>Back</button>
              </>
            )}
            {mode === "reset" && <button className="subtle-button" type="button" onClick={() => changeMode("signin")}>Back to sign in</button>}
          </div>
        </>
      )}
    </div>
  );
}
