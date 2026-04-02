import { useQrContext } from "../Context/QrContext";
import { useTheme } from "../Context/Theme";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import QRCode from "qrcode";
import { flushSync } from "react-dom";

export function StatusSource() {
  const { isTheme: dark } = useTheme();
  const { qrCode, qrText, serverStatus, setQrCode, setQrText, setServerStatus } = useQrContext();
  const [copied, setCopied] = useState(false);
  const [showFullQr, setShowFullQr] = useState(false);

  const copyIp = () => {
    if (qrText) {
      navigator.clipboard.writeText(qrText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleServer = async () => {
    if (serverStatus === "active") {
      await invoke("stop_server");
      setServerStatus("closed");
      setQrCode(null);
      setQrText(null);
    } else {
      setServerStatus("starting");
      try {
        // This is a bit tricky since "recv" and "send" might have different start logic
        // but they both use the same underlying server. 
        // For now, let's trigger a generic receive-like start if toggled manually.
        const resp: any = await invoke("recv");
        if (resp?.Success?.ip) {
          const { ip, port } = resp.Success;
          const url = `http://${ip}:${port}`;
          flushSync(() => setQrText(url));
          const svg = await QRCode.toString(url, { type: "svg" });
          setQrCode(svg);
          setServerStatus("active");
        }
      } catch (err) {
        console.error("Failed to start server:", err);
        setServerStatus("closed");
      }
    }
  };

  return (
    <div
      className={`w-full border-b transition-all duration-300 ${
        dark ? "bg-[#1a1d2a] border-[#2a2d3e]" : "bg-white border-[#e2e5ef]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            {serverStatus === "active" && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                serverStatus === "active"
                  ? "bg-green-500"
                  : serverStatus === "starting"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-gray-400"
              }`}
            ></span>
          </div>
          <span
            className={`text-sm font-bold uppercase tracking-wider ${
              dark ? "text-[#c4c9de]" : "text-[#5b6178]"
            }`}
          >
            {serverStatus === "active"
              ? "Server Active"
              : serverStatus === "starting"
              ? "Starting..."
              : "Server Closed"}
          </span>
        </div>

        {/* IP and QR (only if active) */}
        {serverStatus === "active" && qrText && (
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-1">
            <div
              onClick={copyIp}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                dark
                  ? "bg-[#13151f] hover:bg-[#212436] border border-[#2a2d3e]"
                  : "bg-[#f1f3f8] hover:bg-[#e8ebf2] border border-[#d1d5e0]"
              }`}
              title="Click to copy IP"
            >
              <code
                className={`text-xs font-mono font-bold ${
                  dark ? "text-indigo-300" : "text-indigo-600"
                }`}
              >
                {qrText}
              </code>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-3.5 w-3.5 ${copied ? "text-green-500" : "opacity-50"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {copied ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                )}
              </svg>
            </div>

            {/* Compact QR Toggle */}
            <div className="relative">
              <div
                onClick={() => setShowFullQr(!showFullQr)}
                className={`w-10 h-10 p-1 rounded-lg cursor-pointer border transition-all overflow-hidden ${
                  dark
                    ? "bg-[#13151f] border-[#2a2d3e] hover:border-indigo-500/50"
                    : "bg-white border-[#d1d5e0] hover:border-indigo-400"
                }`}
              >
                {qrCode && (
                  <div
                    className={`w-full h-full qr-container ${dark ? "qr-container-dark" : ""}`}
                    dangerouslySetInnerHTML={{ __html: qrCode }}
                  />
                )}
              </div>

              {showFullQr && (
                <>
                  <div 
                    className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                    onClick={() => setShowFullQr(false)}
                  />
                  <div
                    className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] p-6 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 ${
                      dark ? "bg-[#1a1d2a] border border-[#2a2d3e]" : "bg-white border border-gray-200"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>
                          Scan to connect
                        </span>
                        <button 
                          onClick={() => setShowFullQr(false)}
                          className={`p-1 rounded-full hover:bg-gray-500/10 transition-colors ${dark ? "text-gray-400" : "text-gray-500"}`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div
                        className={`qr-container w-64 h-64 aspect-square rounded-2xl overflow-hidden p-4 ${dark ? "qr-container-dark" : "bg-white"}`}
                        dangerouslySetInnerHTML={{ __html: qrCode! }}
                      />
                      <p className={`text-xs font-mono mt-4 px-3 py-1.5 rounded-lg ${dark ? "bg-[#13151f] text-indigo-300" : "bg-gray-100 text-indigo-600"}`}>
                        {qrText}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Global Stop/Start Toggle */}
        <button
          onClick={toggleServer}
          disabled={serverStatus === "starting"}
          className={`text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm ${
            serverStatus === "active"
              ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30"
              : "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border border-green-500/30"
          } disabled:opacity-50`}
        >
          {serverStatus === "active" ? "Stop Server" : serverStatus === "starting" ? "Starting..." : "Start Server"}
        </button>
      </div>
    </div>
  );
}
