import { useContext } from "react";
import { DeviceProvider } from "../../App";
import ChoiceMobile from "./ChoiceMobile";
import ChoiceDesk from "./ChoiceDesk";

export default function Choice() {
  const isMobile = useContext(DeviceProvider)?.isMobile;

  return <div>{isMobile ? <ChoiceMobile /> : <ChoiceDesk />}</div>;
}
