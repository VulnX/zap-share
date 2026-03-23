import { useTheme } from "../Context/Theme";
import { useEffect, useState, useRef } from "react";
import { RecvLogic } from "./RecieveLogic";
import { ProgressBar } from "../Send/SendQrCode";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Button, Collapse } from "@material-tailwind/react";

interface RecieveProps {
  canSwitch: boolean;
  setCanSwitch: (value: boolean) => void;
}

export default function Recieve({ setCanSwitch }: RecieveProps) {
  const { isTheme } = useTheme();
  const { qrCode, generateQRCode, qrText } = RecvLogic();
  const [recvFile, setRecvFile] = useState<boolean>(true);
  const [text, setText] = useState<string>("");
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [openCollapse, setOpenCollapse] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        console.log("Setting up listener for recieved-text");
        unlisten = await listen<string>("received-text", (event) => {
          console.log("Received mode event payload:", event.payload);
          setText(event.payload);
        });
      } catch (error) {
        console.error("No text received yet", error);
        setText("No text received yet");
      }
    };
    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const stopServer = async () => {
    try {
      await invoke("stop_server");
      console.log("Server Stopped");
      setIsServerRunning(false);
    } catch (error) {
      console.error("Error stopping server:", error);
    }
  };

  const restartServer = async (mode: "file" | "text") => {
    try {
      await stopServer();
      // Wait a moment before restarting
      await new Promise((resolve) => setTimeout(resolve, 500));
      await generateQRCode(mode === "file" ? "file" : "text");
      setIsServerRunning(true);
      console.log("Server Restarted");
    } catch (error) {
      console.error("Error restarting server:", error);
    }
  };

  const toggleServer = async () => {
    if (isServerRunning) {
      await stopServer();
    } else {
      await restartServer(recvFile ? "file" : "text");
    }
  };
  useEffect(() => {
    // Sync canSwitch with server state
    // Restrict tab switching when server is running (active receive)
    // Allow switching when server is off
    setCanSwitch(!isServerRunning);
  }, [isServerRunning, setCanSwitch]);

  useEffect(() => {
    const fetch = async () => {
      if (!hasRun.current && isServerRunning) {
        hasRun.current = true;
        await generateQRCode(recvFile ? "file" : "text");
      }
    };
    fetch();
  }, []);

  return (
    <div className={`flex flex-col ${isTheme ? "bg-gray-900" : "bg-white"}`}>
      <div className="flex flex-col items-center mt-[8vh] px-4 pb-8">
        {/* File/Text Toggle */}
        <div
          className={`flex space-x-6 ${
            isTheme ? "bg-gray-700" : "bg-gray-100"
          } rounded-full p-2 shadow-md mb-6 w-40 mx-auto font-semibold`}
        >
          <div
            className={`cursor-pointer px-4 py-1 rounded-full transition-colors ${
              recvFile
                ? isTheme
                  ? "bg-gray-600 text-white"
                  : "bg-gray-300 text-gray-900"
                : isTheme
                  ? "text-gray-400"
                  : "text-gray-600"
            }`}
            onClick={async () => {
              if (!recvFile && isServerRunning) {
                await restartServer("file");
              }
              setRecvFile(true);
            }}
          >
            File
          </div>
          <div
            className={`cursor-pointer px-4 py-1 rounded-full transition-colors ${
              !recvFile
                ? isTheme
                  ? "bg-gray-600 text-white"
                  : "bg-gray-300 text-gray-900"
                : isTheme
                  ? "text-gray-400"
                  : "text-gray-600"
            }`}
            onClick={async () => {
              if (recvFile && isServerRunning) {
                await restartServer("text");
              }
              setRecvFile(false);
            }}
          >
            Text
          </div>
        </div>

        {/* Start/Stop Button */}
        <div className="mb-8">
          <Button
            color={isServerRunning ? "red" : "green"}
            onClick={() => toggleServer()}
            {...({} as any)}
            className="px-8 py-3 font-semibold"
          >
            {isServerRunning ? "Stop Server" : "Start Server"}
          </Button>
        </div>

        {/* QR Code Collapse */}
        {isServerRunning && (
          <div className="w-full max-w-md mb-8">
            <Collapse
              open={openCollapse}
              className={`border rounded-lg ${
                isTheme
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-300"
              }`}
            >
              <div className="p-6">
                <h2
                  className={`text-lg font-semibold mb-4 text-center ${
                    isTheme ? "text-white" : "text-black"
                  }`}
                >
                  {qrText}
                </h2>
                <div
                  className={`${
                    isTheme ? "bg-gray-800" : "bg-gray-100"
                  } rounded-2xl p-4 flex justify-center shadow-lg transition-all duration-300 ease-in-out`}
                >
                  {qrCode ? (
                    <div className="qr-container" dangerouslySetInnerHTML={{ __html: qrCode }} />
                  ) : (
                    <p
                      className={`text-center ${
                        isTheme ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Generating QR Code...
                    </p>
                  )}
                </div>
              </div>
            </Collapse>
            <button
              onClick={() => setOpenCollapse(!openCollapse)}
              className={`w-full mt-3 px-6 py-2 rounded-lg font-medium transition-colors ${
                isTheme
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "bg-gray-200 text-black hover:bg-gray-300"
              }`}
            >
              {openCollapse ? "Hide QR Code" : "Show QR Code"}
            </button>
          </div>
        )}

        {/* Text Receiver */}
        {!recvFile && (
          <div className="w-full max-w-xl mb-6 px-2">
            <label
              className={`block text-sm font-semibold mb-2 ${
                isTheme ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Received Text:
            </label>
            <textarea
              value={text}
              readOnly
              className={`w-full h-64 p-4 rounded-lg resize-none outline-none border ${
                isTheme
                  ? "bg-gray-800 text-white border-gray-600 focus:border-gray-500"
                  : "bg-white text-black border-gray-300 focus:border-gray-400"
              } focus:ring-2 focus:ring-blue-500`}
              placeholder="Received text will appear here..."
            />
          </div>
        )}
      </div>
      <div className="w-3/4 m-auto">
        <ProgressBar />
      </div>
    </div>
  );
}
