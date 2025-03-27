import QRCode from "qrcode";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "../Choice/Theme";
import Swal from "sweetalert2";
import { open } from "@tauri-apps/plugin-dialog";
import { useNavigate } from "react-router-dom";

const swalWithBootstrapButtons = Swal.mixin({
  customClass: {
    confirmButton: "btn btn-success",
    cancelButton: "btn btn-danger",
  },
  buttonsStyling: true,
});

interface SendFileResponse {
  Success: {
    ip: string | null;
    port: number;
  };
}

export function SendLogic() {
  const { isTheme } = useTheme();
  const [qrCode, setQrCode] = useState<string | null>(
    // Retrieve QR code from session storage on initial load
    sessionStorage.getItem("persistedQrCode")
  );
  const navigate = useNavigate();

  // Save QR code to session storage whenever it changes
  useEffect(() => {
    if (qrCode) {
      sessionStorage.setItem("persistedQrCode", qrCode);
    }
  }, [qrCode]);

  // Enhanced QR code generation function
  const generateQRCode = useCallback(async (files: string[]) => {
    try {
      // Invoke Tauri command to send files
      const response = await invoke<SendFileResponse>("send_file", {
        filepaths: files,
      });

      // Check if response has valid IP and port
      if (response.Success && response.Success.ip) {
        const { ip, port } = response.Success;
        const qrText = `http://${ip}:${port}`;

        console.log("Generating QR for URL:", qrText);

        // Generate QR code URL
        const url = await QRCode.toDataURL(qrText);

        console.log("Generated QR Code URL:", url);

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
  }, []);

  // Improved file selector with integrated QR code generation
  const openFileSelector = useCallback(async () => {
    try {
      const file = await open({
        multiple: true,
        directory: false,
      });

      if (file) {
        const files = Array.isArray(file) ? file : [file];

        // Generate QR code and navigate on success
        const qrCodeResult = await generateQRCode(files);

        if (qrCodeResult) {
          navigate("/send/confirm", { replace: true });
        } else {
          swalWithBootstrapButtons.fire({
            title: "QR Code Generation Failed",
            text: "Unable to generate QR code for file transfer",
            icon: "error",
            confirmButtonText: "OK",
          });
        }
      } else {
        swalWithBootstrapButtons.fire({
          title: "File not selected",
          text: "Please select a file to transfer",
          icon: "warning",
          confirmButtonText: "OK",
          reverseButtons: true,
        });
      }
    } catch (err) {
      console.error("File selection error:", err);
      swalWithBootstrapButtons.fire({
        title: "Error",
        text: "An error occurred during file selection",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  }, [generateQRCode, navigate]);

  return {
    isTheme,
    qrCode,
    openFileSelector,
    generateQRCode,
  };
}
