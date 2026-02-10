import QRCode from "qrcode";
import { flushSync } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useQrContext } from "../Context/QrContext";

interface RecvFileResponse {
  Success: {
    ip: string | null;
    port: number;
  };
}
interface RecvTextResponse {
  Success: {
    ip: string | null;
    port: number;
  };
}

export function RecvLogic() {
  const { qrCode, setQrCode, qrText, setQrText } = useQrContext();

  // Save QR code to session storage whenever it changes
  useEffect(() => {
    if (qrCode) {
      sessionStorage.setItem("persistedQrCode", qrCode);
    }
    if (qrText) {
      sessionStorage.setItem("persistedQrText", qrText);
      // console.log(qrText);
    }
  }, [qrCode, qrText]);

  // Enhanced QR code generation function
  const generateQRCode = async (text: String) => {
    try {
      // Invoke Tauri command to Recv files
      let response;
      if (text === "text") {
        response = await invoke<RecvTextResponse>("recv_text");
      } else if (text === "file") {
        response = await invoke<RecvFileResponse>("recv_file");
      }

      // Check if response has valid IP and port
      if (response && response.Success && response.Success.ip) {
        const { ip, port } = response.Success;
        const qr = `https://${ip}:${port}`;

        flushSync(() => {
          setQrText(qr);
        });
        console.log("Generating QR for URL:", qr);
        // Generate QR code URL
        const url = await QRCode.toDataURL(qr);

        // Update state and persist to session storage
        setQrCode(url);
        sessionStorage.setItem("persistedQrCode", url);
        sessionStorage.setItem("persistedQrText", qr);

        return url;
      } else {
        console.error("Invalid response or missing IP");
        setQrCode(null);
        setQrText(null);
        sessionStorage.removeItem("persistedQrCode");
        sessionStorage.removeItem("persistedQrText");
        return null;
      }
    } catch (err) {
      console.error("Error generating QR code:", err);
      setQrCode(null);
      setQrText(null);
      sessionStorage.removeItem("persistedQrCode");
      sessionStorage.removeItem("persistedQrText");
      return null;
    }
  };

  return {
    qrCode,
    generateQRCode,
    qrText,
  };
}
