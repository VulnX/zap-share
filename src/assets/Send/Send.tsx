import SendUI from "./SendUI";
import { SendLogic } from "./SendFunction";

export default function Send() {
    const { isTheme, qrCode, openFileSelector } = SendLogic();

    return (
        <SendUI
            isTheme={isTheme}
            qrCode={qrCode}
            openFileSelector={openFileSelector}
        />
    );
}
