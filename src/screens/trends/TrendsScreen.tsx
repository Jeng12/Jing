import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenProps } from '../../types/navigation';
import { MetricKey } from '../../types/tracker';
import { useTracker } from '../../store/TrackerContext';
import { averageOf, dailyValue, dayRange, pctChange } from '../../utils/trackerStats';
import { formatValue, METRIC_ORDER, METRICS } from '../../utils/metrics';
import BarChart from '../../components/BarChart';
import TrendCard from '../../components/TrendCard';
import colors from '../../theme/colors';

type Props = TabScreenProps<'Trends'>;

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function weekdayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

export default function TrendsScreen({ navigation }: Props) {
  const { data } = useTracker();
  const [metric, setMetric] = useState<MetricKey>('steps');
  const info = METRICS[metric];
  const days = dayRange(7);
  const prevDays = dayRange(7, 7);
  const weekly = (key: MetricKey) => ({
    now: averageOf(days.map(d => dailyValue(data, key, d))),
    prev: averageOf(prevDays.map(d => dailyValue(data, key, d))),
  });

  const values = days.map(d => dailyValue(data, metric, d));
  const { now, prev } = weekly(metric);
  const change = now !== null && prev !== null ? pctChange(now, prev) : null;
  const needsWatch = info.fromWatch && !data.watchSync.enabled;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Trends</Text>
        <Text style={styles.subtitle}>Your last 7 days compared with the week before</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chips}
        >
          {METRIC_ORDER.map(key => {
            const m = METRICS[key];
            const active = key === metric;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, active && { backgroundColor: m.color, borderColor: m.color }]}
                onPress={() => setMetric(key)}
                accessibilityLabel={`Show ${m.label}`}
                accessibilityState={{ selected: active }}
              >
                <Ionicons name={m.icon} size={14} color={active ? colors.background : m.color} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Daily average</Text>
          <View style={styles.avgRow}>
            <Text style={styles.avg}>{now !== null ? formatValue(now, info.decimals) : '--'}</Text>
            <Text style={styles.avgUnit}>{info.unit}</Text>
          </View>
          <Text style={styles.changeText}>
            {change === null
              ? 'Not enough data to compare yet'
              : change === 0
                ? 'Same as the week before'
                : `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}% vs the week before`}
          </Text>
          <View style={styles.chart}>
            <BarChart
              values={values}
              labels={days.map(weekdayLabel)}
              color={info.color}
              goal={info.goal(data.goals)}
              highlight={days.length - 1}
              format={v => (info.key === 'steps' && v >= 1000 ? `${(v / 1000).toFixed(1)}k` : formatValue(v, info.decimals))}
            />
          </View>
          {needsWatch && (
            <TouchableOpacity style={styles.connect} onPress={() => navigation.navigate('Watch')}>
              <Ionicons name="watch-outline" size={16} color={colors.primary} />
              <Text style={styles.connectText}>Connect your Garmin to see {info.label.toLowerCase()}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>All metrics this week</Text>
        <View style={styles.grid}>
          {METRIC_ORDER.map(key => {
            const m = METRICS[key];
            const w = weekly(key);
            return (
              <TrendCard
                key={key}
                icon={m.icon}
                color={m.color}
                label={m.label}
                value={w.now !== null ? `${formatValue(w.now, m.decimals)} ${m.unit}` : '--'}
                change={w.now !== null && w.prev !== null ? pctChange(w.now, w.prev) : null}
                neutral={!m.higherIsBetter}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  title: { color: colors.white, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.gray, fontSize: 13, marginTop: 2, marginBottom: 16 },
  chipScroll: { marginHorizontal: -20 },
  chips: { gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.background },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 18, marginBottom: 24 },
  cardLabel: { color: colors.gray, fontSize: 13 },
  avgRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  avg: { color: colors.white, fontSize: 34, fontWeight: '800' },
  avgUnit: { color: colors.gray, fontSize: 15 },
  changeText: { color: colors.gray, fontSize: 13, marginTop: 4 },
  chart: { marginTop: 22 },
  connect: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, alignSelf: 'center' },
  connectText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  sectionTitle: { color: colors.white, fontSize: 17, fontWeight: '600', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
