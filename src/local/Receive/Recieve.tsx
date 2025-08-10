import { useTheme } from "../Choice/Theme";
import lightBack from "../images/lightBack.svg";
import darkBack from "../images/darkBack.svg";
import { useEffect, useRef } from "react";
import { RecvLogic } from "./RecieveLogic";
import { useNavigate } from "react-router-dom";
import { ToggleThemeButton } from "../Choice/Navigation";
import { ProgressBar } from "../Send/QrCode";

export default function Recieve() {
  const { isTheme } = useTheme();
  const { qrCode, generateQRCode, qrText } = RecvLogic();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    const fetch = async () => {
      // const existingQrCode = sessionStorage.getItem("persistedQrCode");
      if (!hasRun.current) {
        await generateQRCode();
      }
    };
    fetch();
    hasRun.current = true;
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
          onClick={() => navigate("/", { replace: true })}
        />
        <ToggleThemeButton />
      </nav>
      <div className="flex flex-col items-center mt-[15vh]">
        <h2>{qrText}</h2>
        <div
          className={`${isTheme ? "bg-dark-qrBg" : "bg-light-qrBg"
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
        <ProgressBar />
      </div>
    </div>
  );
}
