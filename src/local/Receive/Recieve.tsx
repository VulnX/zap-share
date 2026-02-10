import { useTheme } from "../Context/Theme";
import { useEffect, useState, useRef } from "react";
import { RecvLogic } from "./RecieveLogic";
import { ProgressBar } from "../Send/SendQrCode";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@material-tailwind/react";

interface RecieveProps {
  canSwitch: boolean;
  setCanSwitch: (value: boolean) => void;
}

export default function Recieve({ setCanSwitch }: RecieveProps) {
  const { isTheme } = useTheme();
  const { qrCode, generateQRCode, qrText } = RecvLogic();
  const [recvFile, setRecvFile] = useState<boolean>(true);
  const [showQR, setShowQR] = useState(false);
  const [text, setText] = useState<string>("");
  const [isServerRunning, setIsServerRunning] = useState(false);
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
    <div
      className={`min-h-screen flex flex-col  ${
        isTheme ? "bg-dark-background" : "bg-light-background"
      }`}
    >
      <div className="flex flex-col items-center mt-[15vh]">
        <div
          className={`flex space-x-6 ${
            isTheme ? "bg-gray-300" : "bg-gray-100"
          } rounded-full p-2 shadow-md mb-2 w-40 mx-auto font-semibold`}
        >
          <div
            className={`cursor-pointer px-4 py-1 rounded-full transition-colors ${
              recvFile ? "bg-gray-200 text-gray-800" : "text-gray-500"
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
              !recvFile ? "bg-gray-200 text-gray-800" : "text-gray-500"
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
        <button
          onClick={() => setShowQR(!showQR)}
          disabled={!isServerRunning}
          className={`mb-4 mt-4 px-6 py-2 rounded-lg font-medium transition-colors ${
            isServerRunning
              ? isTheme
                ? "bg-gray-700 text-white hover:bg-gray-600"
                : "bg-gray-200 text-black hover:bg-gray-300"
              : isTheme
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {showQR ? "Hide QR Code" : "Show QR Code"}
        </button>
        <Button
          color={isServerRunning ? "red" : "green"}
          onClick={() => toggleServer()}
          placeholder={undefined}
          onPointerEnterCapture={undefined}
          onPointerLeaveCapture={undefined}
        >
          {isServerRunning ? "Stop" : "Start"}
        </Button>
        {showQR && (
          <>
            <h2
              className={`text-lg ${
                isTheme ? "text-white" : "text-black"
              } mb-2`}
            >
              {qrText}
            </h2>
            <div
              className={`${
                isTheme ? "bg-dark-qrBg" : "bg-light-qrBg"
              } mb-10 rounded-2xl p-4 shadow-lg transition-all duration-300 ease-in-out`}
            >
              {qrCode ? (
                <img
                  src={qrCode}
                  alt="QR Code"
                  className="w-64 h-64 mix-blend-multiply"
                />
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
          </>
        )}
        {!recvFile ? (
          <div className="w-80vw">
            <textarea
              value={text}
              className={`w-full p-2 rounded-lg resize-none outline-none  ${
                isTheme ? "focus:ring-0" : "focus:ring-0"
              }`}
              placeholder="Received text will appear here"
            />
          </div>
        ) : null}
      </div>
      <ProgressBar />
    </div>
  );
}
