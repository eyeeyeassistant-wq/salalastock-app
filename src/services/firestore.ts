import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockCountRecord,
} from '../types/stock';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

export interface AppCloudData {
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  stockCountRecords: MonthlyStockCountRecord[];
  isInitialized?: boolean;
  updatedAt?: string;
}

export interface AppCloudSettings {
  webhookUrl: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  autoSyncEnabled: boolean;
  lastSyncTime: string | null;
  adminPin?: string;
  updatedAt?: string;
}

const DATA_DOC_PATH = 'bakery_store/main_data';
const SETTINGS_DOC_PATH = 'bakery_store/settings';

// Test connection on boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'bakery_store', 'connection_test'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is in offline mode or config is verifying.');
    }
  }
}

// Load cloud data once
export async function loadCloudData(): Promise<AppCloudData | null> {
  try {
    const docRef = doc(db, 'bakery_store', 'main_data');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AppCloudData;
    }
    return null;
  } catch (err: any) {
    if (err?.message?.includes('the client is offline') || err?.code === 'unavailable') {
      console.info('Firestore offline mode: using local cache/storage data.');
    } else {
      console.warn('Firestore load data note:', err?.message || err);
    }
    return null;
  }
}

// Load cloud settings once
export async function loadCloudSettings(): Promise<AppCloudSettings | null> {
  try {
    const docRef = doc(db, 'bakery_store', 'settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AppCloudSettings;
    }
    return null;
  } catch (err: any) {
    if (err?.message?.includes('the client is offline') || err?.code === 'unavailable') {
      console.info('Firestore offline mode: using local cache/storage settings.');
    } else {
      console.warn('Firestore load settings note:', err?.message || err);
    }
    return null;
  }
}

// Save all data to Firestore Cloud Database
let saveTimeout: any = null;
export function saveCloudDataDebounced(data: AppCloudData, delayMs: number = 300) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveCloudData(data);
  }, delayMs);
}

export async function saveCloudData(data: AppCloudData) {
  try {
    const docRef = doc(db, 'bakery_store', 'main_data');
    await setDoc(
      docRef,
      {
        materials: data.materials || [],
        recipes: data.recipes || [],
        productions: data.productions || [],
        transactions: data.transactions || [],
        stockCountRecords: data.stockCountRecords || [],
        isInitialized: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    if (err?.message?.includes('the client is offline') || err?.code === 'unavailable') {
      console.info('Firestore offline: data cached locally until network reconnects.');
    } else {
      console.warn('Firestore save data notice:', err?.message || err);
    }
  }
}

// Save settings to Firestore Cloud Database
export async function saveCloudSettings(settings: Partial<AppCloudSettings>) {
  try {
    const docRef = doc(db, 'bakery_store', 'settings');
    await setDoc(
      docRef,
      {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: any) {
    if (err?.message?.includes('the client is offline') || err?.code === 'unavailable') {
      console.info('Firestore offline: settings cached locally.');
    } else {
      console.warn('Firestore save settings notice:', err?.message || err);
    }
  }
}

// Subscribe to real-time updates from cloud
export function subscribeToCloudChanges(
  onDataChange: (data: AppCloudData) => void,
  onSettingsChange: (settings: AppCloudSettings) => void
) {
  const unsubData = onSnapshot(
    doc(db, 'bakery_store', 'main_data'),
    { includeMetadataChanges: true },
    (snap) => {
      // Ignore local pending writes to avoid reverting immediate user edits/deletions
      if (snap.metadata.hasPendingWrites) {
        return;
      }
      if (snap.exists()) {
        onDataChange(snap.data() as AppCloudData);
      }
    },
    (err) => {
      console.warn('Realtime cloud data listener notice:', err);
    }
  );

  const unsubSettings = onSnapshot(
    doc(db, 'bakery_store', 'settings'),
    { includeMetadataChanges: true },
    (snap) => {
      if (snap.metadata.hasPendingWrites) {
        return;
      }
      if (snap.exists()) {
        onSettingsChange(snap.data() as AppCloudSettings);
      }
    },
    (err) => {
      console.warn('Realtime cloud settings listener notice:', err);
    }
  );

  return () => {
    unsubData();
    unsubSettings();
  };
}
