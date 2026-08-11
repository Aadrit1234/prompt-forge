import { useRef, useState } from "react";
import { Clock, Download, History, Search, Star, Trash2, Upload, X, BarChart3 } from "lucide-react";
import { timeAgo } from "../lib/utils.js";

export default function HistorySection({
  history,
  stats,
  onLoad,
  onDelete,
  onTogglePin,
  onClear,
  onExport,
  onImport,
}) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);
  const noticeTimer = useRef(null);

  const filtered = query.trim()
    ? history.filter((h) => {
        const q = query.trim().toLowerCase();
        return (
          (h.input || "").toLowerCase().includes(q) ||
          (h.domain || "").toLowerCase().includes(q) ||
          (h.output || "").toLowerCase().includes(q)
        );
      })
    : history;

  function flashNotice(msg) {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await onImport(file);
    if (res?.ok) {
      flashNotice(
        res.added > 0
          ? `imported ${res.added} prompt${res.added === 1 ? "" : "s"}`
          : "everything in that file was already here"
      );
    } else {
      flashNotice(`import failed — ${res?.error || "couldn't read the file"}`);
    }
    e.target.value = "";
  }

  return (
    <section className="history" aria-label="Recent prompts">
      <div className="history-head">
        <span className="history-title">
          <History size={13} />
          recent prompts
        </span>

        <div className="history-tools">
          <div className="history-search">
            <Search size={12} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label="Search history"
            />
            {query && (
              <button
                type="button"
                className="history-tool-btn"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button type="button" className="history-tool-btn" onClick={onExport} title="Export history as JSON">
            <Download size={13} />
          </button>
          <button
            type="button"
            className="history-tool-btn"
            onClick={() => fileRef.current?.click()}
            title="Import history from JSON"
          >
            <Upload size={13} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={handleImportFile}
            aria-label="Import history file"
          />
          <button
            type="button"
            className="history-tool-btn danger"
            onClick={onClear}
            title="Clear all history"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {notice && <p className="history-notice">{notice}</p>}

      {stats && (
        <div className="history-stats">
          <span>
            <BarChart3 size={12} />
            {stats.count} prompt{stats.count === 1 ? "" : "s"} forged
          </span>
          <span>
            top domain: <strong>{stats.topDomain}</strong> ({stats.topCount})
          </span>
          <span>
            ≈ {stats.totalTokens.toLocaleString()} tokens forged
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="history-empty">
          {query.trim() ? `no prompts match “${query.trim()}”` : "no prompts yet — forge one to get started"}
        </p>
      ) : (
        <div className="history-scroll">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`history-card ${item.pinned ? "pinned" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => onLoad(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onLoad(item);
                }
              }}
            >
              <div className="history-card-top">
                <span className="history-domain">
                  {item.pinned && <Star size={10} fill="currentColor" style={{ verticalAlign: "-1px", marginRight: 4 }} />}
                  {item.domain}
                </span>
                <span className="history-card-actions">
                  <button
                    type="button"
                    className={`history-pin ${item.pinned ? "active" : ""}`}
                    aria-label={item.pinned ? "Unpin" : "Pin"}
                    title={item.pinned ? "Unpin" : "Pin this prompt"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(item.id);
                    }}
                  >
                    <Star size={13} fill={item.pinned ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    className="history-delete"
                    aria-label="Delete"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                  >
                    <X size={13} />
                  </button>
                </span>
              </div>
              <p className="history-input">{item.input}</p>
              <span className="history-time">
                <Clock size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                {timeAgo(item.ts)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
