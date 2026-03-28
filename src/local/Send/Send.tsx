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
    // {/* Drop Zone */}
    <div
      onClick={async () => {
        try {
          const files = await open({
            multiple: true,
            directory: false,
          });
          if (files && files.length > 0) {
            onShowConfirmation(files);
          }
        } catch (err) {
          onError(
            err instanceof Error ? err.message : "Failed to select files",
          );
        }
      }}
      className={`w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition ${
        isTheme
          ? "border-gray-600 hover:bg-gray-700"
          : "border-gray-300 hover:bg-gray-100"
      }`}
    >
      {/* Upload Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-10 mb-3 opacity-70"
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

      <p className="text-sm text-center px-4">
        Drop files here or click to browse
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
        className={`w-full h-64 p-4 rounded-lg resize-none border ${
          isTheme
            ? "bg-gray-800 text-white border-gray-600"
            : "bg-white text-black border-gray-300"
        }`}
        placeholder="Type your message here..."
      />

      <button
        onClick={() => text.trim() && onSendText(text)}
        className="w-full mt-4 px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
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
      className={isTheme ? "bg-gray-800 text-white" : "bg-white text-black"}
      {...({} as any)}
    >
      <DialogHeader
        className={isTheme ? "text-white" : "text-black"}
        {...({} as any)}
      >
        Error
      </DialogHeader>
      <DialogBody className={isTheme ? "text-gray-200" : ""} {...({} as any)}>
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
          className={`min-h-screen flex flex-col items-center md:pt-10 xl:pt-24 px-4  ${
            isTheme ? "bg-gray-900 text-white" : "bg-white text-black"
          }`}
        >
          {/* Header */}
          <div className="w-full max-w-4xl mb-6">
            <h1 className="text-2xl font-semibold">Share</h1>
            <p className="text-sm text-gray-500">
              Choose what you want to share
            </p>
          </div>

          {/* Tabs */}
          <div
            className={`w-full max-w-4xl flex rounded-full p-1 mb-6  font-semibold ${
              isTheme ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            {/* FILE TAB */}
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full transition  font-semib ${
                sendFile
                  ? isTheme
                    ? "bg-gray-600 text-white"
                    : "bg-white shadow"
                  : "text-gray-500"
              }`}
              onClick={() => setSendFile(true)}
            >
              {/* Upload Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
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
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full transition ${
                !sendFile
                  ? isTheme
                    ? "bg-gray-600 text-white"
                    : "bg-white shadow"
                  : "text-gray-500"
              }`}
              onClick={() => setSendFile(false)}
            >
              {/* Text Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
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
                    setError({
                      isOpen: true,
                      message: "Failed to send text",
                    });
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
            setError({
              isOpen: true,
              message: "Failed to send files",
            });
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
        className={isTheme ? "bg-gray-800 text-white" : "bg-white"}
        {...({} as any)}
      >
        <DialogHeader {...({} as any)}>Stop Server?</DialogHeader>
        <DialogBody {...({} as any)}>
          Stop the server and return to file picker?
        </DialogBody>
        <DialogFooter {...({} as any)}>
          <Button
            onClick={() => setShowBackConfirmation(false)}
            {...({} as any)}
          >
            Cancel
          </Button>
          <Button color="red" onClick={handleBackFromQr} {...({} as any)} className="ml-3">
            Stop & Go Back
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
