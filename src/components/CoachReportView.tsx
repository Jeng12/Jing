import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CoachArea, CoachReport, CoachTone } from '../types/tracker';
import type { IconName } from '../utils/metrics';
import colors from '../theme/colors';

const AREA: Record<CoachArea, { icon: IconName; color: string }> = {
  sleep: { icon: 'moon', color: colors.sleep },
  activity: { icon: 'footsteps', color: colors.steps },
  heart: { icon: 'heart', color: colors.heart },
  workouts: { icon: 'fitness', color: colors.exercise },
  learning: { icon: 'book', color: colors.learning },
  hydration: { icon: 'water', color: colors.water },
  mood: { icon: 'happy', color: colors.mood },
  overall: { icon: 'sparkles', color: colors.primary },
};

const TONE: Record<CoachTone, { label: string; color: string }> = {
  positive: { label: 'Going well', color: colors.success },
  watch: { label: 'Watch', color: colors.learning },
  neutral: { label: 'Note', color: colors.gray },
};

/** Headline, insight cards and action list from an AI Coach report. */
export default function CoachReportView({ report }: { report: CoachReport }) {
  return (
    <View>
      <View style={styles.headline}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={styles.headlineText}>{report.headline}</Text>
      </View>
      {report.insights.map((insight, i) => {
        const area = AREA[insight.area] ?? AREA.overall;
        const tone = TONE[insight.tone] ?? TONE.neutral;
        return (
          <View key={i} style={[styles.insight, { borderLeftColor: tone.color }]}>
            <View style={styles.insightHead}>
              <Ionicons name={area.icon} size={16} color={area.color} />
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={[styles.tone, { color: tone.color }]}>{tone.label}</Text>
            </View>
            <Text style={styles.detail}>{insight.detail}</Text>
          </View>
        );
      })}
      {report.actions.length > 0 && (
        <View style={styles.actions}>
          <Text style={styles.actionsTitle}>Try this</Text>
          {report.actions.map((action, i) => (
            <View key={i} style={styles.actionRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.cardRaised,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  headlineText: { color: colors.white, fontSize: 16, fontWeight: '700', lineHeight: 22, flex: 1 },
  insight: { backgroundColor: colors.card, borderRadius: 14, borderLeftWidth: 4, padding: 14, marginBottom: 10 },
  insightHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  insightTitle: { color: colors.white, fontSize: 15, fontWeight: '700', flex: 1 },
  tone: { fontSize: 11, fontWeight: '700' },
  detail: { color: colors.gray, fontSize: 14, lineHeight: 20 },
  actions: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginTop: 2 },
  actionsTitle: { color: colors.white, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionText: { color: colors.white, fontSize: 14, lineHeight: 20, flex: 1 },
});
