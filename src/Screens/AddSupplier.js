import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import initDatabase from '../../config/database';
import { useNavigation } from '@react-navigation/native';

export default function AddSupplier() {
  const navigation = useNavigation();

  const [supplier, setSupplier] = useState({ name: '', phone: '', address: '' });
  const [supplierList, setSupplierList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 15 }}
          onPress={() => setModalVisible(true)}
        >
          <Icon name="plus-circle" size={26} color="#00b894" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users ORDER BY id DESC',
          [],
          (txObj, resultSet) => {
            const data = [];
            for (let i = 0; i < resultSet.rows.length; i++) {
              data.push(resultSet.rows.item(i));
            }
            setSupplierList(data || []);
          }
        );
      });
    } catch (error) {
      Alert.alert('Error', `Failed to fetch suppliers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSupplier({ ...supplier, [field]: value });
  };

  const handleAddSupplier = async () => {
    const { name, phone, address } = supplier;
    if (!name || !phone) {
      Alert.alert('Error', 'Name and phone are required');
      return;
    }

    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO users (name, phone, address) VALUES (?, ?, ?)',
          [name, phone, address],
          () => {
            setSupplier({ name: '', phone: '', address: '' });
            fetchSuppliers();
            setModalVisible(false);
            Alert.alert('Success', 'Supplier added successfully');
          }
        );
      });
    } catch (error) {
      const errorMsg = error.message.includes('UNIQUE constraint')
        ? 'Phone number already exists'
        : `Failed to add supplier: ${error.message}`;
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = (id, name) => {
    Alert.alert('Confirm Delete', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const db = await initDatabase();
            db.transaction(tx => {
              tx.executeSql(
                'DELETE FROM users WHERE id = ?',
                [id],
                () => {
                  fetchSuppliers();
                  Alert.alert('Success', 'Supplier deleted successfully');
                }
              );
            });
          } catch (error) {
            Alert.alert('Error', `Failed to delete supplier: ${error.message}`);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* <Text style={styles.header}>👤 Suppliers</Text> */}
      {/* <Text style={styles.subHeader}>Manage your suppliers</Text> */}

      {loading && <ActivityIndicator size="large" color="#00b894" />}

      {/* Supplier List */}
      <Text style={styles.listHeader}>Suppliers ({supplierList.length || 0})</Text>
      <FlatList
        data={supplierList || []}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No suppliers added yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.phone}>{item.phone}</Text>
              <Text style={styles.address}>{item.address || 'No address'}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteSupplier(item.id, item.name)}>
              <Icon name="delete" size={22} color="#eb3b5a" />
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Add Supplier Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Supplier</Text>

            <TextInput
              placeholder="Name"
              style={styles.input}
              value={supplier.name}
              onChangeText={v => handleChange('name', v)}
            />
            <TextInput
              placeholder="Phone"
              style={styles.input}
              keyboardType="phone-pad"
              value={supplier.phone}
              onChangeText={v => handleChange('phone', v)}
            />
            <TextInput
              placeholder="Address"
              style={styles.input}
              value={supplier.address}
              onChangeText={v => handleChange('address', v)}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.addBtn]} onPress={handleAddSupplier}>
                <Text style={styles.addText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#d63031' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.addText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#2d3436', textAlign: 'center' },
  subHeader: { textAlign: 'center', color: '#636e72', marginBottom: 20 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    padding: 12,
    marginBottom: 10,
  },
  addBtn: {
    flex: 1,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00b894',
    padding: 12,
    borderRadius: 10,
  },
  addText: { color: '#fff', fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2d3436' },
  phone: { color: '#636e72' },
  address: { color: '#b2bec3', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#636e72', marginTop: 30 },
  listHeader: { fontSize: 18, fontWeight: '600', color: '#2d3436', marginVertical: 10 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
});
