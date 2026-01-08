import React, { createContext, useContext, useState } from "react";

interface SharedDataContextType {
  fileList: string[];
  setFileList: React.Dispatch<React.SetStateAction<string[]>>;
  text: string | undefined;
  setText: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const SharedDataContext = createContext<SharedDataContextType | undefined>(
  undefined,
);

export const SharedDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [fileList, setFileList] = useState<string[]>([]);
  const [text, setText] = useState<string | undefined>(undefined);

  return (
    <SharedDataContext.Provider
      value={{ fileList, setFileList, text, setText }}
    >
      {children}
    </SharedDataContext.Provider>
  );
};

export function useSharedDataContext() {
  const ctx = useContext(SharedDataContext);
  if (!ctx)
    throw new Error(
      "useSharedDataContext must be used within a SharedDataProvider",
    );
  return ctx;
}
