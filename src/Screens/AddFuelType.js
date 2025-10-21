import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import initDatabase from '../../config/database';

export default function AddFuelType() {
  const [fuelType, setFuelType] = useState('');
  const [fuelList, setFuelList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Run once when component mounts
  useEffect(() => {
    (async () => {
      try {
        const db = await initDatabase(); // ensures tables exist
        console.log('✅ Database ready in AddFuelType:', !!db);
        await checkTableExists();
        await fetchFuelTypes();
      } catch (err) {
        console.error('❌ Init failed in AddFuelType:', err);
      }
    })();
  }, []);

  // Check if fuel_types table exists
  const checkTableExists = async () => {
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='fuel_types'",
          [],
          (txObj, { rows }) => {
            console.log('fuel_types table exists:', rows.length > 0 ? 'Yes' : 'No');
          },
          (txObj, error) => console.error('Table check error:', error)
        );
      });
    } catch (error) {
      console.error('Check table failed:', error);
    }
  };

  // Fetch fuel types
  const fetchFuelTypes = async () => {
    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM fuel_types ORDER BY id DESC',
          [],
          (txObj, resultSet) => {
            const data = [];
            for (let i = 0; i < resultSet.rows.length; i++) {
              data.push(resultSet.rows.item(i));
            }
            console.log('📦 Fuel types fetched:', data);
            setFuelList(data);
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

  // Add new fuel type
  const handleAddFuelType = async () => {
    const trimmedFuelType = fuelType.trim();
    if (!trimmedFuelType) {
      Alert.alert('Error', 'Please enter a fuel type');
      return;
    }

    setLoading(true);
    try {
      const db = await initDatabase();
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO fuel_types (name) VALUES (?)',
          [trimmedFuelType],
          (tx, results) => {
            if (results.rowsAffected > 0) {
              console.log('✅ Fuel type inserted:', trimmedFuelType);
              setFuelType('');
              fetchFuelTypes();
              Alert.alert('Success', 'Fuel type added successfully');
            }
          },
          (txObj, error) => {
            console.error('Insert Error:', error);
            if (error.message.includes('UNIQUE')) {
              Alert.alert('Error', 'This fuel type already exists');
            } else {
              Alert.alert('Error', `Insert failed: ${error.message}`);
            }
          }
        );
      });
    } catch (error) {
      Alert.alert('Error', `Failed to add fuel type: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete fuel type
  const handleDeleteFuelType = (id, name) => {
    Alert.alert('Confirm Delete', `Delete ${name}?`, [
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
                'DELETE FROM fuel_types WHERE id = ?',
                [id],
                () => {
                  console.log(`🗑️ Deleted fuel type id=${id}`);
                  fetchFuelTypes();
                  Alert.alert('Success', 'Fuel type deleted');
                },
                (txObj, error) => {
                  console.error('Delete Error:', error);
                  if (error.message.includes('FOREIGN KEY')) {
                    Alert.alert('Error', `Cannot delete ${name}, it is used in transactions`);
                  } else {
                    Alert.alert('Error', `Delete failed: ${error.message}`);
                  }
                }
              );
            });
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* <Text style={styles.header}>⛽ Add Fuel Type</Text>
      <Text style={styles.subHeader}>Manage your available fuel types</Text> */}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter fuel type (e.g. Diesel)"
          value={fuelType}
          onChangeText={setFuelType}
        />
        <TouchableOpacity
          style={[styles.addBtn, loading && styles.disabledBtn]}
          onPress={handleAddFuelType}
          disabled={loading}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="#0984e3" />}

      {/* Fuel List */}
      <Text style={styles.listHeader}>Fuel Types ({fuelList.length})</Text>
      <FlatList
        data={fuelList}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No fuel types added yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Icon name="gas-station" size={22} color="#0984e3" />
              <Text style={styles.cardText}>{item.name}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteFuelType(item.id, item.name)}>
              <Icon name="delete" size={22} color="#eb3b5a" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa', padding: 20 },
  header: { fontSize: 26, fontWeight: 'bold', color: '#2d3436', textAlign: 'center' },
  subHeader: { textAlign: 'center', color: '#636e72', marginBottom: 20 },
  inputRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  input: { flex: 1, fontSize: 16, padding: 12 },
  addBtn: {
    backgroundColor: '#0984e3',
    padding: 12,
    borderRadius: 10,
    marginLeft: 8,
  },
  disabledBtn: { backgroundColor: '#95a5a6' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  cardText: { fontSize: 16, fontWeight: '500', color: '#2d3436', marginLeft: 10 },
  emptyText: { textAlign: 'center', color: '#636e72', marginTop: 40 },
  listHeader: { fontSize: 18, fontWeight: '600', color: '#2d3436', marginVertical: 10 },
});
