import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import colors from '../theme/colors';

export interface Ring {
  progress: number; // 0–1, values above 1 are drawn full
  color: string;
}

interface Props {
  size: number;
  stroke: number;
  /** Outermost first; each next ring sits inside the previous one. */
  rings: Ring[];
  gap?: number;
  children?: React.ReactNode;
}

export default function ProgressRing({ size, stroke, rings, gap = 4, children }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {rings.map((ring, i) => {
          const r = size / 2 - stroke / 2 - i * (stroke + gap);
          const circumference = 2 * Math.PI * r;
          const p = Math.max(0, Math.min(ring.progress, 1));
          return (
            <React.Fragment key={i}>
              <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.ringTrack} strokeWidth={stroke} fill="none" />
              {p > 0 && (
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={ring.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={circumference * (1 - p)}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      {children && <View style={styles.center}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
