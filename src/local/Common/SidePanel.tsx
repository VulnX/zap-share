import React, { useState, useEffect, useRef } from "react";
import { Drawer, Switch } from "@material-tailwind/react";
import { ToggleThemeButton } from "./Navigation";
import { invoke } from "@tauri-apps/api/core";
import { DeviceConfig } from "../types";

interface SidePanelProps {
  openSettings: boolean;
  setOpenSettings: (openSettings: boolean) => void;
}

export function SidePanel({ openSettings, setOpenSettings }: SidePanelProps) {
  const closeDrawer = () => setOpenSettings(false);
  const [endToEndEncryption, setEndToEndEncryption] = useState(true);
  const [autoDiscovery, setAutoDiscovery] = useState(true);
  const [deviceName, setDeviceName] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function getDeviceName() {
      const config: DeviceConfig = await invoke("get_device_config");
      setDeviceName(config.name);
    }

    getDeviceName();
  }, []);
  return (
    <React.Fragment>
      <Drawer
        open={openSettings}
        onClose={closeDrawer}
        className="p-4 overflow-y-auto"
        {...{} as any}
      >
        {/* Header */}
        <div className="p-6 pl-3 pb-4">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Customize your file sharing experience
          </p>
        </div>

        <div className="border-t border-gray-200" />

        {/* Appearance Section */}
        <div className="pr-4 pl-3 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Appearance
          </h3>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                Dark Mode
              </span>
            </div>
            <ToggleThemeButton />
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* Security Section */}
        <div className="pr-4 pl-3 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Security</h3>

          {/* End-to-End Encryption */}
          <div className="flex items-start justify-between py-3">
            <div className="flex items-start gap-3 flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700 mt-0.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    End-to-End Encryption
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Secure your transfers
                </p>
              </div>
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                AES-256
              </span>
            </div>
            <div className="ml-3">
              <Switch
                checked={endToEndEncryption}
                onChange={(event) =>
                  setEndToEndEncryption(event.target.checked)
                }
                // placeholder=""
                // onpointerEnterCapture={() => {}}
                // onpointerLeaveCapture={() => {}}
                crossOrigin={undefined}
              />
            </div>
          </div>

          {/* Encryption Keys */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                Encryption Keys
              </span>
            </div>
            <span className="text-xs font-medium text-gray-600">Advanced</span>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* Connection Section */}
        <div className="pr-4 pl-3 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Connection
          </h3>

          {/* Auto Discovery */}
          <div className="flex items-start justify-between py-3">
            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700 mt-0.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
                />
              </svg>
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Auto Discovery
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Find nearby devices
                </p>
              </div>
            </div>
            <Switch
              checked={autoDiscovery}
              onChange={(event) => setAutoDiscovery(event.target.checked)}
              // placeholder=""
              // onpointerEnterCapture={() => {}}
              // onpointerLeaveCapture={() => {}}
              crossOrigin={undefined}
            />
          </div>

          {/* Device Name */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                Device Name
              </span>
            </div>
            <span className="text-sm text-gray-500">{deviceName || "Loading..."}</span>
          </div>
        </div>

        <div className="border-t border-gray-200" />

        {/* Transfer Section */}
        <div className="pr-4 pl-3 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Transfer</h3>

          {/* Transfer Speed */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                Transfer Speed
              </span>
            </div>
            <span className="text-sm text-gray-500">Balanced</span>
          </div>

          {/* About */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">About</span>
            </div>
            <span className="text-sm text-gray-500">v1.0.0</span>
          </div>
        </div>
      </Drawer>
    </React.Fragment>
  );
}
