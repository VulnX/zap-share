import QRCode from "qrcode";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useTheme } from "../Choice/Theme";
import Swal from "sweetalert2";
import { open } from "@tauri-apps/plugin-dialog";
import { useNavigate } from "react-router-dom";
import { basename } from "@tauri-apps/api/path";
import { flushSync } from "react-dom";
import { useQrContext } from "./QrContext";
import { useSharedDataContext } from "./FileListContext";
import { SendFileResponse, SendTextResponse } from "../types";

const swalWithBootstrapButtons = Swal.mixin({
  customClass: {
    confirmButton: "btn btn-success",
    cancelButton: "btn btn-danger",
  },
  buttonsStyling: true,
});

export function SendLogic() {
  const { isTheme } = useTheme();
  const { qrCode, setQrCode, qrText, setQrText } = useQrContext();
  const navigate = useNavigate();
  const { setFileList, setText } = useSharedDataContext();

  // Save QR code to session storage whenever it changes
  useEffect(() => {
    if (qrCode) {
      sessionStorage.setItem("persistedQrCode", qrCode);
    }
  }, [qrCode]);

  // Save QR text to session storage whenever it changes
  useEffect(() => {
    if (qrText) {
      sessionStorage.setItem("persistedQrText", qrText);
    }
  }, [qrText]);

  // Enhanced QR code generation function
  const generateQRCode = async (text: string | null, files: string[]) => {
    try {
      // Invoke Tauri command to send files
      let response: SendFileResponse | SendTextResponse | null = null;
      if (text === null || text === "") {
        console.log(files);

        const filePairs: string[][] = await Promise.all(
          Array.from(files).map(async (file) => {
            const name = await basename(file);
            return [file, name];
          }),
        );
        console.log("File Pairs:", filePairs);
        console.log("sending :", files);
        response = await invoke<SendFileResponse>("send_file", {
          files: filePairs,
        });
      } else {
        // console.log("invoked send text:", text);
        response = await invoke<SendTextResponse>("send_text", { text });
      }
      // Check if response has valid IP and port
      if (response && response.Success && response.Success.ip) {
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

  const saveSharedDataToState = (text: string | null, files: string[]) => {
    if (text !== null) {
      // Text was shared
      setText(text);
    } else {
      // File(s) where shared
      setFileList(files);
    }
  };

  // Improved file selector with integrated QR code generation
  const openFileSelector = async () => {
    try {
      const files = await open({
        multiple: true,
        directory: false,
      });
      proceedWithSend(files, null);
    } catch (err) {
      console.error("File selection error:", err);
      swalWithBootstrapButtons.fire({
        title: "Error",
        text: "An error occurred during file selection",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const proceedWithSend = async (
    files: string[] | null,
    text: string | null,
  ) => {
    // Generate QR code and navigate on success
    saveSharedDataToState(text, files!);
    const qrCodeResult = await generateQRCode(text, files || []);
    if (text !== "" && qrCodeResult) {
      navigate("/send/qrcode", { replace: true });
    } else if (qrCodeResult) {
      navigate("/send/confirm", { replace: true });
    } else {
      swalWithBootstrapButtons.fire({
        title: "QR Code Generation Failed",
        text: "Unable to generate QR code for file transfer",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  return {
    isTheme,
    qrCode,
    openFileSelector,
    generateQRCode,
    qrText,
    proceedWithSend,
  };
}
