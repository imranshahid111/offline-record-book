import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import initDatabase from '../../config/database';

export default function LedgerScreen() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          `SELECT t.*, u.name as supplier_name, f.name as fuel_name
           FROM transactions t
           LEFT JOIN users u ON t.user_id = u.id
           LEFT JOIN fuel_types f ON t.fuel_type_id = f.id
           ORDER BY t.id DESC`,
          [],
          (_, { rows }) => {
            const data = [];
            for (let i = 0; i < rows.length; i++) data.push(rows.item(i));
            setTransactions(data);
          },
          (_, error) => {
            throw error;
          }
        );
      });
    } catch (error) {
      Alert.alert('Error', `Failed to fetch transactions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async id => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await initDatabase();
              db.transaction(tx => {
                tx.executeSql(
                  'DELETE FROM transactions WHERE id = ?',
                  [id],
                  () => {
                    Alert.alert('Deleted', 'Transaction deleted successfully.');
                    fetchTransactions(); // refresh list
                  },
                  (_, error) => console.log('❌ Delete error:', error)
                );
              });
            } catch (error) {
              Alert.alert('Error', `Failed to delete transaction: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" color="#0984e3" style={styles.loading} />}

      <ScrollView horizontal>
        <View>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.headerCell]}>Date</Text>
            <Text style={[styles.cell, styles.headerCell]}>Supplier</Text>
            <Text style={[styles.cell, styles.headerCell]}>Fuel</Text>
            <Text style={[styles.cell, styles.headerCell]}>Vehicle</Text>
            <Text style={[styles.cell, styles.headerCell]}>Weight</Text>
            <Text style={[styles.cell, styles.headerCell]}>Rate</Text>
            <Text style={[styles.cell, styles.headerCell]}>Total</Text>
            <Text style={[styles.cell, styles.headerCell]}>Paid</Text>
            <Text style={[styles.cell, styles.headerCell]}>Balance</Text>
            <Text style={[styles.cell, styles.headerCell]}>Paid Date</Text>
            <Text style={[styles.cell, styles.headerCell, { textAlign: 'center' }]}>Actions</Text>
          </View>

          {/* Rows */}
          <ScrollView >
            {transactions.length === 0 ? (
              <Text style={styles.noData}>No transactions yet</Text>
            ) : (
              transactions.map(item => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={styles.cell}>
                    {item.record_date ? new Date(item.record_date).toLocaleDateString() : 'N/A'}
                  </Text>
                  <Text style={styles.cell}>{item.supplier_name || 'N/A'}</Text>
                  <Text style={styles.cell}>{item.fuel_name || 'N/A'}</Text>
                  <Text style={styles.cell}>{item.vehicle_no || 'N/A'}</Text>
                  <Text style={styles.cell}>{item.weight || 'N/A'}</Text>
                  <Text style={styles.cell}>{item.rate || 'N/A'}</Text>
                  <Text style={styles.cell}>{item.total_payment || 'N/A'}</Text>
                  <Text style={styles.cell}>{item.paid_amount || 'N/A'}</Text>
                  <Text style={styles.cell}>{item.balance || 'N/A'}</Text>
                  <Text style={styles.cell}>
                    {item.paid_date ? new Date(item.paid_date).toLocaleDateString() : 'N/A'}
                  </Text>

                  {/* 👇 Action Buttons */}
                  <View style={styles.actionContainer}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#0984e3' }]}
                      onPress={() => navigation.navigate('EditRecord', { id: item.id })}
                    >
                      <Text style={styles.btnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#d63031' }]}
                      onPress={() => deleteTransaction(item.id)}
                    >
                      <Text style={styles.btnText}>Del</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#00b894' }]}
                      onPress={() => navigation.navigate('SupplierLedger', { supplierId: item.user_id })}
                    >
                      <Text style={styles.btnText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 10 },
  loading: { marginVertical: 10 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0984e3',
    paddingVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dfe6e9',
    paddingVertical: 8,
    alignItems: 'center',
  },
  cell: {
    width: 100,
    textAlign: 'center',
    paddingHorizontal: 5,
    color: '#2d3436',
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noData: { textAlign: 'center', color: '#636e72', marginTop: 20 },
  actionContainer: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    alignItems: 'center',
    width: 160,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
