"use client";
import { useEffect, useState } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Mail,
  MessageSquare,
  Fingerprint,
  Download,
  Trash2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Monitor,
  Key,
  Plus,
  XCircle,
  LogOut,
} from "lucide-react";
import { FieldHelp } from "@/components/ui";

interface Props {
  twoFactorEnabled: boolean;
  preferredMfaMethod: string | null;
  backupCodesRemaining: number;
  webauthnCount: number;
  hasPhone: boolean;
  email: string;
  initialSessions: SessionRow[];
  initialApiKeys: ApiKeyRow[];
}

type SecurityEvent = {
  id: string;
  type: string;
  success: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

type SessionRow = {
  id: string;
  device: string | null;
  ip: string | null;
  lastSeen: string;
  createdAt: string;
};

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export default function SecurityClient(props: Props) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(props.twoFactorEnabled);
  const [webauthnCount, setWebauthnCount] = useState(props.webauthnCount);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>(props.initialSessions);
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>(props.initialApiKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<{ key: string; prefix: string } | null>(null);
  const [newKeyCopied, setNewKeyCopied] = useState(false);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [setupState, setSetupState] = useState<
    | { phase: "idle" }
    | { phase: "scanning"; secret: string; qr: string }
    | { phase: "verified"; backupCodes: string[] }
  >({ phase: "idle" });
  const [verifyToken, setVerifyToken] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    fetch("/api/auth/security-events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => {});
  }, []);

  function flash(kind: "ok" | "err", text: string) {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  }

  // ── 2FA setup ──────────────────────────────────────────────────────────────

  async function startSetup() {
    setMsg(null);
    const res = await fetch("/api/auth/2fa/setup");
    const data = await res.json();
    if (!res.ok) return flash("err", data.error ?? "Setup failed");
    setSetupState({ phase: "scanning", secret: data.secret, qr: data.qr });
  }

  async function confirmSetup() {
    if (setupState.phase !== "scanning") return;
    const res = await fetch("/api/auth/2fa/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: verifyToken }),
    });
    const data = await res.json();
    if (!res.ok) return flash("err", data.error ?? "Invalid code");
    setSetupState({ phase: "verified", backupCodes: data.backupCodes });
    setTwoFactorEnabled(true);
    setVerifyToken("");
    flash("ok", "2FA is now active");
  }

  async function disable2fa() {
    const res = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: disablePassword, token: disableToken }),
    });
    const data = await res.json();
    if (!res.ok) return flash("err", data.error ?? "Disable failed");
    setTwoFactorEnabled(false);
    setShowDisable(false);
    setDisablePassword("");
    setDisableToken("");
    flash("ok", "2FA disabled");
  }

  // ── WebAuthn ───────────────────────────────────────────────────────────────

  async function enrollBiometric() {
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optsRes = await fetch("/api/auth/webauthn/register");
      const opts = await optsRes.json();
      if (!optsRes.ok) return flash("err", opts.error ?? "Could not start enrollment");
      const attResp = await startRegistration({ optionsJSON: opts });
      const verify = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response: attResp, label: guessDeviceLabel() }),
      });
      const data = await verify.json();
      if (!verify.ok) return flash("err", data.error ?? "Enrollment failed");
      setWebauthnCount((n) => n + 1);
      flash("ok", "Biometric device enrolled");
    } catch (e) {
      console.error(e);
      flash("err", "Your device declined biometric enrollment");
    }
  }

  // ── Backup codes ───────────────────────────────────────────────────────────

  function downloadBackupCodes(codes: string[]) {
    const blob = new Blob(
      [`Poll City — 2FA Backup Codes\n\n${codes.join("\n")}\n\nKeep these safe. Each code can be used once.\n`],
      { type: "text/plain" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "poll-city-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copyBackupCodes(codes: string[]) {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Sessions ───────────────────────────────────────────────────────────────

  async function refreshSessions() {
    const r = await fetch("/api/auth/sessions");
    const d = await r.json();
    setSessions(d.sessions ?? []);
  }

  async function revokeSession(id: string) {
    const r = await fetch(`/api/auth/sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) return flash("err", "Could not revoke session");
    setSessions((prev) => prev.filter((s) => s.id !== id));
    flash("ok", "Session revoked");
  }

  async function revokeAllSessions() {
    setRevokingAll(true);
    const r = await fetch("/api/auth/sessions?all=true", { method: "DELETE" });
    setRevokingAll(false);
    if (!r.ok) return flash("err", "Could not revoke sessions");
    setSessions([]);
    flash("ok", "All sessions ended — you will be signed out shortly");
    // Redirect to login after a brief pause
    setTimeout(() => { window.location.href = "/login"; }, 2000);
  }

  // ── API Keys ───────────────────────────────────────────────────────────────

  async function generateKey() {
    if (!newKeyName.trim()) return;
    const r = await fetch("/api/auth/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });
    const d = await r.json();
    if (!r.ok) return flash("err", d.error ?? "Could not create key");
    setNewKeyResult({ key: d.key, prefix: d.keyPrefix });
    setApiKeys((prev) => [{ id: d.id, name: d.name, keyPrefix: d.keyPrefix, lastUsedAt: null, createdAt: d.createdAt }, ...prev]);
    setNewKeyName("");
    setShowNewKeyForm(false);
  }

  async function revokeApiKey(id: string) {
    const r = await fetch(`/api/auth/api-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) return flash("err", "Could not revoke key");
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    flash("ok", "API key revoked");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6 pb-[env(safe-area-inset-bottom)]">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Security</h1>
        <p className="text-sm text-slate-600">Protect your account with two-factor authentication, sessions, and API keys.</p>
      </header>

      {msg && (
        <div
          className={`rounded-lg p-3 text-sm ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}
        >
          {msg.text}
        </div>
      )}

      {/* ── 2FA Section ────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${twoFactorEnabled ? "bg-emerald-100" : "bg-slate-100"}`}>
            {twoFactorEnabled ? <ShieldCheck className="w-5 h-5 text-emerald-700" /> : <Shield className="w-5 h-5 text-slate-500" />}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">Two-factor authentication</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {twoFactorEnabled ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <Check className="w-3 h-3" /> Enabled
                  </span>
                  <span className="ml-2">Method: {labelForMethod(props.preferredMfaMethod)}</span>
                </>
              ) : (
                <>Add a second factor to protect voter data.</>
              )}
            </p>
          </div>
        </div>

        {!twoFactorEnabled && setupState.phase === "idle" && (
          <button
            onClick={startSetup}
            className="w-full md:w-auto h-12 px-5 rounded-lg bg-blue-700 text-white font-semibold hover:bg-blue-800 active:bg-blue-900"
          >
            Enable 2FA
          </button>
        )}

        {setupState.phase === "scanning" && (
          <div className="space-y-4 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-700">
              Scan this QR code with Google Authenticator, Authy, or 1Password. Or enter the key manually.
            </p>
            <div className="flex flex-col md:flex-row gap-4 items-center md:items-start">
              <img src={setupState.qr} alt="2FA QR code" className="w-48 h-48 rounded-lg border border-slate-200" />
              <div className="flex-1 w-full">
                <label className="text-xs font-semibold text-slate-500 uppercase">Manual entry key</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 text-xs md:text-sm font-mono bg-slate-100 rounded px-2 py-2 break-all">{setupState.secret}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(setupState.secret)}
                    className="h-10 w-10 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                    aria-label="Copy key"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Enter the 6-digit code from your app</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 h-12 px-3 text-lg font-mono tabular-nums border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  placeholder="000000"
                />
                <button
                  onClick={confirmSetup}
                  disabled={verifyToken.length !== 6}
                  className="h-12 px-5 rounded-lg bg-blue-700 text-white font-semibold disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {setupState.phase === "verified" && (
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-900">
              <strong>Save these backup codes.</strong> Each can be used once if you lose your device.
            </div>
            <div className="grid grid-cols-2 gap-2">
              {setupState.backupCodes.map((c) => (
                <code key={c} className="text-sm font-mono bg-slate-100 rounded px-2 py-2 text-center">{c}</code>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadBackupCodes(setupState.backupCodes)}
                className="flex-1 h-11 rounded-lg border-2 border-slate-300 font-semibold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={() => copyBackupCodes(setupState.backupCodes)}
                className="flex-1 h-11 rounded-lg border-2 border-slate-300 font-semibold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => setSetupState({ phase: "idle" })}
                className="h-11 px-4 rounded-lg bg-blue-700 text-white font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {twoFactorEnabled && setupState.phase === "idle" && (
          <>
            <div className="text-sm text-slate-600 space-y-1">
              <p>{props.backupCodesRemaining} backup codes remaining</p>
            </div>
            {!showDisable ? (
              <button
                onClick={() => setShowDisable(true)}
                className="w-full md:w-auto h-11 px-4 rounded-lg border-2 border-red-300 text-red-700 font-semibold hover:bg-red-50 flex items-center gap-2 justify-center"
              >
                <ShieldOff className="w-4 h-4" /> Disable 2FA
              </button>
            ) : (
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600">Enter your current password and the 6-digit code from your authenticator app to confirm.</p>
                <input
                  type="password"
                  placeholder="Current password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="w-full h-12 px-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  autoComplete="current-password"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="6-digit authenticator code"
                  maxLength={6}
                  value={disableToken}
                  onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-12 px-3 font-mono tabular-nums border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDisable(false)}
                    className="flex-1 h-11 rounded-lg border-2 border-slate-300 font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={disable2fa}
                    disabled={!disablePassword || disableToken.length !== 6}
                    className="flex-1 h-11 rounded-lg bg-red-700 text-white font-semibold disabled:opacity-50"
                  >
                    Disable 2FA
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── WebAuthn Section ───────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-violet-700" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">Biometric login</h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Use Face ID, Touch ID, Windows Hello, or a hardware key. {webauthnCount} device{webauthnCount === 1 ? "" : "s"} enrolled.
            </p>
          </div>
        </div>
        <button
          onClick={enrollBiometric}
          className="w-full md:w-auto h-12 px-5 rounded-lg bg-violet-700 text-white font-semibold hover:bg-violet-800"
        >
          Add this device
        </button>
      </section>

      {/* ── Verification method ────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <h2 className="font-bold text-slate-900 mb-3">Verification method</h2>
        <div className="space-y-2">
          <MethodRow
            icon={Smartphone}
            title="Authenticator app"
            description="Most secure — works offline"
            badge="Recommended"
          />
          <MethodRow icon={Mail} title="Email code" description={props.email} />
          <MethodRow
            icon={MessageSquare}
            title="SMS code"
            description={props.hasPhone ? "Sent to your registered phone" : "Add a phone number in your profile"}
            disabled={!props.hasPhone}
          />
        </div>
      </section>

      {/* ── Active Sessions ────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-slate-500" />
            <h2 className="font-bold text-slate-900">Active sessions</h2>
          </div>
          <button
            onClick={refreshSessions}
            className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center"
            aria-label="Refresh sessions"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No active sessions recorded.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <li key={s.id} className="py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Monitor className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{s.device ?? "Unknown device"}</p>
                  <p className="text-xs text-slate-500 truncate">
                    Last seen {new Date(s.lastSeen).toLocaleString()}
                    {s.ip ? ` · ${s.ip}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => revokeSession(s.id)}
                  className="h-8 px-3 text-xs font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-50 shrink-0"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={revokeAllSessions}
            disabled={revokingAll || sessions.length === 0}
            className="h-10 px-4 text-sm font-semibold text-red-700 border-2 border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {revokingAll ? "Signing out…" : "Sign out of all devices"}
          </button>
        </div>
      </section>

      {/* ── Login History ──────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">Login & security activity</h2>
          <button
            onClick={() =>
              fetch("/api/auth/security-events")
                .then((r) => r.json())
                .then((d) => setEvents(d.events ?? []))
            }
            className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((ev) => (
              <li key={ev.id} className="py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${ev.success ? "bg-emerald-500" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{prettyEvent(ev.type)}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {new Date(ev.createdAt).toLocaleString()}
                    {ev.ip ? ` · ${ev.ip}` : ""}
                  </p>
                </div>
                <span className={`text-xs font-semibold ${ev.success ? "text-emerald-700" : "text-red-700"}`}>
                  {ev.success ? "OK" : "Failed"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── API Keys ───────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-slate-500" />
            <div>
              <h2 className="font-bold text-slate-900">API keys</h2>
              <p className="text-xs text-slate-500">For automated integrations and scripts</p>
            </div>
          </div>
          <button
            onClick={() => { setShowNewKeyForm(true); setNewKeyResult(null); }}
            className="h-9 px-3 rounded-lg bg-blue-700 text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-blue-800"
          >
            <Plus className="w-4 h-4" /> New key
          </button>
        </div>

        {/* New key form */}
        {showNewKeyForm && (
          <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <label className="block text-sm font-semibold text-slate-700 inline-flex items-center gap-1">
              Key name
              <FieldHelp content="A label for this API key so you remember what it's used for. Only you see this." example="Zapier integration, Reporting script, Mobile app" />
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Zapier integration"
                className="flex-1 h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none text-sm"
                maxLength={100}
              />
              <button
                onClick={generateKey}
                disabled={!newKeyName.trim()}
                className="h-11 px-4 rounded-lg bg-blue-700 text-white font-semibold text-sm disabled:opacity-50"
              >
                Generate
              </button>
              <button
                onClick={() => setShowNewKeyForm(false)}
                className="h-11 px-3 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Key reveal — one-time display */}
        {newKeyResult && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
            <p className="text-sm font-semibold text-amber-900">
              Copy this key now — it will never be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-white border border-amber-200 rounded px-3 py-2 break-all">{newKeyResult.key}</code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(newKeyResult.key);
                  setNewKeyCopied(true);
                  setTimeout(() => setNewKeyCopied(false), 2000);
                }}
                className="h-10 w-10 rounded-lg border border-amber-300 flex items-center justify-center text-amber-800 hover:bg-amber-100"
                aria-label="Copy key"
              >
                {newKeyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => setNewKeyResult(null)}
              className="text-xs text-amber-800 underline"
            >
              I&apos;ve saved it
            </button>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <p className="text-sm text-slate-500">No API keys yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {apiKeys.map((k) => (
              <li key={k.id} className="py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Key className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{k.name}</p>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {k.keyPrefix}… · Created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · Never used"}
                  </p>
                </div>
                <button
                  onClick={() => revokeApiKey(k.id)}
                  className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-red-600 hover:bg-red-50 shrink-0"
                  aria-label="Revoke key"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── PIPEDA + delete ────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 space-y-4">
        <h2 className="font-bold text-slate-900">Your data (PIPEDA)</h2>
        <div className="flex flex-col md:flex-row gap-2">
          <a
            href="/api/auth/data-export"
            className="flex-1 h-12 rounded-lg border-2 border-slate-300 font-semibold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> Download my data
          </a>
        </div>
        <div className="border-t border-red-100 pt-4">
          <h3 className="font-semibold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Delete account
          </h3>
          <p className="text-sm text-slate-600 mt-1">This is permanent. Your campaigns and contacts remain with their owners.</p>
          <button className="mt-3 h-11 w-full md:w-auto px-4 rounded-lg border-2 border-red-300 text-red-700 font-semibold hover:bg-red-50 flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete my account
          </button>
        </div>
      </section>
    </div>
  );
}

function MethodRow({
  icon: Icon,
  title,
  description,
  badge,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border border-slate-200 ${disabled ? "opacity-60" : ""}`}>
      <Icon className="w-5 h-5 text-slate-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900 truncate">{title}</p>
        <p className="text-xs text-slate-500 truncate">{description}</p>
      </div>
      {badge && (
        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );
}

function labelForMethod(m: string | null): string {
  if (m === "totp") return "Authenticator app";
  if (m === "email") return "Email code";
  if (m === "sms") return "SMS code";
  if (m === "webauthn") return "Biometric";
  return "Not set";
}

function prettyEvent(t: string): string {
  const map: Record<string, string> = {
    login_success: "Signed in",
    login_fail: "Failed sign-in",
    login_locked: "Account locked",
    "2fa_setup": "Enabled 2FA",
    "2fa_success": "2FA verified",
    "2fa_fail": "2FA failed",
    "2fa_disabled": "Disabled 2FA",
    email_otp_sent: "Email code sent",
    email_otp_success: "Email code verified",
    email_otp_fail: "Email code failed",
    sms_otp_sent: "SMS code sent",
    sms_otp_success: "SMS code verified",
    sms_otp_fail: "SMS code failed",
    password_change: "Password changed",
    password_reset_request: "Password reset requested",
    password_reset_complete: "Password reset completed",
    webauthn_register: "Biometric device added",
    webauthn_auth: "Signed in with biometrics",
    webauthn_fail: "Biometric failed",
    data_export: "Data exported",
    account_deleted: "Account deleted",
    session_revoked: "Session revoked",
    ip_blocked: "IP blocked",
  };
  return map[t] ?? t;
}

function guessDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Device";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iPhone / iPad";
  if (/Mac/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  return "This device";
}
