import SQLite from 'react-native-sqlite-storage';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';

const DB_NAME = 'ledger.db';
const BACKUP_DIR = `${RNFS.DocumentDirectoryPath}/db_backups`;

// 🧩 Main Function
export async function backupAndCleanDatabase() {
  try {
    // 1️⃣ Open DB and detect actual file path
    const db = await new Promise((resolve, reject) => {
      const database = SQLite.openDatabase(
        { name: DB_NAME, location: 'default' },
        () => resolve(database),
        (err) => reject(err)
      );
    });

    const dbPath =
      db.dbPath ||
      (Platform.OS === 'ios'
        ? `${RNFS.LibraryDirectoryPath}/LocalDatabase/${DB_NAME}`
        : `/data/data/com.myapp/databases/${DB_NAME}`); // fallback for Android

    console.log('📁 Detected DB Path:', dbPath);

    // 2️⃣ Check if DB file exists
    const exists = await RNFS.exists(dbPath);
    if (!exists) {
      console.warn('❌ Database file not found:', dbPath);
      return;
    }

    // 3️⃣ Ensure backup folder exists
    const folderExists = await RNFS.exists(BACKUP_DIR);
    if (!folderExists) await RNFS.mkdir(BACKUP_DIR);

    // 4️⃣ Copy DB file to backup folder (date-based name)
    const date = new Date().toISOString().split('T')[0];
    const backupFile = `${BACKUP_DIR}/backup_${date}.db`;

    await RNFS.copyFile(dbPath, backupFile);
    console.log('✅ Backup complete:', backupFile);

    // 5️⃣ Delete backups older than 7 days
    const files = await RNFS.readDir(BACKUP_DIR);
    const now = Date.now();
    const daysToKeep = 7;

    for (const file of files) {
      if (!file.isFile()) continue;
      const modified = new Date(file.mtime).getTime();
      const ageDays = (now - modified) / (1000 * 60 * 60 * 24);
      if (ageDays > daysToKeep) {
        await RNFS.unlink(file.path);
        console.log(`🧹 Deleted old backup: ${file.name}`);
      }
    }

    console.log('✅ Cleanup complete');
  } catch (err) {
    console.error('❌ Backup or cleanup failed:', err);
  }
}
