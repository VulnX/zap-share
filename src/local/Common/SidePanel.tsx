import React, { useState, useEffect, useRef } from "react";
import { Drawer, Switch } from "@material-tailwind/react";
import { ToggleThemeButton } from "./Navigation";
import { invoke } from "@tauri-apps/api/core";
import { DeviceConfig } from "../types";
import { useTheme } from "../Context/Theme";

interface SidePanelProps {
  openSettings: boolean;
  setOpenSettings: (openSettings: boolean) => void;
}

export function SidePanel({ openSettings, setOpenSettings }: SidePanelProps) {
  const closeDrawer = () => setOpenSettings(false);
  const { isTheme: dark } = useTheme();
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

  const sectionLabelClass = `text-[10px] font-bold uppercase tracking-[0.12em] mb-3 ${
    dark ? "!text-[#5a6080]" : "!text-[#9097b0]"
  }`;
  const rowClass = `flex items-center justify-between py-3`;
  const iconClass = `w-5 h-5 ${dark ? "!text-[#8b92b3]" : "!text-[#9097b0]"}`;
  const labelClass = `text-sm font-medium ${dark ? "!text-slate-200" : "!text-[#1a1d2e]"}`;
  const sublabelClass = `text-xs mt-0.5 ${dark ? "!text-[#5a6080]" : "!text-[#9097b0]"}`;
  const badgeClass = `text-xs font-semibold px-2.5 py-1 rounded-lg ${
    dark ? "bg-[#2a2d3e] !text-[#8b92b3]" : "bg-[#f1f3f8] !text-[#5b6178]"
  }`;
  const dividerClass = `border-t ${dark ? "border-[#2a2d3e]" : "border-[#e2e5ef]"}`;

  return (
    <React.Fragment>
      <Drawer
        open={openSettings}
        onClose={closeDrawer}
        className={`flex flex-col ${dark ? "!bg-[#13151f] text-white" : "!bg-[#f8f9fc] !text-[#1a1d2e]"}`}
        {...({} as any)}
      >
        {/* Header - fixed, does not scroll */}
        <div
          className={`px-5 pt-6 pb-5 border-b flex-shrink-0 ${dark ? "border-[#2a2d3e]" : "border-[#e2e5ef]"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className={`text-lg font-bold tracking-tight ${dark ? "text-white" : "!text-[#1a1d2e]"}`}
              >
                Settings
              </h2>
              <p
                className={`text-xs mt-0.5 ${dark ? "!text-[#8b92b3]" : "!text-[#9097b0]"}`}
              >
                Customize your experience
              </p>
            </div>
            <button
              onClick={closeDrawer}
              className={`p-2 rounded-xl transition-all ${
                dark
                  ? "!text-[#8b92b3] hover:bg-[#2a2d3e] hover:!text-slate-200"
                  : "!text-[#9097b0] hover:bg-[#e8ebf2] hover:!text-[#5b6178]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="px-5 py-5 space-y-6 overflow-y-auto flex-1">
          {/* Appearance Section */}
          <div>
            <p className={sectionLabelClass}>Appearance</p>
            <div className={rowClass}>
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={iconClass}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                  />
                </svg>
                <span className={labelClass}>Dark Mode</span>
              </div>
              <ToggleThemeButton />
            </div>
          </div>

          <div className={dividerClass} />

          {/* Security Section */}
          <div>
            <p className={sectionLabelClass}>Security</p>

            {/* E2E Encryption */}
            <div className="flex items-start justify-between py-3">
              <div className="flex items-start gap-3 flex-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`${iconClass} mt-0.5`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                <div className="flex-1">
                  <span className={labelClass}>End-to-End Encryption</span>
                  <p className={sublabelClass}>Secure your transfers</p>
                </div>
                <span className={`${badgeClass} self-start ml-2`}>AES-256</span>
              </div>
              <div className="ml-3 self-start mt-0.5">
                <Switch
                  checked={endToEndEncryption}
                  onChange={(e) => setEndToEndEncryption(e.target.checked)}
                  id="custom-switch-component-2"
                  ripple={false}
                  className={`h-full w-full bg-blue-gray-400 checked:bg-blue-gray-800`}
                  circleProps={{
                    className: `before:hidden `,
                  }}
                  {...({} as any)}
                />
              </div>
            </div>

            {/* Encryption Keys */}
            <div className={rowClass}>
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={iconClass}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                <span className={labelClass}>Encryption Keys</span>
              </div>
              <span
                className={`text-xs font-medium ${dark ? "!text-[#8b92b3]" : "!text-[#9097b0]"}`}
              >
                Advanced
              </span>
            </div>
          </div>

          <div className={dividerClass} />

          {/* Connection Section */}
          <div>
            <p className={sectionLabelClass}>Connection</p>

            {/* Auto Discovery */}
            <div className="flex items-start justify-between py-3">
              <div className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`${iconClass} mt-0.5`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
                  />
                </svg>
                <div>
                  <span className={labelClass}>Auto Discovery</span>
                  <p className={sublabelClass}>Find nearby devices</p>
                </div>
              </div>
              <Switch
                checked={autoDiscovery}
                onChange={(e) => setAutoDiscovery(e.target.checked)}
                id="custom-switch-component-3"
                ripple={false}
                className="h-full w-full bg-blue-gray-400 checked:bg-blue-gray-800"
                circleProps={{
                  className: "before:hidden",
                }}
                {...({} as any)}
              />
            </div>

            {/* Device Name */}
            <div className={rowClass}>
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={iconClass}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                  />
                </svg>
                <span className={labelClass}>Device Name</span>
              </div>
              <span
                className={`text-sm ${dark ? "!text-[#8b92b3]" : "!text-[#9097b0]"} max-w-[40%] truncate text-right`}
              >
                {deviceName || "Loading..."}
              </span>
            </div>
          </div>

          <div className={dividerClass} />

          {/* Transfer Section */}
          <div>
            <p className={sectionLabelClass}>Transfer</p>

            {/* Transfer Speed */}
            <div className={rowClass}>
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={iconClass}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
                <span className={labelClass}>Transfer Speed</span>
              </div>
              <span
                className={`text-sm ${dark ? "!text-[#8b92b3]" : "!text-[#9097b0]"}`}
              >
                Balanced
              </span>
            </div>

            {/* About */}
            <div className={rowClass}>
              <div className="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={iconClass}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
                <span className={labelClass}>About</span>
              </div>
              <span className={badgeClass}>v1.0.0</span>
            </div>
          </div>
        </div>
      </Drawer>
    </React.Fragment>
  );
}
