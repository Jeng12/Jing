import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../types/navigation';
import colors from '../../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileMain'>;
};

interface MenuItemProps {
  icon: string;
  label: string;
}

function MenuItem({ icon, label }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const [logoutVisible, setLogoutVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>Profile</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>T</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Tiffany</Text>
            <Text style={styles.userEmail}>Tiffanyjearsey@gmail.com</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.premiumBanner}>
          <Text style={styles.premiumIcon}>👑</Text>
          <View>
            <Text style={styles.premiumTitle}>Premium Member</Text>
            <Text style={styles.premiumSub}>New movies are coming for you,{'\n'}Download Now!</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <MenuItem icon="👤" label="Member" />
          <MenuItem icon="🔒" label="Change Password" />
        </View>

        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.section}>
          <MenuItem icon="🔔" label="Notification" />
          <MenuItem icon="🌐" label="Language" />
          <MenuItem icon="🏳️" label="Country" />
          <MenuItem icon="🗑️" label="Clear Cache" />
        </View>

        <Text style={styles.sectionTitle}>More</Text>
        <View style={styles.section}>
          <MenuItem icon="🛡️" label="Legal and Policies" />
          <MenuItem icon="❓" label="Help & Feedback" />
          <MenuItem icon="ℹ️" label="About Us" />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutVisible(true)}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={logoutVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>❓</Text>
            <Text style={styles.modalTitle}>Are you sure ?</Text>
            <Text style={styles.modalBody}>
              Ullamcorper imperdiet urna id non sed est sem. Rhoncus amet, enim purus gravida donec
              aliquet.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalLogout} onPress={() => setLogoutVisible(false)}>
                <Text style={styles.modalLogoutText}>Log Out</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setLogoutVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
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
  pageTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.white, fontSize: 22, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: colors.white, fontSize: 17, fontWeight: '700' },
  userEmail: { color: colors.gray, fontSize: 13 },
  editIcon: { fontSize: 18 },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  premiumIcon: { fontSize: 28 },
  premiumTitle: { color: colors.white, fontSize: 15, fontWeight: '700' },
  premiumSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  sectionTitle: { color: colors.white, fontSize: 15, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
  section: {
    backgroundColor: colors.card,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
    gap: 12,
  },
  menuIcon: { fontSize: 18, width: 28 },
  menuLabel: { flex: 1, color: colors.white, fontSize: 14 },
  chevron: { color: colors.primary, fontSize: 20 },
  logoutBtn: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 28,
    width: '80%',
    alignItems: 'center',
  },
  modalIcon: { fontSize: 48, marginBottom: 16 },
  modalTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  modalBody: { color: colors.gray, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 16 },
  modalLogout: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  modalLogoutText: { color: colors.primary, fontWeight: '600' },
  modalCancel: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  modalCancelText: { color: colors.white, fontWeight: '600' },
});
