import { listen, TauriEvent } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { SendLogic } from "./SendLogic";
import { useTheme } from "../Context/Theme";
import SendConfirmationDialog from "./SendConfirmation";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
} from "@material-tailwind/react";
import Swal from "sweetalert2";
import { SharedDataPreview } from "./SharedDataPreview";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

interface DragDropPayload {
  paths: string[];
}

const FilePicker = ({
  onError,
  onShowConfirmation,
}: {
  onError: (msg: string) => void;
  onShowConfirmation: (files: string[]) => void;
}) => {
  const { isTheme } = useTheme();

  return (
    <div
      onClick={async () => {
        try {
          const files = await open({ multiple: true, directory: false });
          if (files && files.length > 0) {
            onShowConfirmation(files);
          }
        } catch (err) {
          onError(
            err instanceof Error ? err.message : "Failed to select files",
          );
        }
      }}
      className={`w-full h-56 sm:h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
        isTheme
          ? "border-[#2a2d3e] hover:border-indigo-500/50 hover:bg-indigo-500/5 text-[#8b92b3] hover:text-indigo-300"
          : "border-[#d1d5e0] hover:border-indigo-400/50 hover:bg-indigo-50/50 text-[#9097b0] hover:text-indigo-500"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-10 mb-3 opacity-60"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v12" />
        <path d="m17 8-5-5-5 5" />
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      </svg>
      <p className="text-sm text-center px-4 font-medium">
        Drop files here or click to browse
      </p>
      <p
        className={`text-xs mt-1.5 ${isTheme ? "text-[#9ba2c0]" : "text-[#9097b0]"}`}
      >
        Any file type supported
      </p>
    </div>
  );
};

const TextSender = ({ onSendText }: { onSendText: (text: string) => void }) => {
  const { isTheme } = useTheme();
  const [text, setText] = useState<string>("");

  return (
    <div className="w-full">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={`w-full h-56 sm:h-64 p-4 rounded-2xl resize-none border outline-none transition-colors focus:ring-2 text-sm leading-relaxed ${
          isTheme
            ? "bg-[#1a1d2a] text-white border-[#2a2d3e] placeholder-[#5a6080] focus:border-indigo-500/50 focus:ring-indigo-500/20"
            : "bg-white text-[#1a1d2e] border-[#d1d5e0] placeholder-[#9097b0] focus:border-indigo-400 focus:ring-indigo-100"
        }`}
        placeholder="Type your message here..."
      />
      <button
        onClick={() => text.trim() && onSendText(text)}
        className={`w-full mt-4 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
          isTheme
            ? "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 shadow-lg shadow-indigo-900/30"
            : "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 shadow-md shadow-indigo-200/60"
        }`}
        disabled={!text.trim()}
      >
        Share Text
      </button>
    </div>
  );
};

interface ErrorDialogState {
  isOpen: boolean;
  message: string;
}

const ErrorDialog: React.FC<{
  error: ErrorDialogState;
  onClose: () => void;
  isTheme: boolean;
}> = ({ error, onClose, isTheme }) => {
  return (
    <Dialog
      open={error.isOpen}
      handler={onClose}
      className={
        isTheme
          ? "!bg-[#1a1d2a] text-white border border-[#2a2d3e]"
          : "bg-white text-[#1a1d2e]"
      }
      {...({} as any)}
    >
      <DialogHeader
        className={isTheme ? "text-white" : "text-[#1a1d2e]"}
        {...({} as any)}
      >
        Error
      </DialogHeader>
      <DialogBody
        className={isTheme ? "!text-[#c4c9de]" : "text-[#5b6178]"}
        {...({} as any)}
      >
        {error.message}
      </DialogBody>
      <DialogFooter {...({} as any)}>
        <Button color="blue" onClick={onClose} {...({} as any)}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

import { DeviceList, ProgressBar } from "./SendQrCode";
import { useQrContext } from "../Context/QrContext";
import { ProgressUpdatePayload, SharedFiles, SharedText } from "../types";

export default function Send({
  sharedData,
  onProcessed,
}: {
  sharedData: SharedText | SharedFiles | null;
  onProcessed: () => void;
}) {
  const { proceedWithSend } = SendLogic();
  const { isTheme } = useTheme();
  const { serverStatus, setServerStatus } = useQrContext();
  const hasRun = useRef(false);

  const [sendFile, setSendFile] = useState<boolean>(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);
  const [error, setError] = useState<ErrorDialogState>({
    isOpen: false,
    message: "",
  });
  const previewRef = useRef<HTMLDivElement>(null);

  const scrollToPreview = () => {
    setTimeout(() => {
      previewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  useEffect(() => {
    if (!sharedData) return;

    let isMounted = true;

    const processSharedData = async () => {
      try {
        // ✅ TEXT HANDLING
        if ("SharedText" in sharedData) {
          const text =
            (sharedData.SharedText ?? "")
              .split("\n")[0]
              .replace(/^"|"$/g, "")
              .trim() || "";

          if (!text) return;

          setSendFile(false);

          Toast.fire({
            icon: "info",
            title: "Sharing text...",
          });

          setServerStatus("starting");

          await proceedWithSend(null, text);

          if (!isMounted) return;

          setServerStatus("active");
          scrollToPreview();

          Toast.fire({
            icon: "success",
            title: "Text shared successfully!",
          });
        }

        // ✅ FILE HANDLING
        else if ("URIList" in sharedData && sharedData.URIList) {
          let uriArray: string[] = [];

          const raw = sharedData.URIList;

          if (typeof raw === "string") {
            try {
              uriArray = JSON.parse(raw);
            } catch {
              uriArray = raw
                .replace(/^\[|\]$/g, "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            }
          } else {
            uriArray = raw;
          }

          if (!uriArray.length) return;

          if (!isMounted) return;

          setDroppedFiles(uriArray);
          setShowConfirmation(true);
        }

        // ✅ IMPORTANT: delay clearing parent state
        setTimeout(() => {
          if (isMounted) onProcessed();
        }, 300);
      } catch (err) {
        console.error("Processing shared data failed:", err);
        setError({ isOpen: true, message: "Failed to process shared data" });
        setServerStatus("closed");
      }
    };

    processSharedData();

    return () => {
      isMounted = false;
    };
  }, [sharedData]);

  useEffect(() => {
    if (!hasRun.current) {
      const setupDragEvents = async () => {
        const dragDropUnlisten = await listen<DragDropPayload>(
          TauriEvent.DRAG_DROP,
          (event) => {
            const { paths } = event.payload;
            setDroppedFiles(paths);
            setShowConfirmation(true);
          },
        );
        return () => {
          dragDropUnlisten();
        };
      };
      setupDragEvents();
      hasRun.current = true;
    }
  }, []);

  // Outgoing progress listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setup = async () => {
      unlisten = await listen<ProgressUpdatePayload>(
        "progress-update",
        (ev) => {
          if (ev.payload.progress === 100) {
            Toast.fire({
              icon: "success",
              title: "Successfully shared!",
            });
          }
        },
      );
    };
    setup();
    return () => unlisten?.();
  }, []);

  const isServerActive = serverStatus === "active";

  return (
    <div className="h-full flex flex-col items-center pt-8 sm:pt-10 px-4 sm:px-6 overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 sm:mb-8">
        <div>
          <h1
            className={`text-xl sm:text-2xl font-bold ${isTheme ? "text-white" : "text-gray-800"}`}
          >
            Share
          </h1>
          <p
            className={`text-sm mt-1 ${isTheme ? "!text-[#c4c9de]" : "!text-[#9097b0]"}`}
          >
            Choose what you want to share
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={`w-full max-w-4xl flex rounded-xl p-1 mb-6 sm:mb-8 ${
          isTheme ? "bg-[#1a1d2a] border border-[#2a2d3e]" : "bg-[#e8ebf2]"
        }`}
      >
        {/* FILE TAB */}
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all duration-200 font-semibold text-sm ${
            sendFile
              ? isTheme
                ? "bg-[#2a2d3e] text-white shadow-sm border border-[#3a3f55]"
                : "bg-white shadow-sm text-[#1a1d2e] border border-white/80"
              : isTheme
                ? "text-[#8b92b3] hover:text-slate-300"
                : "text-[#9097b0] hover:text-[#5b6178]"
          }`}
          onClick={() => setSendFile(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v12" />
            <path d="m17 8-5-5-5 5" />
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          </svg>
          Files
        </button>

        {/* TEXT TAB */}
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all duration-200 font-semibold text-sm ${
            !sendFile
              ? isTheme
                ? "bg-[#2a2d3e] text-white shadow-sm border border-[#3a3f55]"
                : "bg-white shadow-sm text-[#1a1d2e] border border-white/80"
              : isTheme
                ? "text-[#8b92b3] hover:text-slate-300"
                : "text-[#9097b0] hover:text-[#5b6178]"
          }`}
          onClick={() => setSendFile(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v16" />
            <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
            <path d="M9 20h6" />
          </svg>
          Text
        </button>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl">
        {sendFile ? (
          <FilePicker
            onError={(msg) => setError({ isOpen: true, message: msg })}
            onShowConfirmation={(files) => {
              setDroppedFiles(files);
              setShowConfirmation(true);
            }}
          />
        ) : (
          <TextSender
            onSendText={async (text) => {
              if (!text.trim()) {
                setError({
                  isOpen: true,
                  message: "Please enter some text before sending.",
                });
                return;
              }
              try {
                Toast.fire({
                  icon: "info",
                  title: "Sharing text...",
                });
                setServerStatus("starting");
                await proceedWithSend(null, text);
                setServerStatus("active");
                scrollToPreview();
                Toast.fire({
                  icon: "success",
                  title: "Text shared successfully!",
                });
              } catch (err) {
                setError({ isOpen: true, message: "Failed to send text" });
                setServerStatus("closed");
              }
            }}
          />
        )}
      </div>

      {/* Shared Data Preview */}
      <SharedDataPreview containerRef={previewRef} />

      {/* Active Server Info (Below Picker) */}
      {isServerActive && (
        <div className="w-full max-w-4xl mt-12 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div
            className={`p-6 rounded-3xl border ${isTheme ? "bg-[#13151f] border-[#2a2d3e]" : "bg-white border-gray-100 shadow-xl shadow-gray-200/50"}`}
          >
            <h3
              className={`text-lg font-bold mb-4 ${isTheme ? "text-white" : "text-gray-900"}`}
            >
              Active Transfer Session
            </h3>
            <ProgressBar />
            <div className="mt-8">
              <DeviceList />
            </div>
          </div>
        </div>
      )}

      {/* Confirmation */}
      <SendConfirmationDialog
        isOpen={showConfirmation}
        fileList={droppedFiles}
        onCancel={() => setShowConfirmation(false)}
        onProceed={async () => {
          try {
            Toast.fire({
              icon: "info",
              title: "Starting file share...",
            });
            setServerStatus("starting");
            await proceedWithSend(droppedFiles, null);
            setShowConfirmation(false);
            setServerStatus("active");
            scrollToPreview();
          } catch (err) {
            setError({ isOpen: true, message: "Failed to send files" });
            setServerStatus("closed");
          }
        }}
      />

      {/* Error Dialog */}
      <ErrorDialog
        error={error}
        onClose={() => setError({ isOpen: false, message: "" })}
        isTheme={isTheme}
      />
    </div>
  );
}
