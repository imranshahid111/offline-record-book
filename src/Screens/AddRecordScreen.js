import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import initDatabase from '../../config/database';

export default function AddRecordScreen({ navigation }) {
  const [form, setForm] = useState({
    user_id: null,
    fuel_type: '',        // store fuel name for display
    fuel_type_id: null,   // store fuel id for DB
    record_date: new Date(),
    vehicle_no: '',
    weight: '',
    rate: '',
    total_payment: '',
    paid_amount: '',
    balance: '',
    paid_date: null,
  });

  const [suppliers, setSuppliers] = useState([]);
  const [fuelTypes, setFuelTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [fuelTypeModalVisible, setFuelTypeModalVisible] = useState(false);
  const [recordDatePickerVisible, setRecordDatePickerVisible] = useState(false);
  const [paidDatePickerVisible, setPaidDatePickerVisible] = useState(false);

  // convert date safely to timestamp
  const toTimestamp = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') return new Date(value).getTime();
    return null;
  };

  // Fetch suppliers and fuel types on mount
  useEffect(() => {
    fetchSuppliers();
    fetchFuelTypes();
  }, []);

  // Auto-calculate total_payment and balance
  useEffect(() => {
    const weight = parseFloat(form.weight) || 0;
    const rate = parseFloat(form.rate) || 0;
    const total_payment = (weight * rate).toFixed(2);

    const paid_amount = parseFloat(form.paid_amount) || 0;
    const balance = (total_payment - paid_amount).toFixed(2);

    setForm(prev => ({ ...prev, total_payment, balance }));
  }, [form.weight, form.rate, form.paid_amount]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users ORDER BY name ASC',
          [],
          (txObj, resultSet) => {
            const data = [];
            for (let i = 0; i < resultSet.rows.length; i++) {
              data.push(resultSet.rows.item(i));
            }
            setSuppliers(data);
          },
          (txObj, error) => console.error('SQL Error in fetchSuppliers:', error)
        );
      });
    } catch (error) {
      Alert.alert('Error', `Failed to fetch suppliers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchFuelTypes = async () => {
    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM fuel_types ORDER BY name ASC',
          [],
          (txObj, resultSet) => {
            const data = [];
            for (let i = 0; i < resultSet.rows.length; i++) {
              data.push(resultSet.rows.item(i));
            }
            setFuelTypes(data);
          },
          (txObj, error) => console.error('SQL Error in fetchFuelTypes:', error)
        );
      });
    } catch (error) {
      Alert.alert('Error', `Failed to fetch fuel types: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

const addTransaction = async () => {
  const { user_id, fuel_type_id, record_date, total_payment, paid_amount } = form;

  if (!user_id) return Alert.alert('Error', 'Please select a supplier');
  if (!fuel_type_id) return Alert.alert('Error', 'Please select a fuel type');
  if (!record_date) return Alert.alert('Error', 'Please select a record date');
  if (!total_payment || isNaN(parseFloat(total_payment)))
    return Alert.alert('Error', 'Total payment is invalid');

  const numericFields = { weight: form.weight, rate: form.rate, paid_amount: form.paid_amount };
  for (const [key, value] of Object.entries(numericFields)) {
    if (value && isNaN(parseFloat(value))) {
      return Alert.alert('Error', `${key.replace('_', ' ')} must be a number`);
    }
  }

  const paid = parseFloat(form.paid_amount) || 0;
  const balance = parseFloat(form.total_payment) - paid;

  console.log('🚀 Transaction Payload:', {
    ...form,
    record_date: toTimestamp(form.record_date),
    paid_date: toTimestamp(form.paid_date),
    balance,
  });

  setLoading(true);
  try {
    const db = await initDatabase();
    db.transaction(tx => {
      // 1️⃣ Insert Transaction
      tx.executeSql(
        `INSERT INTO transactions 
         (user_id, fuel_type_id, record_date, vehicle_no, weight, rate, total_payment, paid_amount, balance, paid_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id,
          fuel_type_id,
          toTimestamp(form.record_date),
          form.vehicle_no || null,
          parseFloat(form.weight) || null,
          parseFloat(form.rate) || null,
          parseFloat(form.total_payment),
          paid,
          balance,
          toTimestamp(form.paid_date),
        ],
        (_, result) => {
          console.log('✅ Transaction inserted successfully');

          // 2️⃣ Update Supplier Totals
          tx.executeSql(
            `UPDATE users 
             SET total_paid = COALESCE(total_paid,0) + ?, 
                 total_balance = COALESCE(total_balance,0) + ?
             WHERE id = ?;`,
            [paid, balance, user_id],
            () => console.log('✅ Supplier totals updated'),
            (_, err) => console.error('❌ Supplier totals update error:', err)
          );

          // 3️⃣ Reset Form
          setForm({
            user_id: null,
            fuel_type: '',
            fuel_type_id: null,
            record_date: new Date(),
            vehicle_no: '',
            weight: '',
            rate: '',
            total_payment: '',
            paid_amount: '',
            balance: '',
            paid_date: null,
          });

          Alert.alert('✅ Success', 'Transaction added and totals updated', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        },
        (_, error) => {
          console.error('Insert Error:', error);
          Alert.alert('Error', 'Failed to add transaction');
        }
      );
    });
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};



  const selectSupplier = (supplier) => {
    setForm(prev => ({ ...prev, user_id: supplier.id, supplier_name: supplier.name }));
    setSupplierModalVisible(false);
  };

  const selectFuelType = (fuel) => {
    setForm(prev => ({ ...prev, fuel_type: fuel.name, fuel_type_id: fuel.id }));
    setFuelTypeModalVisible(false);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: field === 'vehicle_no' ? value.toUpperCase() : value,
    }));
  };

  return (
    <View style={styles.container}>
      {/* <Text style={styles.header}>📝 Add Transaction</Text> */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* Supplier */}
        <Text style={styles.label}>Supplier</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setSupplierModalVisible(true)}>
          <Icon name="account" size={20} color="#636e72" />
          <Text style={styles.selectorText}>
            {form.supplier_name || 'Select Supplier'}
          </Text>
          <Icon name="chevron-down" size={22} color="#636e72" />
        </TouchableOpacity>

        {/* Fuel Type */}
        <Text style={styles.label}>Fuel Type</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setFuelTypeModalVisible(true)}>
          <Icon name="gas-station" size={20} color="#636e72" />
          <Text style={styles.selectorText}>
            {form.fuel_type || 'Select Fuel Type'}
          </Text>
          <Icon name="chevron-down" size={22} color="#636e72" />
        </TouchableOpacity>

        {/* Record Date */}
        <Text style={styles.label}>Record Date</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setRecordDatePickerVisible(true)}>
          <Icon name="calendar" size={20} color="#636e72" />
          <Text style={styles.selectorText}>
            {form.record_date?.toLocaleDateString?.() || 'Select Date'}
          </Text>
        </TouchableOpacity>

        {/* Vehicle No */}
        <Text style={styles.label}>Vehicle Number</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter vehicle number"
          value={form.vehicle_no}
          onChangeText={v => handleChange('vehicle_no', v)}
        />

        {/* Weight */}
        <Text style={styles.label}>Weight</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter weight"
          keyboardType="numeric"
          value={form.weight}
          onChangeText={v => handleChange('weight', v)}
        />

        {/* Rate */}
        <Text style={styles.label}>Rate</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter rate"
          keyboardType="numeric"
          value={form.rate}
          onChangeText={v => handleChange('rate', v)}
        />

        {/* Total Payment */}
        <Text style={styles.label}>Total Payment</Text>
        <TextInput
          style={[styles.textInput, styles.readOnly]}
          value={form.total_payment}
          editable={false}
        />

        {/* Paid Amount */}
        <Text style={styles.label}>Paid Amount</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter paid amount"
          keyboardType="numeric"
          value={form.paid_amount}
          onChangeText={v => handleChange('paid_amount', v)}
        />

        {/* Balance */}
        <Text style={styles.label}>Balance</Text>
        <TextInput
          style={[styles.textInput, styles.readOnly]}
          value={form.balance}
          editable={false}
        />

        {/* Paid Date */}
        <Text style={styles.label}>Paid Date</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setPaidDatePickerVisible(true)}>
          <Icon name="calendar-check" size={20} color="#636e72" />
          <Text style={styles.selectorText}>
            {form.paid_date ? form.paid_date.toLocaleDateString?.() : 'Select Paid Date'}
          </Text>
        </TouchableOpacity>

        {/* Save / Cancel */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.disabledBtn]}
          onPress={addTransaction}
          disabled={loading}
        >
          <Text style={styles.btnText}>Save Transaction</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color="#0984e3" />}
      </ScrollView>

      {/* Supplier Modal */}
      <Modal visible={supplierModalVisible} animationType="slide" transparent>
        <View style={styles.modalSheet}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Supplier</Text>
            <ScrollView>
              {suppliers.length === 0 ? (
                <Text style={styles.noData}>No suppliers available</Text>
              ) : (
                suppliers.map(supplier => (
                  <TouchableOpacity
                    key={supplier.id}
                    style={styles.modalItem}
                    onPress={() => selectSupplier(supplier)}
                  >
                    <Text style={styles.modalItemText}>{supplier.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSupplierModalVisible(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fuel Type Modal */}
      <Modal visible={fuelTypeModalVisible} animationType="slide" transparent>
        <View style={styles.modalSheet}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Fuel Type</Text>
            <ScrollView>
              {fuelTypes.length === 0 ? (
                <Text style={styles.noData}>No fuel types available</Text>
              ) : (
                fuelTypes.map(fuel => (
                  <TouchableOpacity key={fuel.id} style={styles.modalItem} onPress={() => selectFuelType(fuel)}>
                    <Text style={styles.modalItemText}>{fuel.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setFuelTypeModalVisible(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      <DatePicker
        modal
        mode="date"
        open={recordDatePickerVisible}
        date={form.record_date || new Date()}
        onConfirm={(date) => {
          setRecordDatePickerVisible(false);
          setForm(prev => ({ ...prev, record_date: date }));
        }}
        onCancel={() => setRecordDatePickerVisible(false)}
      />

      <DatePicker
        modal
        mode="date"
        open={paidDatePickerVisible}
        date={form.paid_date || new Date()}
        onConfirm={(date) => {
          setPaidDatePickerVisible(false);
          setForm(prev => ({ ...prev, paid_date: date }));
        }}
        onCancel={() => setPaidDatePickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fbfd', padding: 15 },
  header: { fontSize: 26, fontWeight: '700', color: '#2d3436', textAlign: 'center', marginVertical: 15 },
  scrollContainer: { paddingBottom: 30 },
  label: { fontSize: 15, fontWeight: '600', color: '#2d3436', marginVertical: 6 },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  selectorText: { fontSize: 15, color: '#2d3436', marginHorizontal: 8 },
  readOnly: { backgroundColor: '#ecf0f1', color: '#636e72' },
  btn: {
    backgroundColor: '#0984e3',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabledBtn: { backgroundColor: '#95a5a6' },
  cancelBtn: {
    padding: 14,
    marginTop: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#dfe6e9',
  },
  cancelText: { color: '#2d3436', fontWeight: '600' },
  modalSheet: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2d3436', marginBottom: 15 },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  modalItemText: { fontSize: 16, color: '#2d3436' },
  noData: { textAlign: 'center', color: '#636e72', marginVertical: 20 },
});
