import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';

export type NativeAudioSessionStatus = {
  available: boolean;
  label: string;
  platform: string;
  supportsMidi: boolean;
  supportsLowLatencyAudio: boolean;
};

type OddioAudioSessionModule = {
  getStatus: () => NativeAudioSessionStatus;
  preparePracticeSession: (mode: 'mic' | 'midi') => Promise<NativeAudioSessionStatus>;
};

let nativeModule: OddioAudioSessionModule | null | undefined;

function getNativeModule() {
  if (nativeModule !== undefined) {
    return nativeModule;
  }

  try {
    nativeModule = requireNativeModule<OddioAudioSessionModule>('OddioAudioSession');
  } catch {
    nativeModule = null;
  }

  return nativeModule;
}

export async function getNativeAudioSessionStatus(): Promise<NativeAudioSessionStatus> {
  const native = getNativeModule();

  if (!native) {
    return {
      available: false,
      label: Platform.OS === 'ios' ? 'Swift bridge pending' : 'JS fallback',
      platform: Platform.OS,
      supportsMidi: false,
      supportsLowLatencyAudio: false,
    };
  }

  return native.getStatus();
}

export async function prepareNativePracticeSession(mode: 'mic' | 'midi') {
  const native = getNativeModule();

  if (!native) {
    return getNativeAudioSessionStatus();
  }

  return native.preparePracticeSession(mode);
}
