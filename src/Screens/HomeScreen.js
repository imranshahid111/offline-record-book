import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  SafeAreaView,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import initDatabase from '../../config/database';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({
    suppliers: 0,
    fuelTypes: 0,
    records: 0,
    balance: 0,
  });
  const scrollY = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  const buttons = [
    {
      title: 'Suppliers',
      icon: 'account-group',
      colors: ['#667eea', '#764ba2'],
      screen: 'AddSupplier',
    },
    {
      title: 'Fuel Types',
      icon: 'gas-station',
      colors: ['#f093fb', '#f5576c'],
      screen: 'AddFuelType',
    },
    {
      title: 'Ledgers',
      icon: 'book-open-variant',
      colors: ['#4facfe', '#00f2fe'],
      screen: 'Ledgers',
    },
    {
      title: 'Accounts',
      icon: 'wallet-outline',
      colors: ['#43e97b', '#38f9d7'],
      screen: 'Accounts',
    },
  ];

  useEffect(() => {
    fetchStats();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchStats = async () => {
    const db = await initDatabase();
    db.transaction(tx => {
      tx.executeSql('SELECT COUNT(*) as c FROM users', [], (_, { rows }) =>
        setStats(prev => ({ ...prev, suppliers: rows.item(0).c }))
      );
      tx.executeSql('SELECT COUNT(*) as c FROM fuel_types', [], (_, { rows }) =>
        setStats(prev => ({ ...prev, fuelTypes: rows.item(0).c }))
      );
      tx.executeSql('SELECT COUNT(*) as c FROM transactions', [], (_, { rows }) =>
        setStats(prev => ({ ...prev, records: rows.item(0).c }))
      );
      tx.executeSql('SELECT SUM(balance) as total FROM transactions', [], (_, { rows }) =>
        setStats(prev => ({ ...prev, balance: rows.item(0).total || 0 }))
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* GRADIENT HEADER BACKGROUND */}
      <Animated.View>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello Shahid Sab 👋</Text>
              <Text style={styles.title}>Boiler Khata</Text>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <Icon name="bell-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* 4 STATS IN DARK AREA - Animate to single row on scroll */}
          <Animated.View 
            style={[
              styles.statsContainer,
              {
                transform: [{
                  translateY: scrollY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0, -10],
                    extrapolate: 'clamp',
                  })
                }]
              }
            ]}
          >
            <Animated.View style={[
              styles.statsRow,
              {
                flexDirection: scrollY.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, 1],
                  extrapolate: 'clamp',
                }) === 1 ? 'row' : 'row',
              }
            ]}>
              <View style={styles.statBox}>
                <Icon name="account-group" size={20} color="#667eea" />
                <Text style={styles.statNumber}>{stats.suppliers}</Text>
                <Text style={styles.statLabel}>Suppliers</Text>
              </View>
              <View style={styles.statBox}>
                <Icon name="gas-station" size={20} color="#f5576c" />
                <Text style={styles.statNumber}>{stats.fuelTypes}</Text>
                <Text style={styles.statLabel}>Fuel Types</Text>
              </View>
            </Animated.View>
            <Animated.View 
              style={[
                styles.statsRow,
                {
                  opacity: scrollY.interpolate({
                    inputRange: [0, 50, 100],
                    outputRange: [1, 0.5, 0],
                    extrapolate: 'clamp',
                  }),
                  height: scrollY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [80, 0],
                    extrapolate: 'clamp',
                  })
                }
              ]}
            >
              <View style={styles.statBox}>
                <Icon name="chart-line" size={20} color="#4facfe" />
                <Text style={styles.statNumber}>{stats.records}</Text>
                <Text style={styles.statLabel}>Records</Text>
              </View>
              <View style={styles.statBox}>
                <Icon name="wallet-outline" size={20} color="#43e97b" />
                <Text style={styles.statNumber}>₨ {stats.balance.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Balance</Text>
              </View>
            </Animated.View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* SECTION TITLE */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionSubtitle}>Manage your business</Text>
        </View>

        {/* NAVIGATION CARDS - 2 per row */}
        <View style={styles.grid}>
          {buttons.map((btn, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(btn.screen)}
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={btn.colors}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardIconBox}>
                  <Icon name={btn.icon} size={32} color="#fff" />
                </View>
                <Text style={styles.cardText}>{btn.title}</Text>
                <Icon name="arrow-right" size={18} color="#ffffff90" />
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.ScrollView>

      {/* FLOATING ADD BUTTON */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.fab}
        onPress={() => navigation.navigate('AddRecord')}
      >
        <LinearGradient
          colors={['#1a1a2e', '#0f3460']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon name="plus" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  headerGradient: { 
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  greeting: { fontSize: 14, color: '#ffffff90', fontWeight: '500' },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 4 },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff15',
    borderRadius: 16,
    padding: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 6 },
  statLabel: { fontSize: 11, color: '#ffffffcc', marginTop: 2, fontWeight: '600' },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e' },
  sectionSubtitle: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
  },
  cardWrapper: { 
    width: '48%',
    marginBottom: 14,
  },
  card: {
    borderRadius: 18,
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#ffffff25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    shadowColor: '#ffffff15',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});