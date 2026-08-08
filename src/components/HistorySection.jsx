import { Clock, History, X } from "lucide-react";
import { timeAgo } from "../lib/utils.js";

export default function HistorySection({ history, onLoad, onDelete }) {
  return (
    <section className="history" aria-label="Recent prompts">
      <div className="history-head">
        <History size={13} />
        recent prompts
      </div>
      <div className="history-scroll">
        {history.map((item) => (
          <div
            key={item.id}
            className="history-card"
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
              <span className="history-domain">{item.domain}</span>
              <button
                type="button"
                className="history-delete"
                aria-label="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
              >
                <X size={13} />
              </button>
            </div>
            <p className="history-input">{item.input}</p>
            <span className="history-time">
              <Clock size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              {timeAgo(item.ts)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
