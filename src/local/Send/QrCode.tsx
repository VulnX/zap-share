import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Progress, Typography } from "@material-tailwind/react";
import { useTheme } from "../Choice/Theme";
import { SendLogic } from "./SendLogic";

export function ProgressBar() {
  const [prog, setProg] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Set up the listener on component mount
    const setupListener = async () => {
      try {
        const unlisten = await listen("progress-update", (event) => {
          console.log(event.payload);
          setProg(event.payload as number);
        });

        console.log("Listening for progress updates");

        // Return the cleanup function (unlisten) to be used when the component unmounts
        return unlisten;
      } catch (error) {
        console.error("Error loading progress:", error);
      }
    };

    // Call the async function and handle cleanup correctly
    const unlistenPromise = setupListener();

    // Cleanup listener when the component unmounts
    return () => {
      unlistenPromise.then((unlisten) => {
        if (unlisten) unlisten(); // Remove event listener
      });
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  useEffect(() => {
    console.log("Progress updated:", prog); // Log when prog changes
  }, [prog]);

  return (
    <div className="h-10 w-[50vw]">
      <div className="mb-2 flex items-center justify-between gap-4">
        <Typography
          color="blue-gray"
          variant="h6"
          placeholder={undefined}
          onPointerEnterCapture={undefined}
          onPointerLeaveCapture={undefined}
        >
          Completed
        </Typography>
        <Typography
          color="blue-gray"
          variant="h6"
          placeholder={undefined}
          onPointerEnterCapture={undefined}
          onPointerLeaveCapture={undefined}
        >
          {prog}%
        </Typography>
      </div>
      <Progress
        value={prog}
        style={{ transition: "0.1s" }}
        placeholder={undefined}
        onPointerEnterCapture={undefined}
        onPointerLeaveCapture={undefined}
      />
    </div>
  );
}

export default function QrCode() {
  const { isTheme } = useTheme();
  const { qrCode } = SendLogic();

  return (
    <div>
      <div className="flex flex-col items-center mt-[15vh]">
        <div
          className={`${
            isTheme ? "bg-dark-qrBg" : "bg-light-qrBg"
          } mb-10 rounded-2xl`}
        >
          <img
            src={qrCode}
            alt="QR Code"
            className="w-64 h-64 mix-blend-multiply"
          />
        </div>
        <ProgressBar />
      </div>
    </div>
  );
}
