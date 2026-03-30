import { listen, TauriEvent } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { SendLogic } from "./SendLogic";
import { useTheme } from "../Context/Theme";
import SendConfirmationDialog from "./SendConfirmation";
import QrCode from "./SendQrCode";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useSharedDataContext } from "../Context/FileListContext";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Button,
} from "@material-tailwind/react";

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
      <DialogBody className={isTheme ? "!text-[#c4c9de]" : "text-[#5b6178]"} {...({} as any)}>
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

export default function Send({
  setCanSwitch,
}: {
  canSwitch: boolean;
  setCanSwitch: (value: boolean) => void;
}) {
  const { proceedWithSend } = SendLogic();
  const { isTheme } = useTheme();
  const hasRun = useRef(false);

  const [sendFile, setSendFile] = useState<boolean>(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showBackConfirmation, setShowBackConfirmation] = useState(false);
  const [error, setError] = useState<ErrorDialogState>({
    isOpen: false,
    message: "",
  });

  const { setFileList, setText } = useSharedDataContext();

  const stopServer = async () => {
    try {
      await invoke("stop_server");
    } catch (error) {
      console.error(error);
    }
  };

  const handleBackFromQr = async () => {
    setShowBackConfirmation(false);
    await stopServer();
    setShowQrCode(false);
    setSendFile(true);
    setFileList([]);
    setText(undefined);
    setCanSwitch(true);
  };

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

  return (
    <div>
      {showQrCode ? (
        <QrCode onBack={() => setShowBackConfirmation(true)} />
      ) : (
        <div
          className={`min-h-screen flex flex-col items-center pt-8 sm:pt-10 xl:pt-20 px-4 sm:px-6 ${
            isTheme ? "bg-[#13151f] text-white" : "bg-[#f8f9fc] !text-[#1a1d2e]"
          }`}
        >
          {/* Header */}
          <div className="w-full max-w-4xl mb-6 sm:mb-8">
            <h1 className={`text-xl sm:text-2xl font-bold ${isTheme ? "text-white" : "text-gray-800"}`}>Share</h1>
            <p
              className={`text-sm mt-1 ${isTheme ? "!text-[#c4c9de]" : "!text-[#9097b0]"}`}
            >
              Choose what you want to share
            </p>
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
                    await proceedWithSend(null, text);
                    setShowQrCode(true);
                    setCanSwitch(false);
                  } catch (err) {
                    setError({ isOpen: true, message: "Failed to send text" });
                  }
                }}
              />
            )}
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
            await proceedWithSend(droppedFiles, null);
            setShowConfirmation(false);
            setShowQrCode(true);
            setCanSwitch(false);
          } catch (err) {
            setError({ isOpen: true, message: "Failed to send files" });
          }
        }}
      />

      {/* Error Dialog */}
      <ErrorDialog
        error={error}
        onClose={() => setError({ isOpen: false, message: "" })}
        isTheme={isTheme}
      />

      {/* Back Confirmation */}
      <Dialog
        open={showBackConfirmation}
        handler={setShowBackConfirmation}
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
          Stop Server?
        </DialogHeader>
        <DialogBody
          className={isTheme ? "!text-[#c4c9de]" : "text-[#5b6178]"}
          {...({} as any)}
        >
          Stop the server and return to file picker?
        </DialogBody>
        <DialogFooter {...({} as any)}>
          <Button
            onClick={() => setShowBackConfirmation(false)}
            {...({} as any)}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleBackFromQr}
            {...({} as any)}
            className="ml-3"
          >
            Stop & Go Back
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
