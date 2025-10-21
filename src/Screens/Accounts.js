import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import initDatabase from '../../config/database';

export default function AccountsScreen({ navigation }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliersWithLedger();
  }, []);

  const fetchSuppliersWithLedger = async () => {
    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          `SELECT u.id, u.name, u.phone, u.address,
                  IFNULL(SUM(t.total_payment), 0) as total_amount,
                  IFNULL(SUM(t.paid_amount), 0) as total_paid,
                  IFNULL(SUM(t.total_payment) - SUM(t.paid_amount), 0) as balance
           FROM users u
           LEFT JOIN transactions t ON u.id = t.user_id
           GROUP BY u.id, u.name, u.phone, u.address
           ORDER BY u.name ASC;`,
          [],
          (txObj, resultSet) => {
            const data = [];
            for (let i = 0; i < resultSet.rows.length; i++) {
              data.push(resultSet.rows.item(i));
            }
            console.log('Fetched suppliers with ledger:', data);
            setSuppliers(data);
            if (data.length === 0) {
              console.log('No suppliers found in database');
            }
          },
          (txObj, error) => {
            console.error('SQL Error in fetchSuppliersWithLedger:', error);
            throw error;
          }
        );
      });
    } catch (error) {
      console.error('Fetch suppliers with ledger failed:', error);
      Alert.alert('Error', `Failed to fetch suppliers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.subText}>📞 {item.phone || 'N/A'}</Text>
      <Text style={styles.subText}>🏢 {item.address || 'No address'}</Text>

      <View style={styles.row}>
        <Text style={styles.amount}>💰 Total: {item.total_amount.toFixed(2)}</Text>
        <Text style={styles.paid}>✅ Paid: {item.total_paid.toFixed(2)}</Text>
      </View>

      <Text style={styles.balance}>
        ⚖️ Balance: <Text style={{ color: '#d63031' }}>{item.balance.toFixed(2)}</Text>
      </Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate('SupplierLedger', { supplierId: item.id })}
      >
        <Text style={styles.btnText}>View Ledger</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* <Text style={styles.header}>📘 Accounts Summary</Text> */}

      {loading ? (
        <ActivityIndicator size="large" color="#0984e3" style={styles.loading} />
      ) : suppliers.length === 0 ? (
        <Text style={styles.noData}>No suppliers found</Text>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 15 },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  name: { fontSize: 18, fontWeight: 'bold', color: '#0984e3' },
  subText: { color: '#636e72', marginVertical: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  amount: { color: '#2d3436', fontWeight: '600' },
  paid: { color: '#00b894', fontWeight: '600' },
  balance: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
  },
  btn: {
    marginTop: 10,
    backgroundColor: '#0984e3',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  noData: { textAlign: 'center', color: '#b2bec3', marginTop: 20 },
  loading: { marginVertical: 20 },
});