import QRCode from "qrcode";
import { flushSync } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

interface RecvFileResponse {
  Success: {
    ip: string | null;
    port: number;
  };
}

export function RecvLogic() {
  const [qrCode, setQrCode] = useState<string | null>(
    // Retrieve QR code from session storage on initial load
    sessionStorage.getItem("persistedQrCode")
  );
  const [qrText, setQrText] = useState<string | null>();

  // Save QR code to session storage whenever it changes
  useEffect(() => {
    if (qrCode) {
      sessionStorage.setItem("persistedQrCode", qrCode);
    }
  }, [qrCode]);

  // Enhanced QR code generation function
  const generateQRCode = async () => {
    try {
      // Invoke Tauri command to Recv files

      const response = await invoke<RecvFileResponse>("recv_file");

      // Check if response has valid IP and port
      if (response.Success && response.Success.ip) {
        const { ip, port } = response.Success;
        const qr = `http://${ip}:${port}`;

        flushSync(() => {
          setQrText(qr);
        });
        console.log("Generating QR for URL:", qr);
        // Generate QR code URL
        const url = await QRCode.toDataURL(qr);

        // console.log("Generated QR Code URL:", url);

        // Update state and persist to session storage
        setQrCode(url);
        sessionStorage.setItem("persistedQrCode", url);

        return url;
      } else {
        console.error("Invalid response or missing IP");
        setQrCode(null);
        sessionStorage.removeItem("persistedQrCode");
        return null;
      }
    } catch (err) {
      console.error("Error generating QR code:", err);
      setQrCode(null);
      sessionStorage.removeItem("persistedQrCode");
      return null;
    }
  };

  return {
    qrCode,
    generateQRCode,
    qrText,
  };
}
