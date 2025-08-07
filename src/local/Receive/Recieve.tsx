import { useTheme } from "../Choice/Theme";

import QrCode from "../Send/QrCode";
import { useEffect } from "react";
import { RecvLogic } from "./RecieveLogic";

export default function Recieve() {
  const { isTheme } = useTheme();
  const { generateQRCode } = RecvLogic();

  useEffect(() => {
    generateQRCode();
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col  ${
        isTheme ? " bg-dark-background" : " bg-light-background "
      }`}
    >
      {/* <nav className="flex items-center justify-between || h-[20vh]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="35px"
          viewBox="0 -960 960 960"
          width="35px"
          fill={isTheme ? "#FFFFFF" : " #000000"}
          className={`ml-10 rounded-full ${
            isTheme ? "hover:bg-zinc-700" : "hover:bg-neutral-200"
          } clickable`}
          onClick={() => navigate("/", { replace: true })}
        >
          <path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z" />
        </svg>
        <div className="w-full">
          <Navigation />
        </div>
      </nav> */}
      <div className="mt-10">
        <QrCode value={false} />
        <h1>Scan this Qr to upload Files</h1>
      </div>
    </div>
  );
}
