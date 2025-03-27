import { SendMobile } from "./SendMobile";
import SendDesktop from "./SendDesktop";
import { useContext } from "react";
import { DeviceProvider } from "../../App";

export default function Send() {
  const isMobile = useContext(DeviceProvider)?.isMobile;

  return isMobile ? <SendMobile /> : <SendDesktop />;
}
