export type NativeAudioSessionStatus = {
  available: boolean;
  label: string;
  platform: string;
  supportsMidi: boolean;
  supportsLowLatencyAudio: boolean;
};
