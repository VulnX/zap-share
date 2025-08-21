import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Progress, Typography } from "@material-tailwind/react";
import { useTheme } from "../Choice/Theme";
import { useQrContext } from "./QrContext";
import lightBack from "../images/lightBack.svg";
import darkBack from "../images/darkBack.svg";
import { ProfileButton, ToggleThemeButton } from "../Choice/Navigation";
import { useNavigate } from "react-router-dom";

interface ProgressUpdatePayload {
  id: string; // Changed to string instead of String
  progress: number;
}

export function ProgressBar() {
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await listen<ProgressUpdatePayload>(
          "progress-update",
          (event) => {
            // console.log("Progress event payload:", event.payload);

            setProgressMap((prevMap) => ({
              ...prevMap,
              [event.payload.id]: event.payload.progress,
            }));
          }
        );
      } catch (error) {
        console.error("Error loading progress:", error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return (
    <div className="w-[50vw] space-y-4">
      {Object.entries(progressMap).map(([id, progress]) => (
        <div key={id} className="h-10">
          <div className="mb-2 flex items-center justify-between gap-4 text-wrap">
            <Typography
              color="blue-gray"
              variant="h6"
              placeholder={undefined}
              onPointerEnterCapture={undefined}
              onPointerLeaveCapture={undefined}
            >
              Transfer {id}
            </Typography>
            <Typography
              color="blue-gray"
              variant="h6"
              placeholder={undefined}
              onPointerEnterCapture={undefined}
              onPointerLeaveCapture={undefined}
            >
              {progress}%
            </Typography>
          </div>
          <Progress
            value={progress}
            style={{ transition: "0.1s" }}
            placeholder={undefined}
            onPointerEnterCapture={undefined}
            onPointerLeaveCapture={undefined}
          />
        </div>
      ))}
    </div>
  );
}

export function DeviceList() {
  const { isTheme } = useTheme();

  return (
    <div className="m-auto flex flex-col items-center w-full max-w-md mt-4">
      <div className="w-full px-4">
        <div
          className={`${
            isTheme
              ? "bg-gray-700 text-white hover:bg-gray-600"
              : "bg-gray-200 text-black hover:bg-gray-300"
          }rounded-lg shadow-lg overflow-hidden`}
        >
          <div className="px-4 py-3 border-gray-200 font-semibold">
            <h3 className="text-sm font-medium">Nearby Devices</h3>
          </div>
          <div className="divide-y">
            {["Device 1", "Device 2"].map((device, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-4 py-3 my-2 rounded-lg${
                  isTheme
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-200 text-black hover:bg-gray-300"
                }`}
              >
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                  <span className="text-sm ">{device}</span>
                </div>
                <span className="text-xs text-gray-500">Connected</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QrCode() {
  const { isTheme } = useTheme();
  const { qrCode, qrText } = useQrContext();
  const navigate = useNavigate();
  const hasRun = useRef(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!hasRun.current) {
      console.log("QR Code URL updated:", qrCode);
      console.log(qrText);
      hasRun.current = true;
    }
  }, []);

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
          onClick={() => navigate("/send", { replace: true })}
        />
        <div className="flex items-center gap-4">
          <ProfileButton />
          <ToggleThemeButton />
        </div>
      </nav>
      <div className="flex flex-col items-center mt-[10vh]">
        <button
          onClick={() => setShowQR(!showQR)}
          className={`mb-4 px-6 py-2 rounded-lg font-medium transition-colors ${
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

        <div className="w-full max-w-4xl px-4">
          <ProgressBar />
          <DeviceList />
        </div>
      </div>
    </div>
  );
}
