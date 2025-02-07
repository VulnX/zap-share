import { useState } from "react";
import { useTheme } from "../Choice/Theme";
import Swal from "sweetalert2";
import QRCode from "qrcode";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

interface SendFileResponse {
  Success: {
    ip: string | null;
    port: number;
  };
}

const swalWithBootstrapButtons = Swal.mixin({
  customClass: {
    confirmButton: "btn btn-success",
    cancelButton: "btn btn-danger"
  },
  buttonsStyling: true
});

export function SendLogic() {
  const { isTheme } = useTheme();
  const [qrCode, setQrCode] = useState<string | null>(null);

  const openFileSelector = async () => {
    const file = await open({
      multiple: false,
      directory: false,
    });

    if (file) {
      invoke<SendFileResponse>("send_file", { filepath: file })
        .then((response) => {
          const { ip, port } = response.Success;
          if (ip) {
            generateQR(`http://${ip}:${port}/download`);
          } else {
            console.error("IP detection failed. Unable to generate QR code.");
          }
        })
        .catch((err) => console.error("Error invoking send_file:", err));
    } else {
      swalWithBootstrapButtons.fire({
        title: "File not selected",
        text: "Please select a file to transfer",
        icon: "warning",
        confirmButtonText: "OK",
        reverseButtons: true
      });
    }
  };

  const generateQR = async (text: string) => {
    try {
      const url = await QRCode.toDataURL(text);
      setQrCode(url);
    } catch (err) {
      console.error(err);
    }
  };

  return { isTheme, qrCode, openFileSelector };
}
