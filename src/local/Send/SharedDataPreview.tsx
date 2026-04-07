import React, { useEffect, useState } from "react";
import { useSharedDataContext } from "../Context/FileListContext";
import { useTheme } from "../Context/Theme";
import { formatBytes } from "../Utils/format";
import { basename } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-fs";

interface FileInfo {
  name: string;
  size: string;
  path: string;
}

export const SharedDataPreview: React.FC<{
  containerRef?: React.RefObject<HTMLDivElement>;
}> = ({ containerRef }) => {
  const { fileList, text } = useSharedDataContext();
  const { isTheme: dark } = useTheme();
  const [filesInfo, setFilesInfo] = useState<FileInfo[]>([]);

  useEffect(() => {
    const fetchFileInfo = async () => {
      if (fileList.length > 0) {
        const info = await Promise.all(
          fileList.map(async (path) => {
            const name = await basename(path);
            try {
              const file = await open(path);
              const stat = await file.stat();
              return { name, size: formatBytes(stat.size), path };
            } catch (err) {
              console.error(`Failed to get stats for ${path}:`, err);
              return { name, size: "Unknown size", path };
            }
          }),
        );
        setFilesInfo(info);
      } else {
        setFilesInfo([]);
      }
    };

    fetchFileInfo();
  }, [fileList]);

  if (fileList.length === 0 && !text) return null;

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-4xl mt-8 p-6 rounded-3xl border transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${
        dark
          ? "bg-[#13151f] border-[#2a2d3e]"
          : "bg-white border-gray-100 shadow-xl shadow-gray-200/50"
      }`}
    >
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`p-2 rounded-xl ${dark ? "bg-indigo-500/10" : "bg-indigo-50"}`}
        >
          <svg
            className={`w-5 h-5 ${dark ? "text-indigo-400" : "text-indigo-600"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
            />
          </svg>
        </div>
        <h3
          className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}
        >
          Currently Sharing
        </h3>
      </div>

      {text ? (
        <div
          className={`p-4 rounded-2xl border ${dark ? "bg-[#1a1d2a] border-[#2a2d3e] text-indigo-300" : "bg-gray-50 border-gray-100 text-indigo-600"}`}
        >
          <p className="text-sm font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
            {text}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filesInfo.map((file, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-4 rounded-2xl border ${
                dark
                  ? "bg-[#1a1d2a] border-[#2a2d3e]"
                  : "bg-[#f8f9fc] border-gray-100"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-lg shrink-0 ${dark ? "bg-[#2a2d3e]" : "bg-white border border-gray-200"}`}
                >
                  <svg
                    className={`w-4 h-4 ${dark ? "text-[#9ba2c0]" : "text-gray-500"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-gray-900"}`}
                  >
                    {file.name}
                  </p>
                  <p
                    className={`text-xs ${dark ? "text-[#9ba2c0]" : "text-gray-500"}`}
                  >
                    {file.size}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
