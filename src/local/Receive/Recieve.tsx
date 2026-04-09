import { useTheme } from "../Context/Theme";
import { useEffect, useState, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useQrContext } from "../Context/QrContext";
import QRCode from "qrcode";
import { flushSync } from "react-dom";
import { ProgressUpdatePayload, TransferRequest, SendFileResponse } from "../types";

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
      className={`rounded-2xl p-4 border ${dark
        ? "bg-[#1a1d2a] border-[#2a2d3e] text-white"
        : "bg-white border-gray-200"
        } shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${dark ? "bg-[#2a2d3e] text-[#c4c9de]" : "bg-gray-100 text-gray-600"
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
          className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${copied
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
        className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${dark ? "text-slate-200" : "text-gray-800"
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
      className={`rounded-2xl p-4 border ${dark
        ? "bg-[#1a1d2a] border-[#2a2d3e] text-white"
        : "bg-white border-gray-200"
        } shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${dark
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
            className={`text-sm font-semibold truncate ${dark ? "white" : "text-gray-900"}`}
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
      className={`rounded-2xl p-5 border-2 ${dark
        ? "bg-indigo-500/5 border-indigo-500/25 shadow-lg shadow-indigo-900/20 text-white"
        : "bg-blue-50 border-blue-100 shadow-sm"
        } transition-all duration-500 animate-in zoom-in-95`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${dark ? "bg-[#2a2d3e]" : "bg-white"
              }`}
          >
            {request.type === "file" ? "📁" : "💬"}
          </div>
          <div>
            <h3
              className={`text-sm font-bold ${dark ? "white" : "text-gray-900"}`}
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
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${dark
            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
            : "bg-blue-500/10 text-blue-600"
            }`}
        >
          Pending
        </span>
      </div>

      {request.type === "file" && (
        <div
          className={`p-3 rounded-xl border mb-4 ${dark ? "bg-[#13151f] border-[#2a2d3e]" : "bg-white border-blue-100"
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
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${dark
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function Recieve() {
  const { isTheme: dark } = useTheme();
  const { setQrCode, setQrText, setServerStatus, serverStatus } =
    useQrContext();
  const [items, setItems] = useState<ReceivedItem[]>([]);
  const startedRef = useRef(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const isRunning = serverStatus === "active";
  const starting = serverStatus === "starting";

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [items]);

  const startServer = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setServerStatus("starting");
    try {
      const resp = await invoke<SendFileResponse>("recv");
      if (resp?.Success?.ip) {
        const { ip, port, encryption } = resp.Success;
        const url = `${encryption ? "https" : "http"}://${ip}:${port}`;
        flushSync(() => setQrText(url));
        const svg = await QRCode.toString(url, { type: "svg" });
        setQrCode(svg);
        setServerStatus("active");
      }
    } catch (err) {
      console.error("Failed to start receive server:", err);
      startedRef.current = false;
      setServerStatus("closed");
    }
  }, [setQrCode, setQrText, setServerStatus]);

  const clearItems = () => setItems([]);

  useEffect(() => {
    // Force a start whenever the component mounts (tab switch to Receive)
    // This ensures invoke("recv") is called to switch backend mode specifically for this view.
    startServer();
    // We don't stop the server on unmount anymore to allow background receiving
  }, [startServer]);

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
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto pt-8 sm:pt-10 px-4 sm:px-6 flex flex-col items-center"
      >
        <div className="w-full max-w-4xl pb-24">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <div>
              <h1
                className={`text-xl sm:text-2xl font-bold ${dark ? "text-white" : "text-gray-800"}`}
              >
                Received
              </h1>
              <p
                className={`text-sm mt-1 ${dark ? "!text-[#c4c9de]" : "!text-[#9097b0]"}`}
              >
                Manage your incoming transfers
              </p>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearItems}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg transition-colors ${dark
                  ? "text-gray-400 hover:text-red-400 bg-gray-500/10"
                  : "text-gray-500 hover:text-red-600 bg-gray-100"
                  }`}
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-3">
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

            {!isRunning && !starting && items.length === 0 && (
              <div
                className={`flex flex-col items-center py-20 gap-4 ${dark ? "text-gray-500" : "text-gray-400"}`}
              >
                <div className="w-16 h-16 rounded-full bg-gray-500/5 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 opacity-20"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">Server Offline</p>
                  <p className="text-xs mt-1">
                    Start the server to receive files
                  </p>
                </div>
              </div>
            )}

            {isRunning && items.length === 0 && (
              <div
                className={`flex flex-col items-center py-20 gap-4 ${dark ? "text-indigo-400/60" : "text-indigo-300"}`}
              >
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20"></div>
                  <div className="relative w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 12h14m-7-7l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">Ready to Receive</p>
                  <p className="text-xs mt-1 opacity-60">
                    Waiting for incoming transfers...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
