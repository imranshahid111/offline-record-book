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

export default function EditRecordScreen({ route, navigation }) {
  const { id } = route.params; // 👈 record ID passed from Ledger
  const [form, setForm] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [fuelTypes, setFuelTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [fuelTypeModalVisible, setFuelTypeModalVisible] = useState(false);
  const [recordDatePickerVisible, setRecordDatePickerVisible] = useState(false);
  const [paidDatePickerVisible, setPaidDatePickerVisible] = useState(false);

  const toTimestamp = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
    return null;
  };

  useEffect(() => {
    fetchSuppliers();
    fetchFuelTypes();
    fetchRecord();
  }, []);

  // Auto-calc total_payment & balance
  useEffect(() => {
    if (!form) return;
    const weight = parseFloat(form.weight) || 0;
    const rate = parseFloat(form.rate) || 0;
    const total_payment = (weight * rate).toFixed(2);
    const paid_amount = parseFloat(form.paid_amount) || 0;
    const balance = (total_payment - paid_amount).toFixed(2);
    setForm(prev => ({ ...prev, total_payment, balance }));
  }, [form?.weight, form?.rate, form?.paid_amount]);

  const fetchSuppliers = async () => {
    const db = await initDatabase();
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM users ORDER BY name ASC',
        [],
        (_, { rows }) => {
          const data = [];
          for (let i = 0; i < rows.length; i++) data.push(rows.item(i));
          setSuppliers(data);
        }
      );
    });
  };

  const fetchFuelTypes = async () => {
    const db = await initDatabase();
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM fuel_types ORDER BY name ASC',
        [],
        (_, { rows }) => {
          const data = [];
          for (let i = 0; i < rows.length; i++) data.push(rows.item(i));
          setFuelTypes(data);
        }
      );
    });
  };

  const fetchRecord = async () => {
    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          `SELECT t.*, u.name as supplier_name, f.name as fuel_name
           FROM transactions t
           LEFT JOIN users u ON t.user_id = u.id
           LEFT JOIN fuel_types f ON t.fuel_type_id = f.id
           WHERE t.id = ?`,
          [id],
          (_, { rows }) => {
            if (rows.length > 0) {
              const r = rows.item(0);
              setForm({
                ...r,
                record_date: new Date(parseInt(r.record_date)),
                paid_date: r.paid_date ? new Date(parseInt(r.paid_date)) : null,
                fuel_type_id: r.fuel_type_id,
                fuel_type: r.fuel_name,
                supplier_name: r.supplier_name,
              });
            } else {
              Alert.alert('Error', 'Record not found');
              navigation.goBack();
            }
          }
        );
      });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTransaction = async () => {
    if (!form) return;
    const { user_id, fuel_type_id, record_date, total_payment } = form;
    if (!user_id) return Alert.alert('Error', 'Select supplier');
    if (!fuel_type_id) return Alert.alert('Error', 'Select fuel type');
    if (!record_date) return Alert.alert('Error', 'Select record date');

    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE transactions SET 
            user_id = ?, 
            fuel_type_id = ?, 
            record_date = ?, 
            vehicle_no = ?, 
            weight = ?, 
            rate = ?, 
            total_payment = ?, 
            paid_amount = ?, 
            balance = ?, 
            paid_date = ? 
          WHERE id = ?`,
          [
            form.user_id,
            form.fuel_type_id,
            toTimestamp(form.record_date),
            form.vehicle_no,
            parseFloat(form.weight) || null,
            parseFloat(form.rate) || null,
            parseFloat(form.total_payment),
            parseFloat(form.paid_amount) || null,
            parseFloat(form.balance) || null,
            toTimestamp(form.paid_date),
            id,
          ],
          () => {
            Alert.alert('Success', 'Transaction updated successfully', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          },
          (_, error) => console.log('Update Error:', error)
        );
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: field === 'vehicle_no' ? value.toUpperCase() : value,
    }));
  };

  if (!form) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0984e3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>Edit Transaction</Text>

        {/* Supplier */}
        <Text style={styles.label}>Supplier</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setSupplierModalVisible(true)}>
          <Icon name="account" size={20} color="#636e72" />
          <Text style={styles.selectorText}>{form.supplier_name || 'Select Supplier'}</Text>
          <Icon name="chevron-down" size={22} color="#636e72" />
        </TouchableOpacity>

        {/* Fuel Type */}
        <Text style={styles.label}>Fuel Type</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setFuelTypeModalVisible(true)}>
          <Icon name="gas-station" size={20} color="#636e72" />
          <Text style={styles.selectorText}>{form.fuel_type || 'Select Fuel Type'}</Text>
          <Icon name="chevron-down" size={22} color="#636e72" />
        </TouchableOpacity>

        {/* Record Date */}
        <Text style={styles.label}>Record Date</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setRecordDatePickerVisible(true)}>
          <Icon name="calendar" size={20} color="#636e72" />
          <Text style={styles.selectorText}>{form.record_date?.toLocaleDateString?.()}</Text>
        </TouchableOpacity>

        {/* Vehicle */}
        <Text style={styles.label}>Vehicle No</Text>
        <TextInput style={styles.textInput} value={form.vehicle_no} onChangeText={v => handleChange('vehicle_no', v)} />

        {/* Weight */}
        <Text style={styles.label}>Weight</Text>
        <TextInput style={styles.textInput} value={form.weight?.toString()} keyboardType="numeric" onChangeText={v => handleChange('weight', v)} />

        {/* Rate */}
        <Text style={styles.label}>Rate</Text>
        <TextInput style={styles.textInput} value={form.rate?.toString()} keyboardType="numeric" onChangeText={v => handleChange('rate', v)} />

        {/* Total Payment */}
        <Text style={styles.label}>Total Payment</Text>
        <TextInput style={[styles.textInput, styles.readOnly]} editable={false} value={form.total_payment?.toString()} />

        {/* Paid Amount */}
        <Text style={styles.label}>Paid Amount</Text>
        <TextInput style={styles.textInput} value={form.paid_amount?.toString()} keyboardType="numeric" onChangeText={v => handleChange('paid_amount', v)} />

        {/* Balance */}
        <Text style={styles.label}>Balance</Text>
        <TextInput style={[styles.textInput, styles.readOnly]} editable={false} value={form.balance?.toString()} />

        {/* Paid Date */}
        <Text style={styles.label}>Paid Date</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setPaidDatePickerVisible(true)}>
          <Icon name="calendar-check" size={20} color="#636e72" />
          <Text style={styles.selectorText}>
            {form.paid_date ? form.paid_date.toLocaleDateString?.() : 'Select Paid Date'}
          </Text>
        </TouchableOpacity>

        {/* Buttons */}
        <TouchableOpacity style={[styles.btn, loading && styles.disabledBtn]} onPress={updateTransaction}>
          <Text style={styles.btnText}>💾 Update Transaction</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Supplier Modal */}
      <Modal visible={supplierModalVisible} animationType="slide" transparent>
        <View style={styles.modalSheet}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Supplier</Text>
            <ScrollView>
              {suppliers.map(s => (
                <TouchableOpacity key={s.id} style={styles.modalItem} onPress={() => {
                  setForm(prev => ({ ...prev, user_id: s.id, supplier_name: s.name }));
                  setSupplierModalVisible(false);
                }}>
                  <Text style={styles.modalItemText}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSupplierModalVisible(false)}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fuel Modal */}
      <Modal visible={fuelTypeModalVisible} animationType="slide" transparent>
        <View style={styles.modalSheet}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Fuel Type</Text>
            <ScrollView>
              {fuelTypes.map(f => (
                <TouchableOpacity key={f.id} style={styles.modalItem} onPress={() => {
                  setForm(prev => ({ ...prev, fuel_type_id: f.id, fuel_type: f.name }));
                  setFuelTypeModalVisible(false);
                }}>
                  <Text style={styles.modalItemText}>{f.name}</Text>
                </TouchableOpacity>
              ))}
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
  scrollContainer: { paddingBottom: 30 },
  header: { fontSize: 26, fontWeight: '700', color: '#2d3436', textAlign: 'center', marginVertical: 15 },
  label: { fontSize: 15, fontWeight: '600', color: '#2d3436', marginVertical: 6 },
  textInput: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: '#dfe6e9' },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#dfe6e9' },
  selectorText: { fontSize: 15, color: '#2d3436', marginHorizontal: 8 },
  readOnly: { backgroundColor: '#ecf0f1', color: '#636e72' },
  btn: { backgroundColor: '#0984e3', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { padding: 14, marginTop: 10, alignItems: 'center', borderRadius: 12, backgroundColor: '#dfe6e9' },
  cancelText: { color: '#2d3436', fontWeight: '600' },
  modalSheet: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2d3436', marginBottom: 15 },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  modalItemText: { fontSize: 16, color: '#2d3436' },
});
