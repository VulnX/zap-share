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
