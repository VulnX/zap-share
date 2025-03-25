import { SendMobile } from "./SendMobile";
import { SendLogic } from "./SendLogic";
import SendDesktop from "./SendDesktop";
import { useContext } from "react";
import { DeviceProvider } from "../../App";

export default function Send() {
  const { isTheme, qrCode, openFileSelector, setQrCode } = SendLogic();
  const isMobile = useContext(DeviceProvider)?.isMobile;

  return isMobile ? (
    <SendMobile
      isTheme={isTheme}
      qrCode={qrCode}
      openFileSelector={openFileSelector}
      setQrCode={setQrCode}
    />
  ) : (
    <SendDesktop
      isTheme={isTheme}
      qrCode={qrCode}
      openFileSelector={openFileSelector}
      setQrCode={setQrCode}
    />
  );
}
