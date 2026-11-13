import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  values: number[];
  width: number;
  height: number;
  color: string;
}

/** A simple line of recent values, auto-scaled to the visible range. */
export default function Sparkline({ values, width, height, color }: Props) {
  if (values.length < 2) return <Svg width={width} height={height} />;
  const min = Math.min(...values) - 3;
  const max = Math.max(...values) + 3;
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => height - ((v - min) / (max - min)) * height;
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <Svg width={width} height={height}>
      <Path d={area} fill={color} fillOpacity={0.15} />
      <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
