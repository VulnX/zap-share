import SendUI from "./SendUI";
import { SendLogic } from "./SendFunction";

export default function Send() {
  const { isTheme, qrCode, openFileSelector, setQrCode } = SendLogic();

  return (
    <SendUI
      isTheme={isTheme}
      qrCode={qrCode}
      openFileSelector={openFileSelector}
      setQrCode={setQrCode}
    />
  );
}
