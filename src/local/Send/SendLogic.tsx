import { useState } from "react";
import { useTheme } from "../Choice/Theme";
import Swal from "sweetalert2";
import { open } from "@tauri-apps/plugin-dialog";
import { GetIP } from "./IP";
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

  const openFileSelector = async () => {
    const file = await open({
      multiple: false,
      directory: false,
    });

    if (file) {
      navigate("/send/confirm", { replace: true });
      GetIP(file, setQrCode);
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
