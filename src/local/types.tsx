export type ProgressUpdatePayload = {
  id: string;
  progress: number;
};

export type ServerConfiguration = {
  ip: string;
  port: number;
  name: string;
};

export type DeviceConfig = {
  fingerprint: string;
  name: string;
};

export interface SendFileResponse {
  Success: {
    ip: string | null;
    port: number;
  };
}
export interface SendTextResponse {
  Success: {
    ip: string | null;
    port: number;
  };
}

export interface SharedText {
  SharedText: string | null;
}
export interface SharedFiles {
  URIList: string[] | null;
}