import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabScreenProps } from '../../types/navigation';
import { useSession } from '../../store/SessionContext';
import { useTracker } from '../../store/TrackerContext';
import { useLiveHeartRate } from '../../store/LiveHeartRateContext';
import { timeAgo } from '../../utils/trackerStats';
import IconBadge from '../../components/IconBadge';
import type { IconName } from '../../utils/metrics';
import colors from '../../theme/colors';

type Props = TabScreenProps<'Profile'>;

interface RowProps {
  icon: IconName;
  color: string;
  label: string;
  detail?: string;
  onPress: () => void;
}

function Row({ icon, color, label, detail, onPress }: RowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <IconBadge name={icon} color={color} size={34} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!detail && <Text style={styles.rowDetail}>{detail}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const { profile, signOut } = useSession();
  const { data } = useTracker();
  const live = useLiveHeartRate();
  const [confirm, setConfirm] = useState(false);
  const { goals, watchSync, reminder } = data;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        <TouchableOpacity style={styles.user} onPress={() => navigation.navigate('EditProfile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={styles.userName}>{profile.name || 'Your name'}</Text>
            <Text style={styles.userEmail}>{profile.email || 'Add your email'}</Text>
          </View>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Devices</Text>
        <View style={styles.section}>
          <Row
            icon="watch"
            color={colors.primary}
            label="Garmin watch"
            detail={
              watchSync.enabled
                ? `Connected${watchSync.lastSyncedAt ? ` · synced ${timeAgo(watchSync.lastSyncedAt)}` : ''}`
                : 'Not connected'
            }
            onPress={() => navigation.navigate('Watch')}
          />
          <Row
            icon="pulse"
            color={colors.heart}
            label="Live heart rate"
            detail={live.status === 'live' ? `Live · ${live.bpm ?? '--'} bpm` : live.lastDevice?.name ?? 'Bluetooth broadcast'}
            onPress={() => navigation.navigate('Tabs', { screen: 'Live' })}
          />
        </View>

        <Text style={styles.sectionTitle}>Goals & reminders</Text>
        <View style={styles.section}>
          <Row
            icon="trophy"
            color={colors.learning}
            label="Daily goals"
            detail={`${goals.steps.toLocaleString()} steps · ${goals.exerciseMinutes} min exercise · ${goals.sleepHours} h sleep`}
            onPress={() => navigation.navigate('Goals')}
          />
          <Row
            icon="notifications"
            color={colors.sleep}
            label="Daily summary"
            detail={reminder.enabled ? `Every day at ${pad(reminder.hour)}:${pad(reminder.minute)}` : 'Off'}
            onPress={() => navigation.navigate('Summary')}
          />
        </View>

        <TouchableOpacity style={styles.logout} onPress={() => setConfirm(true)}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
        <Text style={styles.footnote}>Your tracking data stays on this phone.</Text>
      </ScrollView>

      <Modal transparent visible={confirm} animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.modalBody}>Your logs and watch data stay on this phone for when you log back in.</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirm(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  setConfirm(false);
                  live.disconnect();
                  signOut();
                }}
              >
                <Text style={styles.modalConfirmText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  title: { color: colors.white, fontSize: 28, fontWeight: '700', marginBottom: 16 },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.background, fontSize: 22, fontWeight: '800' },
  userName: { color: colors.white, fontSize: 17, fontWeight: '700' },
  userEmail: { color: colors.gray, fontSize: 13, marginTop: 2 },
  sectionTitle: { color: colors.gray, fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  section: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 14, marginBottom: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowText: { flex: 1 },
  rowLabel: { color: colors.white, fontSize: 15, fontWeight: '600' },
  rowDetail: { color: colors.gray, fontSize: 12, marginTop: 2 },
  logout: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  footnote: { color: colors.gray, fontSize: 12, textAlign: 'center', marginTop: 12 },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 32 },
  modal: { backgroundColor: colors.card, borderRadius: 22, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { color: colors.white, fontSize: 19, fontWeight: '700', marginBottom: 8 },
  modalBody: { color: colors.gray, fontSize: 14, lineHeight: 20, marginBottom: 22 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: colors.white, fontWeight: '600' },
  modalConfirm: { flex: 1, backgroundColor: colors.danger, borderRadius: 24, paddingVertical: 12, alignItems: 'center' },
  modalConfirmText: { color: colors.white, fontWeight: '700' },
});
