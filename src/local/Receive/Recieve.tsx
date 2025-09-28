import { useTheme } from "../Choice/Theme";
import lightBack from "../images/lightBack.svg";
import darkBack from "../images/darkBack.svg";
import { useEffect, useState, useRef } from "react";
import { RecvLogic } from "./RecieveLogic";
import { useNavigate } from "react-router-dom";
import { ToggleThemeButton, ProfileButton } from "../Choice/Navigation";
import { ProgressBar } from "../Send/QrCode";
import { listen } from "@tauri-apps/api/event";

export default function Recieve() {
  const { isTheme } = useTheme();
  const { qrCode, generateQRCode, qrText } = RecvLogic();
  const navigate = useNavigate();
  const [recvFile, setRecvFile] = useState<boolean>(true);
  const [showQR, setShowQR] = useState(false);
  const [text, setText] = useState<string>("");
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

  useEffect(() => {
    const fetch = async () => {
      if (!hasRun.current) {
        hasRun.current = true;
        await generateQRCode(recvFile ? "file" : "text");
      }
    };
    fetch();
  }, [recvFile]);

  return (
    <div
      className={`min-h-screen flex flex-col  ${
        isTheme ? "bg-dark-background" : "bg-light-background"
      }`}
    >
      <nav className="flex justify-between items-center p-6 w-full">
        <img
          src={isTheme ? darkBack : lightBack}
          alt="back"
          className="h-[40px] cursor-pointer"
          onClick={() => navigate("/", { replace: true })}
        />
        <div className="flex items-center gap-4">
          <ProfileButton />
          <ToggleThemeButton />
        </div>
      </nav>

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
            onClick={() => {
              setRecvFile(true);
              hasRun.current = false;
            }}
          >
            File
          </div>
          <div
            className={`cursor-pointer px-4 py-1 rounded-full transition-colors ${
              !recvFile ? "bg-gray-200 text-gray-800" : "text-gray-500"
            }`}
            onClick={() => {
              setRecvFile(false);
              hasRun.current = false;
            }}
          >
            Text
          </div>
        </div>

        <button
          onClick={() => setShowQR(!showQR)}
          className={`mb-4 mt-4 px-6 py-2 rounded-lg font-medium transition-colors ${
            isTheme
              ? "bg-gray-700 text-white hover:bg-gray-600"
              : "bg-gray-200 text-black hover:bg-gray-300"
          }`}
        >
          {showQR ? "Hide QR Code" : "Show QR Code"}
        </button>

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
