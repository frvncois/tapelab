import { NativeModules } from 'react-native';

export interface BpmPickerAPI {
  showPicker(initialBpm: number): Promise<number>;
}

const BpmSheetModule: BpmPickerAPI = NativeModules.BpmSheetModule || {
  showPicker: async (initialBpm: number) => {
    console.log('[BpmSheetModule] showPicker (mock):', initialBpm);
    return initialBpm;
  },
};

export default BpmSheetModule;
