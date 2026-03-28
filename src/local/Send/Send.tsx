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
    <div className="mt-[10vh] min-w-screen flex justify-center items-center px-4">
      <div
        className={`h-[40vw] w-[40vw] md:h-[30vw] md:w-[30vw] sm:h-[50vw] sm:w-[50vw] flex flex-col justify-center items-center ${isTheme ? "bg-gray-800" : "bg-gray-200"
          } rounded-3xl drop-shadow-xl shadow-xl clickable`}
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
      >
        <div
          className={`border-[1px] border-dashed border-black rounded-2xl w-[35vw] h-[35vw] flex flex-col items-center justify-center`}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 268 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="M203.679 80.5422C193.985 63.7571 174.904 54.1292 154.443 57.299C146.411 40.9421 129.608 30.5552 110.713 30.5552C83.9683 30.5552 62.2083 51.6645 62.2083 77.6152C62.2083 78.6863 62.2519 79.7902 62.351 80.9398C39.2682 86.0429 22.3342 106.262 22.3342 129.547C22.3342 157.064 45.4086 179.446 73.7721 179.446H114.43V171.205H73.7721C50.0919 171.205 30.8339 152.518 30.8339 129.548C30.8339 108.988 46.6553 91.2798 67.645 88.3657C68.7708 88.2109 69.7829 87.6231 70.4577 86.7327C71.1288 85.847 71.419 84.7337 71.2364 83.6474C70.8773 81.4138 70.6959 79.4453 70.6959 77.6187C70.6959 56.2103 88.6552 38.7953 110.714 38.7953C127.284 38.7953 141.899 48.4853 147.962 63.4779C148.723 65.3795 150.804 66.4506 152.869 65.9883C171.521 61.8026 189.047 70.5436 197.131 86.1286C197.745 87.3334 198.948 88.1651 200.325 88.354C221.326 91.2551 237.183 108.965 237.183 129.545C237.183 152.515 217.911 171.201 194.231 171.201H140.102V179.443H194.228C222.595 179.443 245.666 157.06 245.666 129.544C245.666 105.599 227.762 84.9003 203.679 80.5422Z"
              fill="#000000"
              stroke="currentColor"
              strokeWidth="0.00189097"
            />
            <path
              d="M153.639 127.485C155.339 125.839 155.339 123.177 153.639 121.531L129.4 98.0124C128.552 97.1935 127.448 96.7864 126.336 96.7864L126.258 96.7993C126.237 96.7993 126.215 96.7864 126.193 96.7864C125.067 96.7864 123.956 97.2099 123.129 98.0124L98.8901 121.532C97.1936 123.178 97.1936 125.84 98.8901 127.486C100.587 129.135 103.33 129.135 105.027 127.486L121.848 111.165V225.225C121.848 227.56 123.787 229.445 126.193 229.445C128.586 229.445 130.534 227.56 130.534 225.225V111.019L147.503 127.485C149.194 129.135 151.942 129.135 153.639 127.485Z"
              fill="#000000"
              stroke="currentColor"
              strokeWidth="0.00189097"
            />
          </svg>
          <p className="text-sm sm:text-base md:text-lg text-center mb-4 w-[90%] px-2">
            Click to Browse or Drag Files Here to Start Sharing
          </p>
        </div>
      </div>
    </div>
  );
};

const TextSender = ({ onSendText }: { onSendText: (text: string) => void }) => {
  const { isTheme } = useTheme();
  const [text, setText] = useState<string>("");

  return (
    <div className="mt-[10vh] min-w-screen mx-auto flex flex-col items-center">
      <div className="w-[80vw]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`w-full h-[50vh] p-4 rounded-lg resize-none outline-none border ${isTheme
            ? "bg-gray-800 text-white border-gray-600 focus:border-gray-500"
            : "bg-white text-black border-gray-300 focus:border-gray-400"
            } focus:ring-2 focus:ring-blue-500`}
          placeholder="Type your message here..."
        />
      </div>
      <button
        onClick={() => {
          if (text.trim()) {
            onSendText(text);
          }
        }}
        className={`mt-4 px-8 py-3 bg-gray-600 text-white rounded-lg font-medium hover:shadow-lg transition-all ${isTheme ? "hover:bg-gray-500" : "hover:bg-gray-800"
          }`}
      >
        Send
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
        placeholder={undefined}
        {...({} as any)}
      >
        Error
      </DialogHeader>
      <DialogBody
        className={isTheme ? "bg-gray-800 text-gray-200" : ""}
        placeholder={undefined}
        {...({} as any)}
      >
        {error.message}
      </DialogBody>
      <DialogFooter
        placeholder={undefined}
        {...({} as any)}
      >
        <Button
          color="blue"
          onClick={onClose}
          placeholder={undefined}
          {...({} as any)}
        >
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
  const [sendFile, setSendFile] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);
  const [showQrCode, setShowQrCode] = useState(false);
  const [showBackConfirmation, setShowBackConfirmation] = useState(false);
  const [error, setError] = useState<ErrorDialogState>({
    isOpen: false,
    message: "",
  });

  const stopServer = async () => {
    try {
      await invoke("stop_server");
      console.log("Server Stopped");
    } catch (error) {
      console.error("Error stopping server:", error);
    }
  };

  const { setFileList, setText } = useSharedDataContext();

  const handleBackFromQr = async () => {
    setShowBackConfirmation(false);
    await stopServer();
    setShowQrCode(false);
    setSendFile(false);
    setFileList([]);
    setText(undefined);
    setCanSwitch(true);
  };

  useEffect(() => {
    if (!hasRun.current) {
      const setupDragEvents = async () => {
        const dragEnterUnlisten = await listen<TauriEvent>(
          TauriEvent.DRAG_ENTER,
          () => {
            //   console.log("Drag entered", event.payload);
          },
        );
        const dragLeaveUnlisten = await listen<TauriEvent>(
          TauriEvent.DRAG_LEAVE,
          () => {
            //   console.log("Drag left", event.payload);
          },
        );
        const dragOverUnlisten = await listen<TauriEvent>(
          TauriEvent.DRAG_OVER,
          () => {
            //   console.log("Dragging over", event.payload);
          },
        );
        const dragDropUnlisten = await listen<DragDropPayload>(
          TauriEvent.DRAG_DROP,
          (event) => {
            console.log("File dropped", event.payload);

            // idk why error occurs here
            const { paths } = event.payload;
            setDroppedFiles(paths);
            setShowConfirmation(true);
          },
        );

        return () => {
          dragEnterUnlisten();
          dragLeaveUnlisten();
          dragOverUnlisten();
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
        <QrCode
          onBack={() => {
            setShowBackConfirmation(true);
          }}
        />
      ) : (
        <div
          className={`min-h-screen flex flex-col pt-10 ${isTheme ? "bg-gray-900" : "white"
            }`}
        >
          {/* Switch for text and file sending */}
          <div
            className={`flex space-x-6 ${isTheme ? "bg-gray-700" : "bg-gray-100"
              } rounded-full p-2 shadow-md mb-2 w-40 mx-auto font-semibold`}
          >
            {/* File tab */}
            <div
              className={`cursor-pointer px-4 py-1 rounded-full transition-colors ${sendFile
                ? isTheme
                  ? "bg-gray-600 text-white"
                  : "bg-gray-300 text-gray-900"
                : isTheme
                  ? "text-gray-400"
                  : "text-gray-600"
                }`}
              onClick={() => setSendFile(true)}
            >
              File
            </div>

            {/* Text tab */}
            <div
              className={`cursor-pointer px-4 py-1 rounded-full transition-colors ${!sendFile
                ? isTheme
                  ? "bg-gray-600 text-white"
                  : "bg-gray-300 text-gray-900"
                : isTheme
                  ? "text-gray-400"
                  : "text-gray-600"
                }`}
              onClick={() => setSendFile(false)}
            >
              Text
            </div>
          </div>

          {sendFile ? (
            <FilePicker
              onError={(msg) => {
                setError({
                  isOpen: true,
                  message: msg,
                });
              }}
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
                    message: `Error: ${err instanceof Error ? err.message : "Failed to send text"}`,
                  });
                }
              }}
            />
          )}
        </div>
      )}

      {/*  Confirmation  message if file is selected */}
      <SendConfirmationDialog
        isOpen={showConfirmation}
        fileList={droppedFiles}
        onCancel={() => {
          setShowConfirmation(false);
        }}
        onProceed={async () => {
          try {
            await proceedWithSend(droppedFiles, null);
            setShowConfirmation(false);
            setShowQrCode(true);
            setCanSwitch(false);
          } catch (err) {
            setError({
              isOpen: true,
              message: `Error: ${err instanceof Error ? err.message : "Failed to send files"}`,
            });
          }
        }}
      />

      <ErrorDialog
        error={error}
        onClose={() => setError({ isOpen: false, message: "" })}
        isTheme={isTheme}
      />

      <Dialog
        open={showBackConfirmation}
        handler={setShowBackConfirmation}
        className={isTheme ? "bg-gray-800 text-white" : "bg-white text-black"}
        placeholder={undefined}
        {...({} as any)}
      >
        <DialogHeader
          className={isTheme ? "text-white" : "text-black"}
          placeholder={undefined}
          {...({} as any)}
        >
          Stop Server?
        </DialogHeader>
        <DialogBody
          className={isTheme ? "bg-gray-800 text-gray-200" : ""}
          placeholder={undefined}
          {...({} as any)}
        >
          Stop the server and return to file picker?
        </DialogBody>
        <DialogFooter placeholder={undefined} {...({} as any)}>
          <Button
            onClick={() => setShowBackConfirmation(false)}
            className="mr-2"
            placeholder={undefined}
            {...({} as any)}
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleBackFromQr}
            placeholder={undefined}
            {...({} as any)}
          >
            Stop & Go Back
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
