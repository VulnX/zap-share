import React, { createContext, useContext, useState } from "react";

interface QrContextType {
  qrCode: string | null;
  setQrCode: React.Dispatch<React.SetStateAction<string | null>>;
  qrText: string | null;
  setQrText: React.Dispatch<React.SetStateAction<string | null>>;
}

const QrContext = createContext<QrContextType | undefined>(undefined);

export const QrProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [qrCode, setQrCode] = useState<string | null>(
    sessionStorage.getItem("persistedQrCode"),
  );
  const [qrText, setQrText] = useState<string | null>(
    sessionStorage.getItem("persistedQrText"),
  );

  return (
    <QrContext.Provider value={{ qrCode, setQrCode, qrText, setQrText }}>
      {children}
    </QrContext.Provider>
  );
};

export function useQrContext() {
  const ctx = useContext(QrContext);
  if (!ctx) throw new Error("useQrContext must be used within a QrProvider");
  return ctx;
}
