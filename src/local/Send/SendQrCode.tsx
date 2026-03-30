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
              {...({} as any)}
            >
              Transfering {filename}
            </Typography>
            <Typography
              color={isTheme ? `light-green` : "blue-gray"}
              variant="h6"
              {...({} as any)}
            >
              {progress}%
            </Typography>
          </div>
          <Progress
            value={progress}
            color={isTheme ? "light-green" : "gray"}
            style={{ transition: "0.1s" }}
            {...({} as any)}
          />
        </div>
      ))}
    </div>
  );
}

export const DeviceList: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { isTheme } = useTheme();
  const hasRun = useRef(false);

  const [nearbyDevices, setNearbyDevices] = useState<ServerConfiguration[]>([]);

  const { fileList, text } = useSharedDataContext();

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    let listeners: UnlistenFn[] = [];

    const setupListener = async () => {
      const listener = await listen<string>("device-list-updated", (event) => {
        const parsedDevices: ServerConfiguration[] = JSON.parse(event.payload);
        setNearbyDevices(parsedDevices);
        console.log(parsedDevices);
      });

      listeners.push(listener);
    };

    setupListener();
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto mt-6">
      <div
        className={`border rounded-xl shadow-sm ${
          isTheme
            ? "!bg-[#1a1d2a] !border-[#2a2d3e]"
            : "bg-white border-gray-200"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isTheme ? "border-[#2a2d3e]" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {/* WIFI ICON (BLUE) */}
            <svg
              className="w-5 h-5 text-blue-500"
              viewBox="0 0 576 512"
              fill="currentColor"
            >
              <path d="M288 96c-90.9 0-173.2 36-233.7 94.6-12.7 12.3-33 12-45.2-.7s-12-33 .7-45.2C81.7 74.9 179.9 32 288 32S494.3 74.9 566.3 144.7c12.7 12.3 13 32.6 .7 45.2s-32.6 13-45.2 .7C461.2 132 378.9 96 288 96zM240 432a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zM168 326.2c-11.7 13.3-31.9 14.5-45.2 2.8s-14.5-31.9-2.8-45.2C161 237.4 221.1 208 288 208s127 29.4 168 75.8c11.7 13.3 10.4 33.5-2.8 45.2s-33.5 10.4-45.2-2.8C378.6 292.9 335.8 272 288 272s-90.6 20.9-120 54.2z" />
            </svg>

            <h3
              className={`text-sm font-semibold ${
                isTheme ? "text-white" : "text-gray-700"
              }`}
            >
              Nearby Devices
            </h3>
          </div>

          {/* Stop Button */}
          <button
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
            onClick={onBack}
          >
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Stop
          </button>
        </div>

        {/* Device List */}
        <div className="p-4 space-y-3">
          {nearbyDevices.map((device, index) => {
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-4 border rounded-xl transition cursor-pointer ${
                  isTheme
                    ? "bg-[#13151f] border-[#2a2d3e] hover:bg-[#2a2d3e]"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
                onClick={async () => {
                  if (text === undefined) {
                    const filePairs = await Promise.all(
                      fileList.map(async (file) => {
                        const name = await basename(file);
                        return [file, name];
                      }),
                    );

                    await invoke("send_files_to", {
                      files: filePairs,
                      to: device,
                    });
                  } else {
                    await invoke("send_text_to", {
                      text,
                      to: device,
                    });
                  }
                }}
              >
                {/* LEFT */}
                <div className="flex items-center gap-4">
                  {/* ICON */}
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full ${
                      isTheme ? "bg-[#2a2d3e]" : "bg-gray-200"
                    }`}
                  >
                    {device.type === "mobile" && (
                      <svg
                        className={`w-5 h-5 ${
                          isTheme ? "text-slate-200" : "text-gray-700"
                        }`}
                        viewBox="0 0 384 512"
                        fill="currentColor"
                      >
                        <path d="M16 64C16 28.7 44.7 0 80 0L304 0c35.3 0 64 28.7 64 64l0 384c0 35.3-28.7 64-64 64L80 512c-35.3 0-64-28.7-64-64L16 64zm64 0l0 304 224 0 0-304-224 0zM192 472c17.7 0 32-14.3 32-32s-14.3-32-32-32-32 14.3-32 32 14.3 32 32 32z" />
                      </svg>
                    )}

                    {device.type === "computer" && (
                      <svg
                        className={`w-5 h-5 ${
                          isTheme ? "text-slate-200" : "text-gray-700"
                        }`}
                        viewBox="0 0 640 512"
                        fill="currentColor"
                      >
                        <path d="M128 32C92.7 32 64 60.7 64 96l0 256 512 0 0-256c0-35.3-28.7-64-64-64L128 32zM0 400c0 26.5 21.5 48 48 48l544 0c26.5 0 48-21.5 48-48l0-16L0 384l0 16z" />
                      </svg>
                    )}
                  </div>

                  {/* TEXT */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isTheme ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {device.name}
                      </span>
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    </div>

                    {/* Chips */}
                    <div className="flex gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md w-fit whitespace-nowrap ${
                          isTheme
                            ? "bg-[#2a2d3e] text-[#c4c9de]"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        Available
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md ${
                          isTheme
                            ? "bg-[#2a2d3e] text-[#c4c9de]"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {device.type === "mobile" ? "Phone" : "Laptop"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`text-center text-xs pb-4 ${
            isTheme ? "text-[#9ba2c0]" : "text-gray-400"
          }`}
        >
          Make sure other devices have the app open and are nearby
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
      className={`w-full h-full flex flex-col ${isTheme ? "bg-[#13151f]" : "bg-white"}`}
    >
      <div className="flex flex-col items-center mt-[5vh] px-4 pb-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className={`mb-6 px-6 py-2 rounded-lg font-medium transition-colors self-start ${
            isTheme
              ? "bg-[#2a2d3e] text-white hover:bg-[#343748]"
              : "bg-gray-200 text-black hover:bg-gray-300"
          }`}
        >
          Back
        </button>
        {/* QR Code Collapse */}
        <div className="w-full max-w-sm ">
          <Collapse
            open={openCollapse}
            className={`border rounded-lg ${
              isTheme
                ? "!bg-[#1a1d2a] !border-[#2a2d3e]"
                : "bg-white border-gray-300"
            }`}
          >
            <div className="p-6 pb-0">
              <h2
                className={`text-lg font-semibold text-center ${
                  isTheme ? "text-white" : "text-black"
                }`}
              >
                {qrText}
              </h2>
              <div
                className={` rounded-2xl  flex justify-center  transition-all duration-300 ease-in-out`}
              >
                {qrCode ? (
                  <div
                    className="qr-container"
                    dangerouslySetInnerHTML={{ __html: qrCode }}
                  />
                ) : (
                  <p
                    className={`text-center ${
                      isTheme ? "text-[#c4c9de]" : "text-gray-700"
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
                ? "bg-[#2a2d3e] text-white hover:bg-[#343748]"
                : "bg-gray-200 text-black hover:bg-gray-300"
            }`}
          >
            {openCollapse ? "Hide QR Code" : "Show QR Code"}
          </button>
        </div>

        <div className="w-full max-w-4xl px-4 m-auto">
          <DeviceList onBack={onBack} />
          <div className="pt-8">
            <ProgressBar />
          </div>
        </div>
      </div>
    </div>
  );
}
