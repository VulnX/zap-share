import QRCode from "qrcode";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
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

export function SendLogic() {
  const { isTheme } = useTheme();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log(qrCode);
  }, [qrCode]);

  const openFileSelector = async () => {
    const file = await open({
      multiple: true,
      directory: false,
    });

    if (file) {
      const files = Array.isArray(file) ? file : [file];
      GetIP(files, setQrCode);
      navigate("/send/confirm", { replace: true });
    } else {
      swalWithBootstrapButtons.fire({
        title: "File not selected",
        text: "Please select a file to transfer",
        icon: "warning",
        confirmButtonText: "OK",
        reverseButtons: true,
      });
    }
  };

  return { isTheme, qrCode, openFileSelector, setQrCode };
}

interface SendFileResponse {
  Success: {
    ip: string | null;
    port: number;
  };
}

export function GetIP(files: string[], setQrCode: (arg0: string) => void) {
  // const { qrCode } = SendLogic();

  const generateQR = async (text: string) => {
    try {
      const url = await QRCode.toDataURL(text);
      setQrCode(url);
      console.log(url);
    } catch (err) {
      console.error(err);
    }
  };

  invoke<SendFileResponse>("send_file", { filepaths: files })
    .then((response) => {
      // console.log(response);

      const { ip, port } = response.Success;
      if (ip) {
        generateQR(`http://${ip}:${port}/download`);
      } else {
        console.error("IP detection failed. Unable to generate QR code.");
      }
    })
    .catch((err) => console.error("Error invoking send_file:", err));
}
