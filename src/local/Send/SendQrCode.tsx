import React, { useEffect, useRef, useState } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { Progress, Typography, Collapse } from "@material-tailwind/react";
import { useTheme } from "../Context/Theme";
import { useQrContext } from "../Context/QrContext";
import { useSharedDataContext } from "../Context/FileListContext";
import { invoke } from "@tauri-apps/api/core";
import { basename } from "@tauri-apps/api/path";
import { ProgressUpdatePayload, ServerConfiguration } from "../types";

export function ProgressBar() {
  const [progressMap, setProgressMap] = useState<
    Record<string, [string, number]>
  >({});
  const { isTheme } = useTheme();

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
              [event.payload.id]: [
                event.payload.filename,
                event.payload.progress,
              ],
            }));
          },
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
    <div className="w-full max-w-4xl mx-auto max-h-[500px] overflow-y-auto space-y-4">
      {Object.entries(progressMap).map(([id, [filename, progress]]) => (
        <div key={id} className="mb-4 sm:mb-6">
          <div className="mb-2 flex items-center justify-between gap-4 text-wrap">
            <Typography
              color={isTheme ? `light-green` : "blue-gray"}
              variant="h6"
              placeholder={undefined}
              onPointerEnterCapture={undefined}
              onPointerLeaveCapture={undefined}
            >
              Transfering {filename}
            </Typography>
            <Typography
              color={isTheme ? `light-green` : "blue-gray"}
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
            color={isTheme ? "light-green" : "gray"}
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

export const DeviceList: React.FC = () => {
  const { isTheme } = useTheme();
  const hasRun = useRef(false);
  const [nearbyDevices, setNearbyDevices] = useState<ServerConfiguration[]>([]);
  const { fileList, text } = useSharedDataContext();

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    let listeners: UnlistenFn[] = [];
    const setupListener = async () => {
      console.log("setting up listener");
      const listener = await listen<string>("device-list-updated", (event) => {
        // console.log("DEVICE LIST UPDATED", event.payload);
        const parsedDevices: ServerConfiguration[] = JSON.parse(event.payload);
        setNearbyDevices(parsedDevices);
      });
      listeners.push(listener);
      console.log("listener setup");
    };

    setupListener();
  }, []);

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
            {nearbyDevices.map((device, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-4 py-3 my-2 rounded-lg${
                  isTheme
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-200 text-black hover:bg-gray-300"
                }`}
                onClick={async () => {
                  console.log("okay preparing for send");
                  console.log("text:", text);
                  console.log("files:", fileList);
                  if (text === undefined) {
                    // File(s) were shared
                    const filePairs: [string, string][] = await Promise.all(
                      fileList.map(async (file) => {
                        const name = await basename(file);
                        return [file, name];
                      }),
                    );
                    console.log("sending: ", filePairs, "\nto:", device);
                    await invoke("send_files_to", {
                      files: filePairs,
                      to: device,
                    });
                  } else {
                    // Text was shared
                    console.log("sending:", text, ", to:", device);
                    await invoke("send_text_to", {
                      text,
                      to: device,
                    });
                  }
                }}
              >
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-3"></div>
                  <span className="text-sm ">{`${device.name}`}</span>
                </div>
                <span className="text-xs text-gray-500">Connected</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function QrCode({ onBack }: { onBack?: () => void }) {
  const { isTheme } = useTheme();
  const { qrCode, qrText } = useQrContext();
  const hasRun = useRef(false);
  const [openCollapse, setOpenCollapse] = useState(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      console.log("QR Code URL updated:", qrCode);
      console.log(qrText);
    }
  }, []);

  return (
    <div
      className={`flex flex-col w-full ${
        isTheme ? "bg-gray-900" : "bg-white"
      }`}
    >
      {/* <nav>
        <Navigation tab="send"/>
      </nav> */}
      <div className="flex flex-col items-center mt-[5vh] px-4 pb-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className={`mb-6 px-6 py-2 rounded-lg font-medium transition-colors self-start ${
            isTheme
              ? "bg-gray-700 text-white hover:bg-gray-600"
              : "bg-gray-200 text-black hover:bg-gray-300"
          }`}
        >
          Back
        </button>
        {/* QR Code Collapse */}
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
                  isTheme ? "bg-gray-500" : "bg-gray-100"
                } rounded-2xl p-4 flex justify-center shadow-lg transition-all duration-300 ease-in-out`}
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

        <div className="w-3/4 max-w-4xl px-4 m-auto">
          <DeviceList />
          <div className="pt-8">
            <ProgressBar />
          </div>
        </div>
      </div>
    </div>
  );
}
