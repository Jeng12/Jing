import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';

interface Props {
  title: string;
  /** Leave out to hide the back button (e.g. an unsaved workout that must be saved or discarded). */
  onBack?: () => void;
}

export default function ScreenHeader({ title, onBack }: Props) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Go back">
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: { color: colors.white, fontSize: 22, lineHeight: 26 },
  title: { flex: 1, color: colors.white, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  spacer: { width: 36 },
});
