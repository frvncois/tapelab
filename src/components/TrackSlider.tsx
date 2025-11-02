import React from 'react';
import { requireNativeComponent, ViewProps } from 'react-native';

interface TrackSliderProps extends ViewProps {
  type: 'volume' | 'pan' | 'eq';
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  onValueChange?: (event: { nativeEvent: { value: number; type: string } }) => void;
}

const NativeTrackSlider = requireNativeComponent<TrackSliderProps>('TrackSliderView');

export default function TrackSlider({
  type,
  value,
  minimumValue,
  maximumValue,
  onValueChange,
  style,
}: TrackSliderProps) {
  return (
    <NativeTrackSlider
      type={type}
      value={value}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      onValueChange={onValueChange}
      style={[{ height: 40 }, style]}
    />
  );
}
