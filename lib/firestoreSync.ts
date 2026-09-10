import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface MilitaryData {
  id: string;
  rank: string;
  name: string;
  fullName: string;
  matricula: string;
  specialty: string;
  specialtySecondary?: string;
  status: 'Ativo' | 'Afastado';
  type: 'EP' | 'EV' | 'Ambas';
  dutyCount: number;
}

export interface AbsenceData {
  id: string;
  militaryId: string;
  militaryName: string;
  rank: string;
  type: string;
  startDate: string;
  endDate: string;
  indefinite?: boolean;
  notes?: string;
  autoUpdate?: boolean;
  status: 'ATIVO' | 'AGENDADO' | 'CONCLUIDO';
  reason?: string;
  createdAt?: string;
}

export interface LogEntryData {
  time: string;
  text: string;
}

export type WeekRosterData = Record<string, Record<string, {
  militaryId: string;
  militaryName: string;
  rank: string;
  type: 'EP' | 'EV' | 'DISP' | 'PERM';
} | null>>;

/**
 * Fetch all military from Firestore
 */
export async function fetchMilitariesFromFirestore(): Promise<MilitaryData[]> {
  try {
    const snap = await getDocs(collection(db, 'militaries'));
    const list: MilitaryData[] = [];
    snap.forEach(d => {
      list.push(d.data() as MilitaryData);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'militaries');
    return [];
  }
}

/**
 * Save all militaries to Firestore
 */
export async function syncMilitariesToFirestore(militaries: MilitaryData[]): Promise<void> {
  try {
    for (const mil of militaries) {
      const path = `militaries/${mil.id}`;
      await setDoc(doc(db, 'militaries', mil.id), mil);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'militaries');
  }
}

/**
 * Fetch all absences from Firestore
 */
export async function fetchAbsencesFromFirestore(): Promise<AbsenceData[]> {
  try {
    const snap = await getDocs(collection(db, 'absences'));
    const list: AbsenceData[] = [];
    snap.forEach(d => {
      list.push(d.data() as AbsenceData);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'absences');
    return [];
  }
}

/**
 * Save all absences to Firestore
 */
export async function syncAbsencesToFirestore(absences: AbsenceData[]): Promise<void> {
  try {
    for (const abs of absences) {
      await setDoc(doc(db, 'absences', abs.id), abs);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'absences');
  }
}

/**
 * Fetch roster from Firestore
 */
export async function fetchRosterFromFirestore(): Promise<WeekRosterData | null> {
  try {
    const snap = await getDocs(collection(db, 'rosters'));
    if (snap.empty) return null;

    const roster: WeekRosterData = {};
    snap.forEach(d => {
      const data = d.data();
      const dateKey = data.date || d.id.replace(/_/g, '/');
      roster[dateKey] = data.assignments || {};
    });
    return roster;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'rosters');
    return null;
  }
}

/**
 * Save entire roster to Firestore
 */
export async function syncRosterToFirestore(roster: WeekRosterData): Promise<void> {
  try {
    for (const [date, assignments] of Object.entries(roster)) {
      // Document ID cannot contain slashes
      const docId = date.replace(/\//g, '_');
      await setDoc(doc(db, 'rosters', docId), {
        date,
        assignments: assignments || {},
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'rosters');
  }
}

/**
 * Fetch changelogs from Firestore
 */
export async function fetchLogsFromFirestore(): Promise<LogEntryData[]> {
  try {
    const snap = await getDocs(collection(db, 'changelogs'));
    const list: LogEntryData[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        time: data.time || '',
        text: data.text || ''
      });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'changelogs');
    return [];
  }
}

/**
 * Save logs to Firestore
 */
export async function syncLogsToFirestore(logs: LogEntryData[]): Promise<void> {
  try {
    const limit = Math.min(logs.length, 30);
    for (let i = 0; i < limit; i++) {
      const log = logs[i];
      const docId = `log_${i}`;
      await setDoc(doc(db, 'changelogs', docId), {
        time: log.time,
        text: log.text,
        order: i
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'changelogs');
  }
}

/**
 * Fetch system settings
 */
export async function fetchSettingsFromFirestore(): Promise<{ minEfetivoPreta?: number; minEfetivoVermelha?: number } | null> {
  try {
    const docRef = doc(db, 'settings', 'general');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as { minEfetivoPreta?: number; minEfetivoVermelha?: number };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'settings/general');
    return null;
  }
}

/**
 * Save system settings
 */
export async function syncSettingsToFirestore(minPreta: number, minVerm: number): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'general'), {
      minEfetivoPreta: minPreta,
      minEfetivoVermelha: minVerm,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/general');
  }
}
