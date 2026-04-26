import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MeterScreen from './src/MeterScreen';

// expo-sqlite은 웹 미지원 → 웹에서는 인메모리 스토리지로 직접 렌더
if (Platform.OS !== 'web') {
  // 네이티브 전용 import는 dynamic require로 분리
}

export default function App() {
  if (Platform.OS === 'web') {
    return (
      <>
        <StatusBar style="light" />
        <MeterScreen />
      </>
    );
  }

  // 네이티브: SQLiteProvider로 감싸기
  const { SQLiteProvider } = require('expo-sqlite');
  const { initDb } = require('./src/db');
  return (
    <SQLiteProvider databaseName="meter.db" onInit={initDb}>
      <StatusBar style="light" backgroundColor="#09090b" />
      <MeterScreen />
    </SQLiteProvider>
  );
}
