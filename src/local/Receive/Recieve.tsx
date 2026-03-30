import { useTheme } from "../Context/Theme";
import { useEffect, useState, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useQrContext } from "../Context/QrContext";
import QRCode from "qrcode";
import { flushSync } from "react-dom";
import { ProgressUpdatePayload, TransferRequest } from "../types";


interface RecieveProps {
  canSwitch: boolean;
  setCanSwitch: (value: boolean) => void;
}

interface RecvResponse {
  Success: { ip: string | null; port: number };
}

type ReceivedItem =
  | { kind: "text"; id: string; content: string; at: string }
  | { kind: "file"; id: string; filename: string; progress: number; at: string }
  | { kind: "request"; id: string; request: TransferRequest; at: string };

function timestamp() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Text card ─────────────────────────────────────────────────────────────────

function TextCard({
  item,
  dark,
}: {
  item: Extract<ReceivedItem, { kind: "text" }>;
  dark: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div
      className={`rounded-2xl p-4 border ${
        dark ? "bg-[#1a1d2a] border-[#2a2d3e]" : "bg-white border-gray-200"
      } shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              dark ? "bg-[#2a2d3e] text-[#c4c9de]" : "bg-gray-100 text-gray-600"
            }`}
          >
            TEXT
          </span>
          <span
            className={`text-xs font-medium ${dark ? "text-[#9ba2c0]" : "text-gray-500"}`}
          >
            {item.at}
          </span>
        </div>
        <button
          onClick={copy}
          className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
            copied
              ? "bg-green-500 text-white"
              : dark
                ? "bg-[#2a2d3e] text-[#c4c9de] hover:bg-[#343748] hover:text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p
        className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${
          dark ? "text-slate-200" : "text-gray-800"
        }`}
      >
        {item.content}
      </p>
    </div>
  );
}

// ── File card ─────────────────────────────────────────────────────────────────

function FileCard({
  item,
  dark,
}: {
  item: Extract<ReceivedItem, { kind: "file" }>;
  dark: boolean;
}) {
  const done = item.progress >= 100;
  return (
    <div
      className={`rounded-2xl p-4 border ${
        dark ? "bg-[#1a1d2a] border-[#2a2d3e]" : "bg-white border-gray-200"
      } shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                dark
                  ? "bg-[#2a2d3e] text-[#c4c9de]"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              FILE
            </span>
            <span
              className={`text-xs ${dark ? "text-[#9ba2c0]" : "text-gray-500"}`}
            >
              {item.at}
            </span>
          </div>
          <p
            className={`text-sm font-semibold truncate ${dark ? "text-slate-100" : "text-gray-900"}`}
          >
            {item.filename}
          </p>
        </div>
        {done && (
          <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-full border border-green-500/20">
            ✓ Saved
          </span>
        )}
      </div>
      <div
        className={`h-1.5 w-full rounded-full ${dark ? "bg-[#2a2d3e]" : "bg-gray-100"}`}
      >
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${item.progress}%` }}
        />
      </div>
    </div>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────

function RequestCard({
  item,
  dark,
  onRespond,
}: {
  item: Extract<ReceivedItem, { kind: "request" }>;
  dark: boolean;
  onRespond: (id: string, accepted: boolean) => void;
}) {
  const { request } = item;
  return (
    <div
      className={`rounded-2xl p-5 border-2 ${
        dark
          ? "bg-indigo-500/5 border-indigo-500/25 shadow-lg shadow-indigo-900/20"
          : "bg-blue-50 border-blue-100 shadow-sm"
      } transition-all duration-500 animate-in zoom-in-95`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
              dark ? "bg-[#2a2d3e]" : "bg-white"
            }`}
          >
            {request.type === "file" ? "📁" : "💬"}
          </div>
          <div>
            <h3
              className={`text-sm font-bold ${dark ? "text-slate-100" : "text-gray-900"}`}
            >
              Transfer Request
            </h3>
            <p
              className={`text-xs ${dark ? "text-[#c4c9de]" : "text-gray-500"}`}
            >
              From{" "}
              <span className="font-semibold text-indigo-400">
                {request.device_name}
              </span>
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            dark
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              : "bg-blue-500/10 text-blue-600"
          }`}
        >
          Pending
        </span>
      </div>

      {request.type === "file" && (
        <div
          className={`p-3 rounded-xl border mb-4 ${
            dark ? "bg-[#13151f] border-[#2a2d3e]" : "bg-white border-blue-100"
          }`}
        >
          <p
            className={`text-sm font-medium truncate ${dark ? "text-slate-200" : "text-gray-700"}`}
          >
            {request.filename}
          </p>
          {request.filesize && (
            <p
              className={`text-[10px] mt-0.5 ${dark ? "text-[#9ba2c0]" : "text-gray-500"}`}
            >
              {(request.filesize / (1024 * 1024)).toFixed(2)} MB
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onRespond(request.id, false)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            dark
               ? "bg-[#2a2d3e] hover:bg-[#343748] text-[#c4c9de] hover:text-white border border-[#3a3f55]"
              : "bg-gray-100 hover:bg-gray-200 text-gray-600"
          }`}
        >
          Reject
        </button>
        <button
          onClick={() => onRespond(request.id, true)}
          className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30 transition-all"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

// ── QR + status panel ─────────────────────────────────────────────────────────

interface QrPanelProps {
  qrCode: string | null;
  qrText: string | null;
  dark: boolean;
  starting: boolean;
  isRunning: boolean;
  onStop: () => void;
  onStart: () => void;
  onClear: () => void;
  hasItems: boolean;
}

function QrPanel({
  qrCode,
  qrText,
  dark,
  starting,
  isRunning,
  onStop,
  onStart,
  onClear,
  hasItems,
}: QrPanelProps) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        dark ? "bg-[#1a1d2a] border-[#2a2d3e]" : "bg-white border-gray-200"
      } shadow-sm`}
    >
      {/* Collapsible header */}
      <div
        className={`flex items-center justify-between px-5 py-4 cursor-pointer select-none ${
          dark ? "hover:bg-[#212436]" : "hover:bg-gray-50"
        } transition-colors`}
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          {isRunning ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          ) : starting ? (
            <div className="w-2.5 h-2.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span
              className={`w-2.5 h-2.5 rounded-full ${dark ? "bg-[#3a3f55]" : "bg-gray-400"}`}
            />
          )}
          <span
            className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-900"}`}
          >
            {starting
              ? "Starting…"
              : isRunning
                ? "Ready to receive"
                : "Server stopped"}
          </span>
        </div>

        <div
          className="flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          {hasItems && (
            <button
              onClick={onClear}
              className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded transition-colors ${
                dark
                  ? "text-[#9ba2c0] hover:text-red-400"
                  : "text-gray-400 hover:text-red-500"
              }`}
            >
              Clear
            </button>
          )}
          <button
            onClick={isRunning ? onStop : onStart}
            disabled={starting}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all disabled:opacity-40 ${
              isRunning
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30"
            }`}
          >
            {isRunning ? "Stop" : "Start"}
          </button>
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""} ${
              dark ? "text-[#c4c9de]" : "text-gray-500"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {expanded && isRunning && (
        <div className="px-5 pb-5">
          {qrText && (
            <div
              className={`mb-3 text-[11px] font-mono p-2 rounded-lg ${
                dark
                  ? "bg-[#13151f] text-indigo-300 border border-[#2a2d3e]"
                  : "bg-gray-100 text-blue-600"
              }`}
            >
              {qrText}
            </div>
          )}
          <div
            className={`rounded-xl flex items-center justify-center p-3 ${
              dark ? "bg-white shadow-inner" : "border-2 border-gray-200"
            }`}
          >
            {qrCode ? (
              <div
                className="qr-container w-44 h-44"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Recieve({ setCanSwitch }: RecieveProps) {
  const { isTheme: dark } = useTheme();
  const { setQrCode, qrCode, setQrText, qrText } = useQrContext();
  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const startedRef = useRef(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [items]);

  const startServer = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarting(true);
    try {
      const resp = await invoke<RecvResponse>("recv");
      if (resp?.Success?.ip) {
        const { ip, port } = resp.Success;
        const url = `http://${ip}:${port}`;
        flushSync(() => setQrText(url));
        const svg = await QRCode.toString(url, { type: "svg" });
        setQrCode(svg);
        setIsRunning(true);
        setCanSwitch(false);
      }
    } catch (err) {
      console.error("Failed to start receive server:", err);
      startedRef.current = false;
    } finally {
      setStarting(false);
    }
  }, [setQrCode, setQrText, setCanSwitch]);

  const stopServer = useCallback(async () => {
    await invoke("stop_server");
    setIsRunning(false);
    setCanSwitch(true);
    setQrCode(null);
    setQrText(null);
    startedRef.current = false;
  }, [setQrCode, setQrText, setCanSwitch]);

  const clearItems = () => setItems([]);

  useEffect(() => {
    startServer();
    return () => {
      invoke("stop_server").catch(() => {});
      startedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let cancelled = false;
    listen<string>("received-text", (ev) => {
      setItems((prev) => [
        ...prev,
        {
          kind: "text",
          id: crypto.randomUUID(),
          content: ev.payload,
          at: timestamp(),
        },
      ]);
    }).then((fn) => {
      if (cancelled) fn();
      else unlistenFn = fn;
    });
    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, []);

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let cancelled = false;
    listen<ProgressUpdatePayload>("progress-update", (ev) => {
      const { id, filename, progress } = ev.payload;
      setItems((prev) => {
        const idx = prev.findIndex((it) => it.kind === "file" && it.id === id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...(next[idx] as Extract<ReceivedItem, { kind: "file" }>),
            progress,
          };
          return next;
        }
        return [
          ...prev,
          { kind: "file", id, filename, progress, at: timestamp() },
        ];
      });
    }).then((fn) => {
      if (cancelled) fn();
      else unlistenFn = fn;
    });
    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, []);

  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    let cancelled = false;
    listen<TransferRequest>("transfer-request", (ev) => {
      setItems((prev) => [
        ...prev,
        {
          kind: "request",
          id: ev.payload.id,
          request: ev.payload,
          at: timestamp(),
        },
      ]);
    }).then((fn) => {
      if (cancelled) fn();
      else unlistenFn = fn;
    });
    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, []);

  const handleRespond = async (id: string, accepted: boolean) => {
    await invoke("respond_to_transfer_request", { id, accepted });
    setItems((prev) =>
      prev.filter((it) => !(it.kind === "request" && it.id === id)),
    );
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden ${dark ? "bg-[#13151f]" : "bg-white"}`}
    >
      <div ref={feedRef} className="flex-1 overflow-y-auto px-4 pt-4">
        <div className="max-w-xl mx-auto space-y-3 pb-24">
          <QrPanel
            qrCode={qrCode}
            qrText={qrText}
            dark={dark}
            starting={starting}
            isRunning={isRunning}
            onStop={stopServer}
            onStart={startServer}
            onClear={clearItems}
            hasItems={items.length > 0}
          />

          {items.map((item) => {
            if (item.kind === "text")
              return <TextCard key={item.id} item={item} dark={dark} />;
            if (item.kind === "file")
              return <FileCard key={item.id} item={item} dark={dark} />;
            if (item.kind === "request")
              return (
                <RequestCard
                  key={item.id}
                  item={item}
                  dark={dark}
                  onRespond={handleRespond}
                />
              );
            return null;
          })}

          {isRunning && items.length === 0 && !starting && (
            <div
              className={`flex flex-col items-center py-12 gap-2 ${dark ? "text-[#9ba2c0]" : "text-gray-400"}`}
            >
              <p className="text-sm font-medium">No incoming transfers yet</p>
              <p className="text-xs">Waiting for files or text...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
