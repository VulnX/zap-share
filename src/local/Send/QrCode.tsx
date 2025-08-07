import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Progress, Typography } from "@material-tailwind/react";
import { useTheme } from "../Choice/Theme";
import { SendLogic } from "./SendLogic";
import lightBack from "../images/lightBack.svg";
import darkBack from "../images/darkBack.svg";
import { ToggleThemeButton } from "../Choice/Navigation";
import { useNavigate } from "react-router-dom";

interface ProgressUpdatePayload {
  id: string; // Changed to string instead of String
  progress: number;
}

export function ProgressBar() {
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const hasRun = useRef(false);

  useEffect(() => {
    const setupListener = async () => {
      if (!hasRun.current) {
        try {
          const unlisten = await listen<ProgressUpdatePayload>(
            "progress-update",
            (event) => {
              console.log("Progress event payload:", event.payload);

              // Update progress for specific transfer ID
              setProgressMap((prevMap) => ({
                ...prevMap,
                [event.payload.id]: event.payload.progress,
              }));
            }
          );

          return unlisten;
        } catch (error) {
          console.error("Error loading progress:", error);
        }
      }

      const unlistenPromise = setupListener();
      hasRun.current = true;

      return () => {
        unlistenPromise.then((unlisten) => {
          if (unlisten) unlisten();
        });
      };
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

interface QrProps {
  value: boolean;
}

export default function QrCode({ value }: QrProps) {
  const { isTheme } = useTheme();
  const { qrCode, qrText } = SendLogic();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      console.log("QR Code URL updated:", qrCode);
      hasRun.current = true;
    }
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col  ${
        isTheme ? "bg-dark-background" : "bg-light-background"
      }`}
    >
      <nav className="flex justify-between p-6">
        <img
          src={isTheme ? darkBack : lightBack}
          alt="back"
          className="h-[40px]"
          onClick={() => navigate(value ? "/send" : "/", { replace: true })}
        />
        <ToggleThemeButton />
      </nav>
      <div className="flex flex-col items-center mt-[15vh]">
        <h2>{qrText}</h2>
        <div
          className={`${
            isTheme ? "bg-dark-qrBg" : "bg-light-qrBg"
          } mb-10 rounded-2xl`}
        >
          {qrCode ? (
            <img
              src={qrCode}
              alt="QR Code"
              className="w-64 h-64 mix-blend-multiply"
            />
          ) : (
            <p>Generating Qr Code....</p>
          )}
        </div>
        {value ? <ProgressBar /> : ""}
      </div>
    </div>
  );
}
