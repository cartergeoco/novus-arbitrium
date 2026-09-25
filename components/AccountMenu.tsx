"use client";

import Image from "next/image";
import { useEffect, useId, useState, type FormEvent } from "react";
import { CAMPAIGN_SLOTS } from "@/lib/accounts";
import { currentAccount, signIn, signOut, signUp, subscribeAccount, type Account } from "@/lib/saves";

export default function AccountMenu({
  campaignCount,
  onChange,
}: {
  campaignCount: number;
  onChange?: () => void;
}) {
  const [account, setAccount] = useState<Account | null>(currentAccount());
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const titleId = useId();

  useEffect(() => subscribeAccount(() => {
    setAccount(currentAccount());
    onChange?.();
  }), [onChange]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await (creating ? signUp : signIn)(username, password);
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  if (account) {
    return (
      <div className="account-panel">
        <div className="account-heading">
          <Image src="/novus-logo.svg" width={36} height={36} alt="" />
          <div>
            <h2 id={titleId}>{account.username}</h2>
            <p>{campaignCount} of {CAMPAIGN_SLOTS} campaign slots</p>
          </div>
        </div>
        <button className="account-action" type="button" onClick={() => { setCreating(false); setPassword(""); void signOut(); }}>Sign out</button>
      </div>
    );
  }

  return (
    <form className="account-panel" onSubmit={(event) => void submit(event)}>
      <div className="account-heading">
        <Image src="/novus-logo.svg" width={36} height={36} alt="" />
        <div>
          <h2 id={titleId}>{creating ? "Create account" : "Sign in"}</h2>
          <p>{CAMPAIGN_SLOTS} campaign slots per account</p>
        </div>
      </div>
      <label>
        Username
        <input
          name="username"
          autoComplete="username"
          value={username}
          maxLength={20}
          required
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={creating ? "new-password" : "current-password"}
          value={password}
          minLength={8}
          maxLength={72}
          required
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error && <p className="account-error" role="alert">{error}</p>}
      <button className="outline-button" type="submit" disabled={busy}>{busy ? "Please wait…" : creating ? "Create account" : "Sign in"}</button>
      <button className="account-switch" type="button" onClick={() => { setCreating((value) => !value); setError(""); }}>
        {creating ? "Already have an account? Sign in" : "Need an account? Create one"}
      </button>
    </form>
  );
}
