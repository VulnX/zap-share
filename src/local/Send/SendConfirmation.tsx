import { ToggleThemeButton } from "../Choice/Navigation";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../Choice/Theme";
import lightBack from "../images/lightBack.svg";
import darkBack from "../images/darkBack.svg";
import { useSharedDataContext } from "./FileListContext";
import { basename } from "@tauri-apps/api/path";
import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-fs";

const SendConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const { isTheme } = useTheme();
  const { fileList } = useSharedDataContext();
  const [fileNames, setFileNames] = useState("");
  const [totalSize, setTotalSize] = useState("");

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = Math.max(0, decimals);
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return `${size} ${sizes[i]}`;
  };

  useEffect(() => {
    const getNameAndSize = async () => {
      const names = await Promise.all(
        fileList.map(async (filePath) => await basename(filePath)),
      );
      setFileNames(names.join("\n"));
      const sizes = await Promise.all(
        fileList.map(async (filePath) => {
          const file = await open(filePath);
          const stat = await file.stat();
          return stat.size;
        }),
      );
      const total = sizes.reduce((sum, size) => sum + size, 0);
      setTotalSize(formatBytes(total));
    };

    getNameAndSize();
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
          onClick={() => navigate("/send", { replace: true })}
        />
        <ToggleThemeButton />
      </nav>
      <div className=" flex flex-col items-center justify-center mt-24">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">
            The following file will be sent:
          </h2>
          <div className="space-y-4">
            <div>
              <span className="font-medium">File name: </span>
              <span className="text-gray-700"> {fileNames}</span>
            </div>
            <div>
              <span className="font-medium">File size: </span>
              <span className="text-gray-700"> {totalSize}</span>
            </div>
            <div>
              <span className="font-medium">Estimated transfer time: </span>
              <span className="text-gray-700">A few seconds</span>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-4">
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition duration-300"
              onClick={() => navigate("/send", { replace: true })}
            >
              Cancel
            </button>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-300"
              onClick={() => navigate("/send/qrcode", { replace: true })}
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendConfirmation;
