import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../types/navigation';
import { MOVIE_REVIEWS, MOVIE_CAST } from '../../data/movies';
import colors from '../../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Detail'>;
  route: RouteProp<HomeStackParamList, 'Detail'>;
};

const TABS = ['About Movie', 'Reviews', 'Cast'];

export default function DetailScreen({ navigation, route }: Props) {
  const { movie } = route.params;
  const [activeTab, setActiveTab] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrapper}>
          <Image source={{ uri: movie.poster }} style={styles.hero} resizeMode="cover" />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.heroOverlay}>
            <Image source={{ uri: movie.poster }} style={styles.smallPoster} />
            <View style={styles.heroInfo}>
              <Text style={styles.movieTitle}>{movie.title}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.star}>⭐</Text>
                <Text style={styles.rating}>{movie.rating}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>📅 {movie.year}</Text>
          <Text style={styles.metaSep}>|</Text>
          <Text style={styles.metaItem}>⏱ {movie.duration}</Text>
          <Text style={styles.metaSep}>|</Text>
          <Text style={styles.metaItem}>🎬 {movie.genre}</Text>
        </View>

        <View style={styles.tabs}>
          {TABS.map((tab, i) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(i)} style={styles.tabBtn}>
              <Text style={[styles.tabText, i === activeTab && styles.tabActive]}>{tab}</Text>
              {i === activeTab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tabContent}>
          {activeTab === 0 && (
            <Text style={styles.description}>{movie.description}</Text>
          )}

          {activeTab === 1 && (
            <FlatList
              data={MOVIE_REVIEWS}
              scrollEnabled={false}
              keyExtractor={r => r.id}
              renderItem={({ item }) => (
                <View style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.author[0]}</Text>
                    </View>
                    <View style={styles.reviewMeta}>
                      <Text style={styles.reviewAuthor}>{item.author}</Text>
                      <Text style={styles.reviewRating}>⭐ {item.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{item.text}</Text>
                </View>
              )}
            />
          )}

          {activeTab === 2 && (
            <FlatList
              data={MOVIE_CAST}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={c => c.id}
              renderItem={({ item }) => (
                <View style={styles.castCard}>
                  <Image source={{ uri: item.photo }} style={styles.castPhoto} />
                  <Text style={styles.castName}>{item.name}</Text>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heroWrapper: { height: 280, position: 'relative' },
  hero: { width: '100%', height: '100%' },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: { color: colors.white, fontSize: 22, lineHeight: 26 },
  heroOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  smallPoster: { width: 90, height: 130, borderRadius: 10 },
  heroInfo: { flex: 1, paddingBottom: 4 },
  movieTitle: { color: colors.white, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { fontSize: 14 },
  rating: { color: '#F5C518', fontWeight: '700', fontSize: 14 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  metaItem: { color: colors.gray, fontSize: 13 },
  metaSep: { color: colors.inputBorder },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 24 },
  tabBtn: { alignItems: 'center' },
  tabText: { color: colors.gray, fontSize: 14, paddingBottom: 6 },
  tabActive: { color: colors.primary, fontWeight: '700' },
  tabUnderline: { height: 2, width: '100%', backgroundColor: colors.primary, borderRadius: 1 },
  tabContent: { paddingHorizontal: 20, paddingBottom: 32 },
  description: { color: colors.gray, fontSize: 14, lineHeight: 22 },
  reviewCard: { marginBottom: 20 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.white, fontWeight: '700' },
  reviewMeta: { flex: 1 },
  reviewAuthor: { color: colors.white, fontWeight: '600', fontSize: 13 },
  reviewRating: { color: '#F5C518', fontSize: 12 },
  reviewText: { color: colors.gray, fontSize: 13, lineHeight: 20 },
  castCard: { flex: 1, alignItems: 'center', marginBottom: 20, padding: 8 },
  castPhoto: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  castName: { color: colors.white, fontSize: 13, textAlign: 'center' },
});
