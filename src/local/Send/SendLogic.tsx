import QRCode from "qrcode";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { useTheme } from "../Context/Theme";
import { open } from "@tauri-apps/plugin-dialog";
import { basename } from "@tauri-apps/api/path";
import { flushSync } from "react-dom";
import { useQrContext } from "../Context/QrContext";
import { useSharedDataContext } from "../Context/FileListContext";
import { SendFileResponse, SendTextResponse } from "../types";

export function SendLogic() {
  const { isTheme } = useTheme();
  const { qrCode, setQrCode, qrText, setQrText } = useQrContext();
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

        const filePairs: string[][] = await Promise.all(
          Array.from(files).map(async (file) => {
            const name = await basename(file);
            return [file, name];
          }),
        );
        response = await invoke<SendFileResponse>("send_file", {
          files: filePairs,
        });
      } else {
        response = await invoke<SendTextResponse>("send_text", { text });
      }
      // Check if response has valid IP and port
      if (response && response.Success && response.Success.ip) {
        const { ip, port } = response.Success;
        const qr = `http://${ip}:${port}`;
        flushSync(() => {
          setQrText(qr);
        });

        // Generate QR code URL
        const url = await QRCode.toString(qr, { type: "svg" });


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

  const saveSharedDataToState = (
    text: string | null,
    files: string[] | null,
  ) => {
    if (text !== null) {
      // Text was shared
      setText(text);
      setFileList([]); // Clear previous files
    } else if (files !== null) {
      // File(s) were shared
      setFileList(files);
      setText(undefined); // Clear previous text
    }
  };

  // Improved file selector with integrated QR code generation
  const openFileSelector = async () => {
    try {
      const files = await open({
        multiple: true,
        directory: false,
      });
      if (files && files.length > 0) {
        await proceedWithSend(files, null);
      }
    } catch (err) {
      console.error("File selection error:", err);
      throw new Error(
        err instanceof Error
          ? err.message
          : "An error occurred during file selection",
      );
    }
  };

  const proceedWithSend = async (
    files: string[] | null,
    text: string | null,
  ) => {
    try {
      // Generate QR code
      saveSharedDataToState(text, files!);
      const qrCodeResult = await generateQRCode(text, files || []);
      if (!qrCodeResult) {
        throw new Error("Unable to generate QR code for file transfer");
      }
      return qrCodeResult;
    } catch (err) {
      console.error("Error in proceedWithSend:", err);
      throw err instanceof Error ? err : new Error(err as string);
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
