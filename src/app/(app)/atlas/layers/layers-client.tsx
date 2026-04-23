"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ─── types ───────────────────────────────────────────────────────────────────

type PollingStationRow = {
  id: string;
  stationNumber: string;
  name: string;
  address: string;
  city?: string | null;
  wardName?: string | null;
  lat?: number | null;
  lng?: number | null;
  electorCount?: number | null;
  isAccessible: boolean;
  electionYear: string;
  hasPinDrop: boolean;
};

type PollingStats = {
  total: number;
  withCoordinates: number;
  withoutCoordinates: number;
  accessible: number;
};

type LayerOverview = {
  contacts: { total: number; doorsWithData: number } | null;
  signs: { total: number; installed: number } | null;
  polling: PollingStats | null;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const EXAMPLE_JSON = `[
  {
    "stationNumber": "001",
    "name": "Ward 1 Community Centre",
    "address": "123 Main St",
    "city": "Whitby",
    "wardName": "Ward 1",
    "lat": 43.8971,
    "lng": -78.9429,
    "electorCount": 1240,
    "isAccessible": true,
    "electionYear": "2026"
  }
]`;

// ─── component ───────────────────────────────────────────────────────────────

export default function LayersClient() {
  const [overview, setOverview] = useState<LayerOverview>({ contacts: null, signs: null, polling: null });
  const [stations, setStations] = useState<PollingStationRow[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [pasteValue, setPasteValue] = useState("");
  const [wardName, setWardName] = useState("");
  const [replaceMode, setReplaceMode] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestResult, setIngestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "polling" | "ingest">("overview");

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const [pollingRes] = await Promise.all([
        fetch("/api/atlas/polling-stations"),
      ]);
      const pollingData = pollingRes.ok ? await pollingRes.json() : null;
      setOverview(prev => ({
        ...prev,
        polling: pollingData?.stats ?? null,
      }));
      if (pollingData?.allStations) {
        setStations(pollingData.allStations as PollingStationRow[]);
      }
    } catch {
      // silent
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const handleIngest = async () => {
    setIngestResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(pasteValue.trim());
    } catch {
      setIngestResult({ ok: false, message: "Invalid JSON — check the format and try again." });
      return;
    }
    const stations = Array.isArray(parsed) ? parsed : [parsed];
    setIngestLoading(true);
    try {
      const res = await fetch("/api/atlas/polling-stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stations, replace: replaceMode, wardName: wardName.trim() || undefined }),
      });
      const data = await res.json() as { created?: number; message?: string; error?: string };
      if (!res.ok) {
        setIngestResult({ ok: false, message: data.error ?? "Ingest failed." });
      } else {
        setIngestResult({ ok: true, message: data.message ?? `${data.created ?? 0} stations ingested.` });
        setPasteValue("");
        void loadOverview();
      }
    } catch {
      setIngestResult({ ok: false, message: "Network error — please try again." });
    } finally {
      setIngestLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete all polling stations for this campaign? This cannot be undone.")) return;
    setDeleteLoading(true);
    try {
      await fetch(`/api/atlas/polling-stations${wardName.trim() ? `?wardName=${encodeURIComponent(wardName.trim())}` : ""}`, { method: "DELETE" });
      void loadOverview();
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── styles ────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "20px 24px",
  };
  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280",
  };
  const tab = (active: boolean): React.CSSProperties => ({
    padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
    background: active ? "#0A2342" : "transparent",
    color: active ? "#fff" : "#6b7280",
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

      {/* header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Link href="/atlas/map" style={{ color: "#1D9E75", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                ← Ontario Map
              </Link>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0A2342", margin: 0 }}>Map Layers</h1>
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>
              Manage what your campaign overlays on the atlas map — polling stations, signs, and contact data.
            </p>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 10, padding: 4, marginTop: 20, width: "fit-content" }}>
          {(["overview", "polling", "ingest"] as const).map(t => (
            <button key={t} style={tab(activeTab === t)} onClick={() => setActiveTab(t)}>
              {t === "overview" ? "Layer Status" : t === "polling" ? "Polling Stations" : "Ingest Data"}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>

              {/* contacts layer card */}
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#1D9E75", display: "inline-block" }} />
                  <span style={label}>Contact Data</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0A2342" }}>
                  {loadingOverview ? "…" : overview.contacts ? overview.contacts.total.toLocaleString() : "No data"}
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                  {overview.contacts ? `${overview.contacts.doorsWithData.toLocaleString()} doors have contact data` : "No canvass data yet — start canvassing to populate"}
                </div>
                <div style={{ marginTop: 12, padding: "6px 10px", background: overview.contacts ? "#ecfdf5" : "#f9fafb", borderRadius: 6, fontSize: 11, color: overview.contacts ? "#065f46" : "#9ca3af", fontWeight: 600 }}>
                  {overview.contacts ? "ACTIVE — visible on map when logged in" : "EMPTY — canvass to activate"}
                </div>
              </div>

              {/* signs layer card */}
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF9F27", display: "inline-block" }} />
                  <span style={label}>Signs Overlay</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0A2342" }}>
                  {loadingOverview ? "…" : overview.signs ? overview.signs.total.toLocaleString() : "No data"}
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                  {overview.signs ? `${overview.signs.installed.toLocaleString()} installed` : "Add signs with GPS coordinates to see them on the map"}
                </div>
                <div style={{ marginTop: 12, padding: "6px 10px", background: overview.signs ? "#fffbeb" : "#f9fafb", borderRadius: 6, fontSize: 11, color: overview.signs ? "#92400e" : "#9ca3af", fontWeight: 600 }}>
                  {overview.signs ? "ACTIVE — colour-coded by status" : "EMPTY — geo-tag signs to activate"}
                </div>
              </div>

              {/* polling layer card */}
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#0A2342", border: "1.5px solid #EF9F27", display: "inline-block" }} />
                  <span style={label}>Polling Stations</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0A2342" }}>
                  {loadingOverview ? "…" : overview.polling ? overview.polling.total.toLocaleString() : "0"}
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                  {overview.polling
                    ? `${overview.polling.withCoordinates.toLocaleString()} pinned · ${overview.polling.withoutCoordinates.toLocaleString()} without coords`
                    : "Ingest polling station data to show on the map"}
                </div>
                <div style={{ marginTop: 12, padding: "6px 10px", background: overview.polling?.total ? "#eff6ff" : "#f9fafb", borderRadius: 6, fontSize: 11, color: overview.polling?.total ? "#1e40af" : "#9ca3af", fontWeight: 600 }}>
                  {overview.polling?.total ? "ACTIVE — navy/amber pins on map" : "EMPTY — use Ingest tab to load"}
                </div>
              </div>
            </div>

            <div style={{ ...card, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#14532d", marginBottom: 4 }}>How map layers work</div>
              <div style={{ color: "#166534", fontSize: 13, lineHeight: 1.6 }}>
                When you select a ward on the Ontario Map, the map automatically loads layers that have data.
                Contact data drives the address dot colours (Dots / Support / DNK view modes).
                Signs and Polling Stations appear as independently togglable overlays.
                Anonymous visitors see ward boundaries only — campaign data is gated to your logged-in session.
              </div>
            </div>
          </motion.div>
        )}

        {/* ── POLLING STATIONS TAB ─────────────────────────────────────── */}
        {activeTab === "polling" && (
          <motion.div key="polling" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={label}>Polling Stations</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0A2342", marginTop: 2 }}>
                    {stations.length} stations
                    {overview.polling && <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280", marginLeft: 8 }}>
                      · {overview.polling.withCoordinates} pinned · {overview.polling.accessible} accessible
                    </span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setActiveTab("ingest")}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    + Ingest stations
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading || stations.length === 0}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: stations.length > 0 ? "pointer" : "not-allowed", opacity: stations.length === 0 ? 0.5 : 1 }}
                  >
                    {deleteLoading ? "Deleting…" : "Clear all"}
                  </button>
                </div>
              </div>

              {stations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🗳️</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No polling stations ingested yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Use the Ingest tab to load your ward&apos;s polling stations from Elections Ontario data.</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        {["#", "Name", "Address", "Ward", "Electors", "Pin", "Access"].map(h => (
                          <th key={h} style={{ ...label, padding: "6px 10px", textAlign: "left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stations.map(s => (
                        <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px 10px", color: "#6b7280", fontWeight: 600 }}>{s.stationNumber}</td>
                          <td style={{ padding: "8px 10px", color: "#0A2342", fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: "8px 10px", color: "#374151" }}>{s.address}{s.city ? `, ${s.city}` : ""}</td>
                          <td style={{ padding: "8px 10px", color: "#6b7280" }}>{s.wardName ?? "—"}</td>
                          <td style={{ padding: "8px 10px", color: "#374151", textAlign: "right" }}>{s.electorCount?.toLocaleString() ?? "—"}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: s.hasPinDrop ? "#ecfdf5" : "#f3f4f6", color: s.hasPinDrop ? "#065f46" : "#9ca3af" }}>
                              {s.hasPinDrop ? "Pinned" : "No GPS"}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ fontSize: 18 }}>{s.isAccessible ? "♿" : "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── INGEST TAB ───────────────────────────────────────────────── */}
        {activeTab === "ingest" && (
          <motion.div key="ingest" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>

              <div style={card}>
                <div style={label}>Paste JSON</div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4, marginBottom: 12 }}>
                  Paste an array of polling station objects. All fields except stationNumber, name, and address are optional.
                  lat/lng are needed for the map pin — stations without coordinates appear in the table but not on the map.
                </div>
                <textarea
                  value={pasteValue}
                  onChange={e => setPasteValue(e.target.value)}
                  placeholder={EXAMPLE_JSON}
                  style={{
                    width: "100%", minHeight: 280, fontFamily: "monospace", fontSize: 12, padding: "12px 14px",
                    border: "1px solid #d1d5db", borderRadius: 8, resize: "vertical", outline: "none",
                    background: "#f9fafb", color: "#111827", boxSizing: "border-box",
                  }}
                />

                <AnimatePresence>
                  {ingestResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{
                        marginTop: 10, padding: "10px 14px", borderRadius: 8, fontSize: 13,
                        background: ingestResult.ok ? "#ecfdf5" : "#fef2f2",
                        color: ingestResult.ok ? "#065f46" : "#991b1b",
                        border: `1px solid ${ingestResult.ok ? "#bbf7d0" : "#fca5a5"}`,
                        fontWeight: 600,
                      }}
                    >
                      {ingestResult.ok ? "✓ " : "✗ "}{ingestResult.message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleIngest}
                  disabled={ingestLoading || !pasteValue.trim()}
                  style={{
                    marginTop: 14, width: "100%", padding: "12px 16px", borderRadius: 10, border: "none",
                    background: pasteValue.trim() ? "#1D9E75" : "#e5e7eb",
                    color: pasteValue.trim() ? "#fff" : "#9ca3af",
                    fontSize: 14, fontWeight: 700, cursor: pasteValue.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  {ingestLoading ? "Ingesting…" : "Ingest Polling Stations"}
                </button>
              </div>

              {/* options panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={card}>
                  <div style={label}>Ingest Options</div>

                  <div style={{ marginTop: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                      Ward Name (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ward 1"
                      value={wardName}
                      onChange={e => setWardName(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                    <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}>
                      Used to scope replace/delete to one ward only.
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Replace existing</div>
                      <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 1 }}>
                        Soft-deletes current records for this ward before ingesting.
                      </div>
                    </div>
                    <button
                      onClick={() => setReplaceMode(v => !v)}
                      style={{ position: "relative", width: 40, height: 22, borderRadius: 11, border: "none", background: replaceMode ? "#EF9F27" : "#e5e7eb", cursor: "pointer", flexShrink: 0 }}
                    >
                      <span style={{ position: "absolute", top: 3, left: replaceMode ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", display: "block" }} />
                    </button>
                  </div>
                </div>

                <div style={{ ...card, background: "#fffbeb", border: "1px solid #fde68a" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>Required fields</div>
                  <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.7, fontFamily: "monospace" }}>
                    stationNumber: string<br />
                    name: string<br />
                    address: string<br />
                    <br />
                    <span style={{ color: "#9ca3af" }}>{'// Optional'}</span><br />
                    city?: string<br />
                    wardName?: string<br />
                    lat?: number<br />
                    lng?: number<br />
                    electorCount?: number<br />
                    isAccessible?: boolean<br />
                    electionYear?: string
                  </div>
                </div>

                <div style={{ ...card, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 6 }}>Where to get the data</div>
                  <div style={{ fontSize: 12, color: "#1d4ed8", lineHeight: 1.6 }}>
                    Ontario municipal polling station lists are published by your city clerk before each election.
                    Request the list as a spreadsheet, convert to JSON, and paste here.
                    Elections Ontario also publishes station lists for provincial elections.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
