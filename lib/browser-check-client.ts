type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    execution: "execute";
    action: string;
    callback: (token: string) => void;
    "error-callback": () => void;
    "expired-callback": () => void;
  }) => string;
  execute: (id: string) => void;
  remove: (id: string) => void;
};

declare global { interface Window { turnstile?: Turnstile } }

let loading: Promise<Turnstile> | null = null;
let checking: Promise<void> | null = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) loading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce;
    if (nonce) script.nonce = nonce;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(Error("Browser verification did not load."));
    script.onerror = () => reject(Error("Browser verification could not load. Check your connection or browser extensions."));
    document.head.appendChild(script);
  }).catch((error) => { loading = null; throw error; });
  return loading;
}

async function challenge(sitekey: string) {
  const turnstile = await loadTurnstile();
  return new Promise<string>((resolve, reject) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    let id: string | undefined;
    let done = false;
    const timeout = window.setTimeout(() => finish(Error("Browser verification timed out. Please try again.")), 45_000);
    function finish(result: string | Error) {
      if (done) return;
      done = true;
      window.clearTimeout(timeout);
      if (id) turnstile.remove(id);
      container.remove();
      if (result instanceof Error) reject(result);
      else resolve(result);
    }
    try {
      id = turnstile.render(container, {
        sitekey, execution: "execute", action: "browser_check",
        callback: (token) => finish(token),
        "error-callback": () => finish(Error("Browser verification failed. Please try again.")),
        "expired-callback": () => finish(Error("Browser verification expired. Please try again.")),
      });
      turnstile.execute(id);
    } catch { finish(Error("Browser verification could not start.")); }
  });
}

async function check() {
  const status = await fetch("/api/browser-check", { cache: "no-store" });
  const state = await status.json() as { verified?: boolean; siteKey?: string | null; error?: string };
  if (!status.ok) throw Error(state.error || "Browser verification is unavailable.");
  if (state.verified) return;
  if (!state.siteKey) throw Error("Browser verification is not configured.");
  const token = await challenge(state.siteKey);
  const response = await fetch("/api/browser-check", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }), cache: "no-store",
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw Error(result.error || "Browser verification failed.");
}

export async function ensureBrowserCheck() {
  if (!checking) checking = check().finally(() => { checking = null; });
  return checking;
}
