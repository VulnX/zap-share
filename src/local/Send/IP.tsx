import QRCode from "qrcode";
import { invoke } from "@tauri-apps/api/core";

interface SendFileResponse {
  Success: {
    ip: string | null;
    port: number;
  };
}

export function GetIP(file: string, setQrCode: (arg0: string) => void) {
  const generateQR = async (text: string) => {
    try {
      const url = await QRCode.toDataURL(text);
      setQrCode(url);
    } catch (err) {
      console.error(err);
    }
  };

  invoke<SendFileResponse>("send_file", { filepath: file })
    .then((response) => {
      console.log(response);

      const { ip, port } = response.Success;
      if (ip) {
        generateQR(`http://${ip}:${port}/download`);
      } else {
        console.error("IP detection failed. Unable to generate QR code.");
      }
    })
    .catch((err) => console.error("Error invoking send_file:", err));
}
