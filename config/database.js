import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let databaseInstance = null;

// Open database (only once)
const getDatabase = async () => {
  if (databaseInstance) return databaseInstance;

  databaseInstance = await SQLite.openDatabase(
    { name: 'ledger.db', location: 'default' },
    () => console.log('✅ Database opened successfully'),
    error => console.error('❌ Error opening database:', error)
  );

  return databaseInstance;
};

// Create tables (correct way: no async inside tx)
const createTables = async () => {
  try {
    const db = await getDatabase();
    db.transaction(tx => {
      // Users
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          phone TEXT,
          address TEXT
        );`
      );

      // Fuel Types
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS fuel_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        );`
      );

      // Transactions
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          fuel_type TEXT,
          record_date TEXT,
          vehicle_no TEXT,
          weight REAL,
          rate REAL,
          total_payment REAL,
          paid_amount REAL,
          balance REAL,
          paid_date TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );`
      );
    },
    error => {
      console.error(" Transaction error while creating tables:", error);
    },
    () => {
      console.log(" Tables created successfully");
    });
  } catch (error) {
    console.error(' Error creating tables:', error);
    throw error;
  }
};

// Initialize DB
const initDatabase = async () => {
  await getDatabase();
  await createTables();
  return databaseInstance;
};

// Run on import
initDatabase();

export default initDatabase;
