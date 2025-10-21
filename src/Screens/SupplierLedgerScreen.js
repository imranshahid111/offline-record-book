import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import XLSX from 'xlsx';
import RNBlobUtil from 'react-native-blob-util';
import { useNavigation, useRoute } from '@react-navigation/native';
import initDatabase from '../../config/database';

export default function SupplierLedgerScreen() {
  const route = useRoute();
  const { supplierId } = route.params;
  const navigation = useNavigation();

  const [transactions, setTransactions] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSupplierLedger();
  }, []);

  const fetchSupplierLedger = async () => {


    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          `SELECT t.*, u.name as supplier_name, f.name as fuel_name
           FROM transactions t
           LEFT JOIN users u ON t.user_id = u.id
           LEFT JOIN fuel_types f ON t.fuel_type_id = f.id
           WHERE t.user_id = ?
           ORDER BY t.record_date ASC`,
          [supplierId],
          (_, { rows }) => {
            const rawData = [];
            for (let i = 0; i < rows.length; i++) rawData.push(rows.item(i));

            let runningBalance = 0;
            const withBalance = rawData.map(item => {
              runningBalance += (item.total_payment || 0) - (item.paid_amount || 0);
              return { ...item, runningBalance };
            });

            setTransactions(withBalance);
            if (withBalance.length > 0) setSupplierName(withBalance[0].supplier_name);
          }
        );
      });
    } catch (error) {
      Alert.alert('Error', `Failed to fetch ledger: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

const exportToExcel = async () => {
  if (transactions.length === 0) {
    Alert.alert('No Data', 'There are no transactions to export.');
    return;
  }

  try {
    // Format data properly for Excel
    const formattedData = transactions.map(item => ({
      Date: item.record_date
        ? new Date(item.record_date).toLocaleDateString('en-GB').replace(/\//g, '-')
        : 'N/A',
      Fuel: item.fuel_name || 'N/A',
      Vehicle: item.vehicle_no || 'N/A',
      Weight: item.weight || '0',
      Total: item.total_payment || '0',
      Paid: item.paid_amount || '0',
      Balance: item.runningBalance,
    }));

    // Create workbook & worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');

    // Write Excel file
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const filePath = `${RNBlobUtil.fs.dirs.DownloadDir}/${supplierName || 'Supplier'}_Ledger.xlsx`;

    await RNBlobUtil.fs.writeFile(filePath, wbout, 'base64');

    // Notify user & open the file
    Alert.alert('✅ Exported', `Excel file saved to: ${filePath}`);
    RNBlobUtil.android.actionViewIntent(
      filePath,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  } catch (error) {
    Alert.alert('❌ Export Error', error.message);
  }
};

navigation.setOptions({
  headerRight: () => (<TouchableOpacity style={styles.exportBtn} onPress={exportToExcel}>
      <Text style={styles.exportText}>Export</Text>
    </TouchableOpacity>)
})


  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>📒 {supplierName || 'Supplier'} Ledger</Text>

    

      {loading && <ActivityIndicator size="large" color="#0984e3" style={styles.loading} />}

      {/* Table View */}
      <ScrollView horizontal>
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.headerCell]}>Date</Text>
            <Text style={[styles.cell, styles.headerCell]}>Fuel</Text>
            <Text style={[styles.cell, styles.headerCell]}>Vehicle</Text>
            <Text style={[styles.cell, styles.headerCell]}>Weight</Text>
            <Text style={[styles.cell, styles.headerCell]}>Total</Text>
            <Text style={[styles.cell, styles.headerCell]}>Paid</Text>
            <Text style={[styles.cell, styles.headerCell]}>Balance</Text>
          </View>

          <ScrollView style={{ maxHeight: 500 }}>
            {transactions.length === 0 ? (
              <Text style={styles.noData}>No transactions found</Text>
            ) : (
              transactions.map(item => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={styles.cell}>
                    {item.record_date ? new Date(item.record_date).toLocaleDateString() : 'N/A'}
                  </Text>
                  <Text style={styles.cell}>{item.fuel_name || 'N/A'}</Text>
                  <Text style={styles.cell}>{item.vehicle_no || 'N/A'}</Text>
                  <Text style={styles.cell}>{item.weight || '0'}</Text>
                  <Text style={styles.cell}>{item.total_payment || '0'}</Text>
                  <Text style={styles.cell}>{item.paid_amount || '0'}</Text>
                  <Text style={[styles.cell, { fontWeight: 'bold', color: item.runningBalance > 0 ? 'red' : 'green' }]}>
                    {item.runningBalance}
                  </Text>
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
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2d3436',
    textAlign: 'center',
  },
  exportBtn: {
    alignSelf: 'center',
    backgroundColor: '#27ae60',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    // marginBottom: 15,
  },
  exportText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
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
});
