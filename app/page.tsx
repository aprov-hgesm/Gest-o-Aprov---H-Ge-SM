'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { jsPDF } from 'jspdf';
import { 
  Calendar, 
  Users, 
  FileText, 
  UserX, 
  Settings, 
  Plus, 
  Search, 
  Download, 
  History, 
  ArrowLeftRight, 
  RotateCcw,
  Check, 
  X, 
  Menu, 
  Bell, 
  ShieldAlert, 
  Sliders, 
  FileCheck, 
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  HelpCircle,
  LogOut,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Utensils,
  Cloud,
  CloudUpload,
  RefreshCw,
  LogIn,
  Database,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { auth, loginWithGoogle, logoutUser, testConnection } from '@/lib/firebase';
import { 
  fetchMilitariesFromFirestore, 
  syncMilitariesToFirestore,
  fetchAbsencesFromFirestore, 
  syncAbsencesToFirestore,
  fetchRosterFromFirestore, 
  syncRosterToFirestore,
  fetchLogsFromFirestore, 
  syncLogsToFirestore,
  fetchSettingsFromFirestore, 
  syncSettingsToFirestore 
} from '@/lib/firestoreSync';
import { onAuthStateChanged, User } from 'firebase/auth';

// ==========================================
// TYPES & SCHEMAS
// ==========================================
interface Military {
  id: string;
  rank: string;
  name: string;
  fullName: string;
  matricula: string;
  specialty: string;
  specialtySecondary?: string;
  status: 'Ativo' | 'Afastado';
  type: 'EP' | 'EV' | 'Ambas'; // EP: Escala Preta, EV: Escala Vermelha
  dutyCount: number;
}

interface Absence {
  id: string;
  militaryId: string;
  militaryName: string;
  rank: string;
  type: string;
  startDate: string;
  endDate: string;
  indefinite: boolean;
  notes: string;
  autoUpdate: boolean;
  status: 'ATIVO' | 'AGENDADO';
}

interface RosterCell {
  militaryId: string;
  militaryName: string;
  rank: string;
  type: 'EP' | 'EV' | 'PERM' | 'DISP'; // EP: Serviço Regular, EV: Escala Vermelha, PERM: Permuta, DISP: Dispensa
}

interface WeekRoster {
  [day: string]: { // "Seg 02", "Ter 03", etc.
    [post: string]: RosterCell | null; // "CMT DA GUARDA", "CB DA GUARDA", etc.
  };
}

interface LogEntry {
  time: string;
  text: string;
}

// ==========================================
// INITIAL MOCK DATA
// ==========================================
const initialMilitary: Military[] = [
  {
    id: 'mil-1',
    rank: 'Cb',
    name: 'HENRIQUE',
    fullName: 'EDUARDO LOPES HENRIQUE',
    matricula: '1',
    specialty: 'Cozinheiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-2',
    rank: 'Cb',
    name: 'BRENO',
    fullName: 'BRENO CASTRO CAVALHEIRO',
    matricula: '2',
    specialty: 'Cozinheiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-3',
    rank: 'Sd',
    name: 'BARROS',
    fullName: 'WELISSON VIEIRA DE BARROS',
    matricula: '3',
    specialty: 'Cozinheiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-4',
    rank: 'Sd',
    name: 'FLORES',
    fullName: 'VINICIUS FLORES DA SILVA DOS SANTOS',
    matricula: '4',
    specialty: 'Copeiro de Dia',
    specialtySecondary: 'Auxiliar do Copeiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-5',
    rank: 'Sd',
    name: 'TORMES',
    fullName: 'GUILHERME TORMES RODRIGUES SANTOS',
    matricula: '5',
    specialty: 'Copeiro de Dia',
    specialtySecondary: 'Auxiliar do Copeiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-6',
    rank: 'Sd',
    name: 'COELHO',
    fullName: 'JOAO VITOR COELHO SILVEIRA',
    matricula: '6',
    specialty: 'Auxiliar do Copeiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-7',
    rank: 'Sd',
    name: 'CHAVES',
    fullName: 'MOISES CHAVES',
    matricula: '7',
    specialty: 'Cozinheiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-8',
    rank: 'Sd',
    name: 'M SILVA',
    fullName: 'MATHEUS DA SILVA - 1º RCC',
    matricula: '8',
    specialty: 'Copeiro de Dia',
    specialtySecondary: 'Auxiliar do Copeiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-9',
    rank: 'Sd',
    name: 'WESLEY',
    fullName: 'WESLEY EDUARDO DA ROSA FREITAS - CMSM',
    matricula: '9',
    specialty: 'Cozinheiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-10',
    rank: 'Sd',
    name: 'MACIEL',
    fullName: 'VINICIUS FRIEDRICH MACIEL - 29º BIB',
    matricula: '10',
    specialty: 'Cozinheiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-11',
    rank: 'Sd',
    name: 'MARTINS',
    fullName: 'JOÃO PEDRO MARTINS DE OLIVEIRA - Pq R Mnt/3',
    matricula: '11',
    specialty: 'Copeiro de Dia',
    specialtySecondary: 'Auxiliar do Copeiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-12',
    rank: 'Sd',
    name: 'ESTIGARRIBIA',
    fullName: 'PABLO DE CAMPOS ESTIGARRIBIA - 3º GAC AP',
    matricula: '12',
    specialty: 'Copeiro de Dia',
    specialtySecondary: 'Auxiliar do Copeiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-13',
    rank: 'Sd',
    name: 'HYAN',
    fullName: 'HYAN PIETRO DIAS PINHEIRO - 29º BIB',
    matricula: '13',
    specialty: 'Ceia de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-14',
    rank: 'Sd',
    name: 'BALIN',
    fullName: 'SAMUEL DA SILVA BALIN',
    matricula: '14',
    specialty: 'Ceia de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  },
  {
    id: 'mil-15',
    rank: 'Sd',
    name: 'PAZ',
    fullName: 'MAURÍCIO PAZ DA SILVEIRA',
    matricula: '15',
    specialty: 'Copeiro de Dia',
    specialtySecondary: 'Auxiliar do Copeiro de Dia',
    status: 'Ativo',
    type: 'Ambas',
    dutyCount: 0
  }
];

const initialAbsences: Absence[] = [];

// ==========================================
// DATE UTILITIES (DD/MM/AAAA & CURRENT WEEK)
// ==========================================

const formatDateDDMMAAAA = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDateISO = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseDateAny = (str: string): Date | null => {
  if (!str) return null;
  const ddmmyyyy = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3], 10), parseInt(ddmmyyyy[2], 10) - 1, parseInt(ddmmyyyy[1], 10));
  }
  const yyyymmdd = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmdd) {
    return new Date(parseInt(yyyymmdd[1], 10), parseInt(yyyymmdd[2], 10) - 1, parseInt(yyyymmdd[3], 10));
  }
  return null;
};

const getMondayOfWeek = (d: Date = new Date()): Date => {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getWeekDates = (monday: Date): string[] => {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDateDDMMAAAA(d));
  }
  return dates;
};

const getDaysInMonth = (year: number, month: number): string[] => {
  const days: string[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(formatDateDDMMAAAA(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const WEEKDAY_NAMES_PT = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
];

const WEEKDAY_SHORT_PT = [
  'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'
];

const getDayWeekdayShort = (dayStr: string): string => {
  const d = parseDateAny(dayStr);
  if (!d) return '';
  return WEEKDAY_SHORT_PT[d.getDay()];
};

const getDayWeekdayLong = (dayStr: string): string => {
  const d = parseDateAny(dayStr);
  if (!d) return '';
  return WEEKDAY_NAMES_PT[d.getDay()];
};

const isDayWeekend = (dayStr: string): boolean => {
  if (dayStr.startsWith('Sáb') || dayStr.startsWith('Dom')) return true;
  const d = parseDateAny(dayStr);
  if (!d) return false;
  const wd = d.getDay();
  return wd === 0 || wd === 6;
};

const isDateToday = (dayStr: string): boolean => {
  const d = parseDateAny(dayStr);
  if (!d) return false;
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

const formatDisplayDate = (val: string): string => {
  if (!val) return '';
  if (val === 'Indefinido') return 'Indefinido';
  const d = parseDateAny(val);
  if (!d) return val;
  return formatDateDDMMAAAA(d);
};

const getSpecialtyDisplayName = (spec: string) => {
  if (spec === 'Auxiliar do Copeiro de Dia') return 'Aux. Copeiro de Dia';
  return spec;
};

// Check if overlapping post assignment is permitted on the same day
// Ceia de Dia can be assigned to either the Copeiro or the Auxiliar already rostered on that day
const isAllowedOverlap = (p1: string, p2: string) => {
  return (p1 === 'Ceia de Dia' && (p2 === 'Copeiro de Dia' || p2 === 'Auxiliar do Copeiro de Dia')) ||
         (p2 === 'Ceia de Dia' && (p1 === 'Copeiro de Dia' || p1 === 'Auxiliar do Copeiro de Dia'));
};

const generateUniqueRecordId = (prefix: string) => {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const createEmptyRosterForDates = (dateList: string[]): WeekRoster => {
  const r: WeekRoster = {};
  dateList.forEach(day => {
    r[day] = {
      'Cozinheiro de Dia': null,
      'Copeiro de Dia': null,
      'Auxiliar do Copeiro de Dia': null,
      'Ceia de Dia': null
    };
  });
  return r;
};

const createEmptyRoster = (keys?: string[]): WeekRoster => {
  if (keys && keys.length > 0) {
    return createEmptyRosterForDates(keys);
  }
  return createInitialRoster();
};

const createInitialRoster = (): WeekRoster => {
  const today = new Date();
  const monthDays = getDaysInMonth(today.getFullYear(), today.getMonth());
  const currentWeekDays = getWeekDates(getMondayOfWeek(today));
  const allDays = Array.from(new Set([...currentWeekDays, ...monthDays]));
  return createEmptyRosterForDates(allDays);
};

const initialRoster: WeekRoster = createInitialRoster();

const initialLogs: LogEntry[] = [
  { time: '14:47', text: 'Efetivo inicializado em branco. Pronto para cadastros.' }
];

const getAntiguidadeValue = (str: string) => {
  if (!str) return 999999;
  const digits = str.replace(/\D/g, '');
  if (!digits) return 999999;
  return parseInt(digits, 10);
};

const RANK_PRECEDENCE: Record<string, number> = {
  'Ten': 1,
  '1º Ten': 1,
  '2º Ten': 2,
  'Asp': 3,
  'ST': 4,
  'Sgt': 5,
  '1º Sgt': 5,
  '2º Sgt': 6,
  '3º Sgt': 7,
  'Cb': 8,
  'Sd': 9,
  'Sd EP': 9,
  'Sd EV': 10
};

const compareMilitaryHierarchy = (a: Military, b: Military) => {
  const rankA = RANK_PRECEDENCE[a.rank] ?? 99;
  const rankB = RANK_PRECEDENCE[b.rank] ?? 99;
  if (rankA !== rankB) return rankA - rankB;
  const valA = getAntiguidadeValue(a.matricula);
  const valB = getAntiguidadeValue(b.matricula);
  if (valA !== valB) return valA - valB;
  return a.name.localeCompare(b.name);
};

const isDayInAbsence = (dayStr: string, absence: Absence): boolean => {
  const targetDate = parseDateAny(dayStr);
  const startDate = parseDateAny(absence.startDate);
  if (!targetDate || !startDate) return false;

  targetDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  if (absence.indefinite || !absence.endDate || absence.endDate === 'Indefinido') {
    return targetDate >= startDate;
  }
  const endDate = parseDateAny(absence.endDate);
  if (!endDate) return targetDate >= startDate;
  endDate.setHours(0, 0, 0, 0);

  return targetDate >= startDate && targetDate <= endDate;
};

export default function RosterApp() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [militaryList, setMilitaryList] = useState<Military[]>(initialMilitary);
  const [absences, setAbsences] = useState<Absence[]>(initialAbsences);
  const [roster, setRoster] = useState<WeekRoster>(initialRoster);
  const [changelogs, setChangelogs] = useState<LogEntry[]>(initialLogs);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'preta' | 'vermelha' | 'afastamentos' | 'pdf' | 'efetivo'>('dashboard');
  const [gestaoSubTab, setGestaoSubTab] = useState<'quadro' | 'preta' | 'vermelha'>('quadro');
  
  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Military management form state
  const [editingMil, setEditingMil] = useState<Military | null>(null);
  const [isAddingMil, setIsAddingMil] = useState(false);
  const [newMilRank, setNewMilRank] = useState('Sd');
  const [newMilName, setNewMilName] = useState('');
  const [newMilFullName, setNewMilFullName] = useState('');
  const [newMilMatricula, setNewMilMatricula] = useState('');
  const [newMilSpecialty, setNewMilSpecialty] = useState('Cozinheiro de Dia');
  const [newMilSpecialtySecondary, setNewMilSpecialtySecondary] = useState('Nenhuma');
  const [newMilScaleType, setNewMilScaleType] = useState<'EP' | 'EV' | 'Ambas'>('Ambas');
  const [newMilStatus, setNewMilStatus] = useState<'Ativo' | 'Afastado'>('Ativo');
  const [newMilDutyCount, setNewMilDutyCount] = useState(0);

  // Manual Assignment selection type state
  const [selectedAssignType, setSelectedAssignType] = useState<'EP' | 'EV' | 'PERM' | 'DISP'>('EP');
  const [modalFilterOnlySpecialty, setModalFilterOnlySpecialty] = useState(true);

  // Filters State & Current Week Navigation
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [filterFunction, setFilterFunction] = useState('Todas as Funções');
  const [viewOption, setViewOption] = useState<'Semanal' | 'Quinzenal' | 'Mensal' | 'Personalizado'>('Semanal');
  const [startDateFilter, setStartDateFilter] = useState(() => formatDateISO(getMondayOfWeek(new Date())));
  const [endDateFilter, setEndDateFilter] = useState(() => {
    const end = new Date(getMondayOfWeek(new Date()));
    end.setDate(end.getDate() + 6);
    return formatDateISO(end);
  });
  const [filterMilitaryName, setFilterMilitaryName] = useState('');
  const [filterScaleType, setFilterScaleType] = useState<'Ambas' | 'Preta' | 'Vermelha'>('Ambas');

  // Navigation handlers for week
  const handlePrevWeek = () => {
    setSelectedWeekMonday(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setSelectedWeekMonday(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const handleCurrentWeek = () => {
    setSelectedWeekMonday(getMondayOfWeek(new Date()));
  };

  // Interactive assignment states
  const [selectedCell, setSelectedCell] = useState<{ day: string; post: string } | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Absence form states
  const [absentMilId, setAbsentMilId] = useState('');
  const [absenceType, setAbsenceType] = useState('Férias');
  const [absenceStart, setAbsenceStart] = useState('');
  const [absenceEnd, setAbsenceEnd] = useState('');
  const [absenceIndefinite, setAbsenceIndefinite] = useState(false);
  const [absenceNotes, setAbsenceNotes] = useState('');
  const [absenceAutoUpdate, setAbsenceAutoUpdate] = useState(true);

  // Rules Configuration
  const [minEfetivoPreta, setMinEfetivoPreta] = useState(12);
  const [minEfetivoVermelha, setMinEfetivoVermelha] = useState(14);

  // PDF Report Customizer States
  const [selectedReportType, setSelectedReportType] = useState<'individual' | 'weekly' | 'monthly' | 'equity'>('weekly');
  const [reportMilId, setReportMilId] = useState(initialMilitary[0]?.id || 'mil-1');
  const [reportUnit, setReportUnit] = useState('Setor de Aprovisionamento - H Ge SM');
  const [reportFormat, setReportFormat] = useState<'PDF' | 'XLSX'>('PDF');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeRankLogos, setIncludeRankLogos] = useState(true);

  // Notification Toast state
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'info' }>({ show: false, msg: '', type: 'success' });

  // Firebase Cloud & Authentication States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'connected' | 'syncing' | 'synced' | 'error'>('connected');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Hydrate from Firestore / Cloud synchronization on startup
  useEffect(() => {
    let isMounted = true;

    async function initFirebaseSync() {
      try {
        setCloudSyncStatus('syncing');
        const isOk = await testConnection();
        if (!isOk) {
          if (isMounted) setCloudSyncStatus('connected');
          return;
        }

        const [cloudMils, cloudAbs, cloudRos, cloudLogs, cloudSettings] = await Promise.all([
          fetchMilitariesFromFirestore(),
          fetchAbsencesFromFirestore(),
          fetchRosterFromFirestore(),
          fetchLogsFromFirestore(),
          fetchSettingsFromFirestore()
        ]);

        if (!isMounted) return;

        if (cloudMils && cloudMils.length > 0) {
          setMilitaryList(cloudMils);
          localStorage.setItem('dr_military', JSON.stringify(cloudMils));
        } else {
          // Cloud collection is fresh: seed initial military
          await syncMilitariesToFirestore(initialMilitary);
        }

        if (cloudAbs && cloudAbs.length > 0) {
          const mappedAbs: Absence[] = cloudAbs.map(a => ({
            id: a.id,
            militaryId: a.militaryId,
            militaryName: a.militaryName,
            rank: a.rank,
            type: a.type,
            startDate: a.startDate,
            endDate: a.endDate,
            indefinite: !!a.indefinite,
            notes: a.notes || a.reason || '',
            autoUpdate: !!a.autoUpdate,
            status: a.status === 'AGENDADO' ? 'AGENDADO' : 'ATIVO'
          }));
          setAbsences(mappedAbs);
          localStorage.setItem('dr_absences', JSON.stringify(mappedAbs));
        }

        if (cloudRos && Object.keys(cloudRos).length > 0) {
          setRoster(cloudRos as WeekRoster);
          localStorage.setItem('dr_roster', JSON.stringify(cloudRos));
        } else {
          // Seed cloud with initial roster
          const fresh = createInitialRoster();
          await syncRosterToFirestore(fresh);
        }

        if (cloudLogs && cloudLogs.length > 0) {
          setChangelogs(cloudLogs);
          localStorage.setItem('dr_logs', JSON.stringify(cloudLogs));
        }

        if (cloudSettings) {
          if (cloudSettings.minEfetivoPreta) setMinEfetivoPreta(cloudSettings.minEfetivoPreta);
          if (cloudSettings.minEfetivoVermelha) setMinEfetivoVermelha(cloudSettings.minEfetivoVermelha);
        }

        setCloudSyncStatus('synced');
        setLastSyncedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.error('Initial cloud sync error:', err);
        if (isMounted) setCloudSyncStatus('error');
      }
    }

    initFirebaseSync();
    return () => { isMounted = false; };
  }, []);

  // Load state from localStorage if it exists
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasClearedForTest = localStorage.getItem('dr_cleared_for_registration_test_v4');
      if (!hasClearedForTest) {
        localStorage.removeItem('dr_military');
        localStorage.removeItem('dr_absences');
        localStorage.removeItem('dr_roster');
        localStorage.removeItem('dr_logs');
        localStorage.setItem('dr_cleared_for_registration_test_v4', 'true');
        return;
      }

      const savedMilitary = localStorage.getItem('dr_military');
      const savedAbsences = localStorage.getItem('dr_absences');
      const savedRoster = localStorage.getItem('dr_roster');
      const savedLogs = localStorage.getItem('dr_logs');
      const savedMinPreta = localStorage.getItem('dr_min_preta');
      const savedMinVerm = localStorage.getItem('dr_min_verm');

      setTimeout(() => {
        if (savedMilitary) {
          try {
            const parsedMils = JSON.parse(savedMilitary);
            parsedMils.forEach((m: Military) => {
              if (m.specialty === 'Auxiliar do Escritório') m.specialty = 'Auxiliar do Copeiro de Dia';
              if (m.specialtySecondary === 'Auxiliar do Escritório') m.specialtySecondary = undefined;
            });
            setMilitaryList(parsedMils);
          } catch {
            setMilitaryList(initialMilitary);
          }
        }
        if (savedAbsences) setAbsences(JSON.parse(savedAbsences));
        if (savedRoster) {
          try {
            const parsed = JSON.parse(savedRoster);
            const keys = Object.keys(parsed);
            const hasDDMMAAAA = keys.some(k => /^\d{2}\/\d{2}\/\d{4}$/.test(k));
            if (hasDDMMAAAA) {
              Object.keys(parsed).forEach(d => {
                if (parsed[d] && 'Auxiliar do Escritório' in parsed[d]) {
                  delete parsed[d]['Auxiliar do Escritório'];
                }
              });
              setRoster(parsed);
            } else {
              const fresh = createInitialRoster();
              setRoster(fresh);
              localStorage.setItem('dr_roster', JSON.stringify(fresh));
            }
          } catch {
            setRoster(createInitialRoster());
          }
        }
        if (savedLogs) setChangelogs(JSON.parse(savedLogs));
        if (savedMinPreta) setMinEfetivoPreta(Number(savedMinPreta));
        if (savedMinVerm) setMinEfetivoVermelha(Number(savedMinVerm));
      }, 0);
    }
  }, []);

  // Save state helper with automatic Firebase Firestore synchronization
  const saveState = (
    newMil: Military[],
    newAbs: Absence[],
    newRos: WeekRoster,
    newLogs: LogEntry[]
  ) => {
    // 1. Instant local persistence for rapid response
    localStorage.setItem('dr_military', JSON.stringify(newMil));
    localStorage.setItem('dr_absences', JSON.stringify(newAbs));
    localStorage.setItem('dr_roster', JSON.stringify(newRos));
    localStorage.setItem('dr_logs', JSON.stringify(newLogs));

    // 2. Asynchronous background sync to Firebase Firestore
    setCloudSyncStatus('syncing');
    Promise.all([
      syncMilitariesToFirestore(newMil),
      syncAbsencesToFirestore(newAbs),
      syncRosterToFirestore(newRos),
      syncLogsToFirestore(newLogs),
      syncSettingsToFirestore(minEfetivoPreta, minEfetivoVermelha)
    ]).then(() => {
      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }).catch(err => {
      console.error('Firebase autosave error:', err);
      setCloudSyncStatus('error');
    });
  };

  // Manual Firebase Cloud Synchronization
  const handleManualCloudSync = async () => {
    setIsFirebaseLoading(true);
    setCloudSyncStatus('syncing');
    try {
      await Promise.all([
        syncMilitariesToFirestore(militaryList),
        syncAbsencesToFirestore(absences),
        syncRosterToFirestore(roster),
        syncLogsToFirestore(changelogs),
        syncSettingsToFirestore(minEfetivoPreta, minEfetivoVermelha)
      ]);
      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      showToast('Dados sincronizados com o Firebase Firestore!', 'success');
    } catch (err) {
      console.error('Manual sync error:', err);
      setCloudSyncStatus('error');
      showToast('Erro ao sincronizar com o Firebase.', 'info');
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      if (user) {
        showToast(`Conectado ao Firebase como ${user.displayName || user.email}!`, 'success');
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast('Falha na autenticação Google.', 'info');
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await logoutUser();
      showToast('Sessão desconectada do Firebase.', 'info');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000);
  };

  const formatTimeNow = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const addLog = (text: string, currentLogsList?: LogEntry[]) => {
    const newEntry: LogEntry = { time: formatTimeNow(), text };
    const updated = [newEntry, ...(currentLogsList || changelogs)];
    setChangelogs(updated);
    return updated;
  };

  // ==========================================
  // LOGIC & ALGORITHMS
  // ==========================================

  // Auto-generate roster algorithm based on rest intervals, fairness, and specialty
  const handleAutoGenerate = () => {
    // Deep clone roster and military list
    const updatedRoster: WeekRoster = JSON.parse(JSON.stringify(roster));
    const updatedMilList = militaryList.map(m => ({ ...m }));
    let logsList = [...changelogs];

    // Work on daysToShow if available, otherwise on all keys
    const targetDays = daysToShow.length > 0 ? daysToShow : Object.keys(updatedRoster);
    let assignedCount = 0;

    // Ensure slot structure exists for all target days
    targetDays.forEach(day => {
      if (!updatedRoster[day]) {
        updatedRoster[day] = {
          'Cozinheiro de Dia': null,
          'Copeiro de Dia': null,
          'Auxiliar do Copeiro de Dia': null,
          'Ceia de Dia': null
        };
      }
    });

    // Track when each military last served (day index) to respect rest (folga)
    const lastDayServed: Record<string, number> = {};

    // Scan existing assignments across entire roster
    Object.keys(updatedRoster).forEach((day, dayIdx) => {
      Object.values(updatedRoster[day]).forEach(cell => {
        if (cell && cell.militaryId && cell.type !== 'DISP') {
          lastDayServed[cell.militaryId] = dayIdx;
        }
      });
    });

    targetDays.forEach((day, dayIdx) => {
      const isWeekend = isDayWeekend(day);
      // Ensure Cozinheiro, Copeiro, Aux. Copeiro are assigned first so Ceia de Dia can choose from Copeiro/Auxiliar of the day
      const posts = ['Cozinheiro de Dia', 'Copeiro de Dia', 'Auxiliar do Copeiro de Dia', 'Ceia de Dia'];

      posts.forEach(post => {
        // If cell is already filled, skip
        if (updatedRoster[day][post] !== null) return;

        let eligible: Military[] = [];

        // Special rule for 'Ceia de Dia':
        // Pode ser escolhido tanto o copeiro ou o auxiliar já escalado para aquele dia
        if (post === 'Ceia de Dia') {
          const copeiroMilId = updatedRoster[day]['Copeiro de Dia']?.militaryId;
          const auxMilId = updatedRoster[day]['Auxiliar do Copeiro de Dia']?.militaryId;

          const dayStaffCandidates = updatedMilList.filter(mil => {
            if (mil.id !== copeiroMilId && mil.id !== auxMilId) return false;
            if (mil.status === 'Afastado') return false;
            const hasAbsenceToday = absences.some(abs => 
              abs.militaryId === mil.id && 
              abs.status === 'ATIVO' && 
              isDayInAbsence(day, abs)
            );
            return !hasAbsenceToday;
          });

          if (dayStaffCandidates.length > 0) {
            // Sort by duty equity and hierarchy
            dayStaffCandidates.sort((a, b) => {
              if (a.dutyCount !== b.dutyCount) return a.dutyCount - b.dutyCount;
              return compareMilitaryHierarchy(a, b);
            });
            eligible = dayStaffCandidates;
          }
        }

        // Standard selection if not Ceia de Dia or if no day-assigned staff was available
        if (eligible.length === 0) {
          eligible = updatedMilList.filter(mil => {
            // Check if military has an active absence on this specific day
            const hasAbsenceToday = absences.some(abs => 
              abs.militaryId === mil.id && 
              abs.status === 'ATIVO' && 
              isDayInAbsence(day, abs)
            );
            if (hasAbsenceToday) return false;

            // Status check
            if (mil.status === 'Afastado') {
              const hasAnyAbsence = absences.some(abs => abs.militaryId === mil.id);
              if (!hasAnyAbsence) return false;
            }

            // Type matching
            if (isWeekend) {
              if (mil.type !== 'EV' && mil.type !== 'Ambas') return false;
            } else {
              if (mil.type !== 'EP' && mil.type !== 'Ambas') return false;
            }

            // Matching primary or secondary specialty
            const hasMatchingSpecialty = mil.specialty === post || mil.specialtySecondary === post ||
              (post === 'Ceia de Dia' && (mil.specialty === 'Copeiro de Dia' || mil.specialty === 'Auxiliar do Copeiro de Dia' || mil.specialtySecondary === 'Copeiro de Dia' || mil.specialtySecondary === 'Auxiliar do Copeiro de Dia'));
            if (!hasMatchingSpecialty) return false;

            // Check if military was already assigned on this day (unless allowed overlap with Ceia)
            const assignedOnDay = Object.keys(updatedRoster[day]).some(
              otherPost => otherPost !== post &&
                           updatedRoster[day][otherPost]?.militaryId === mil.id &&
                           !isAllowedOverlap(post, otherPost)
            );
            if (assignedOnDay) return false;

            return true;
          });

          // Sort candidates by rest interval, dutyCount equity, and hierarchy
          eligible.sort((a, b) => {
            const lastA = lastDayServed[a.id] !== undefined ? lastDayServed[a.id] : -999;
            const lastB = lastDayServed[b.id] !== undefined ? lastDayServed[b.id] : -999;
            
            const servedYesterdayA = (dayIdx - lastA) === 1 ? 1 : 0;
            const servedYesterdayB = (dayIdx - lastB) === 1 ? 1 : 0;

            // Strongly avoid consecutive duty shifts
            if (servedYesterdayA !== servedYesterdayB) {
              return servedYesterdayA - servedYesterdayB;
            }

            // Equity by accumulated duties
            if (a.dutyCount !== b.dutyCount) {
              return a.dutyCount - b.dutyCount;
            }

            // Prefer longer rest interval
            const restA = dayIdx - lastA;
            const restB = dayIdx - lastB;
            if (restA !== restB) {
              return restB - restA;
            }

            return compareMilitaryHierarchy(a, b);
          });
        }

        if (eligible.length === 0) return;

        const chosen = eligible[0];

        // Assign choosing
        updatedRoster[day][post] = {
          militaryId: chosen.id,
          militaryName: chosen.name.toUpperCase(),
          rank: chosen.rank,
          type: isWeekend ? 'EV' : 'EP'
        };

        lastDayServed[chosen.id] = dayIdx;

        // Increment duty count
        const milIdx = updatedMilList.findIndex(m => m.id === chosen.id);
        if (milIdx !== -1) {
          updatedMilList[milIdx].dutyCount += 1;
        }

        assignedCount++;
      });
    });

    if (assignedCount > 0) {
      setRoster(updatedRoster);
      setMilitaryList(updatedMilList);
      logsList = addLog(`Escala preenchida automaticamente: ${assignedCount} postos alocados com respeito a folgas e equidade.`, logsList);
      saveState(updatedMilList, absences, updatedRoster, logsList);
      showToast(`${assignedCount} escalas geradas com sucesso!`, 'success');
    } else {
      showToast('Nenhum posto vago elegível encontrado para preenchimento.', 'info');
    }
  };

  // Assign specific military manually
  const handleAssignMilitary = (milId: string | 'empty') => {
    if (!selectedCell) return;
    const { day, post } = selectedCell;

    const updatedRoster: WeekRoster = JSON.parse(JSON.stringify(roster));
    if (!updatedRoster[day]) {
      updatedRoster[day] = {
        'Cozinheiro de Dia': null,
        'Copeiro de Dia': null,
        'Auxiliar do Copeiro de Dia': null,
        'Ceia de Dia': null
      };
    }
    const updatedMilList = militaryList.map(m => ({ ...m }));
    let logsList = [...changelogs];

    if (milId !== 'empty') {
      const isAlreadyAssignedElsewhere = Object.keys(updatedRoster[day]).some(
        otherPost => otherPost !== post &&
                     updatedRoster[day][otherPost]?.militaryId === milId &&
                     !isAllowedOverlap(post, otherPost)
      );
      if (isAlreadyAssignedElsewhere) {
        showToast('Militar já está escalado em outra função hoje!', 'info');
        return;
      }
    }

    const prevCell = updatedRoster[day][post];

    // Decrement previous duty count if previous assignment was an active duty (not DISP)
    if (prevCell && prevCell.militaryId && prevCell.type !== 'DISP') {
      const idx = updatedMilList.findIndex(m => m.id === prevCell.militaryId);
      if (idx !== -1) {
        updatedMilList[idx].dutyCount = Math.max(0, updatedMilList[idx].dutyCount - 1);
      }
    }

    if (milId === 'empty') {
      updatedRoster[day][post] = null;
      logsList = addLog(`Posto ${getSpecialtyDisplayName(post)} na ${day} foi desmarcado.`, logsList);
    } else {
      const mil = updatedMilList.find(m => m.id === milId);
      if (mil) {
        const isWeekend = isDayWeekend(day);
        const finalType = selectedAssignType === 'PERM' || selectedAssignType === 'DISP'
          ? selectedAssignType
          : (isWeekend ? 'EV' : 'EP');

        updatedRoster[day][post] = {
          militaryId: mil.id,
          militaryName: mil.name.toUpperCase(),
          rank: mil.rank,
          type: finalType
        };

        // Increment duty count if not a Dispensa (DISP)
        if (finalType !== 'DISP') {
          const idx = updatedMilList.findIndex(m => m.id === milId);
          if (idx !== -1) {
            updatedMilList[idx].dutyCount += 1;
          }
        }

        const typeLabel = finalType === 'EP' ? 'Escala Preta' : finalType === 'EV' ? 'Escala Vermelha' : finalType === 'PERM' ? 'Permuta' : 'Dispensa (LTS)';
        logsList = addLog(`${mil.rank}. ${mil.name} escalado (${typeLabel}) para ${getSpecialtyDisplayName(post)} na ${day}.`, logsList);
      }
    }

    setRoster(updatedRoster);
    setMilitaryList(updatedMilList);
    saveState(updatedMilList, absences, updatedRoster, logsList);
    setIsAssigning(false);
    setSelectedCell(null);
    showToast('Escala atualizada com sucesso!');
  };

  const handleClearRoster = () => {
    const emptyRoster = createEmptyRoster(Object.keys(roster));
    const resetMilList = militaryList.map(mil => ({ ...mil, dutyCount: 0 }));
    const resetLogs = addLog('Escala e contagem de serviços foram zeradas completamente pelo usuário.', []);
    setRoster(emptyRoster);
    setMilitaryList(resetMilList);
    saveState(resetMilList, absences, emptyRoster, resetLogs);
    showToast('A escala e todas as contagens foram zeradas!', 'success');
  };

  // CRUD: Add new military personnel
  const handleAddMilitary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilName || !newMilFullName || !newMilMatricula) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'info');
      return;
    }

    const newMil: Military = {
      id: generateUniqueRecordId('mil'),
      rank: newMilRank,
      name: newMilName,
      fullName: newMilFullName,
      matricula: newMilMatricula,
      specialty: newMilSpecialty,
      specialtySecondary: newMilSpecialtySecondary === 'Nenhuma' ? undefined : newMilSpecialtySecondary,
      status: newMilStatus,
      type: newMilScaleType,
      dutyCount: Number(newMilDutyCount) || 0
    };

    const updated = [newMil, ...militaryList];
    let logsList = addLog(`Novo militar cadastrado: ${newMil.rank}. ${newMil.name} (${newMil.specialty}).`);
    setMilitaryList(updated);
    saveState(updated, absences, roster, logsList);
    setIsAddingMil(false);
    
    // Reset Form
    setNewMilName('');
    setNewMilFullName('');
    setNewMilMatricula('');
    setNewMilDutyCount(0);
    showToast(`Militar ${newMil.rank}. ${newMil.name} cadastrado com sucesso!`);
  };

  // CRUD: Delete military personnel and clean up rosters
  const handleDeleteMilitary = (id: string) => {
    const target = militaryList.find(m => m.id === id);
    if (!target) return;

    if (window.confirm(`Tem certeza que deseja excluir o militar ${target.rank}. ${target.name}?`)) {
      const updatedMil = militaryList.filter(m => m.id !== id);
      const updatedAbs = absences.filter(a => a.militaryId !== id);

      // Clean slots in roster
      const updatedRoster: WeekRoster = JSON.parse(JSON.stringify(roster));
      Object.keys(updatedRoster).forEach(day => {
        Object.keys(updatedRoster[day]).forEach(post => {
          const cell = updatedRoster[day][post];
          if (cell && cell.militaryId === id) {
            updatedRoster[day][post] = null;
          }
        });
      });

      let logsList = addLog(`Militar excluído do sistema: ${target.rank}. ${target.name}.`);
      setMilitaryList(updatedMil);
      setAbsences(updatedAbs);
      setRoster(updatedRoster);
      saveState(updatedMil, updatedAbs, updatedRoster, logsList);
      showToast(`Militar ${target.name} removido com sucesso.`);
    }
  };

  // CRUD: Save edit of military personnel
  const handleSaveEditMilitary = (mil: Military) => {
    const updated = militaryList.map(m => m.id === mil.id ? mil : m);
    
    // Also synchronize any cells in roster that reference this military
    const updatedRoster: WeekRoster = JSON.parse(JSON.stringify(roster));
    Object.keys(updatedRoster).forEach(day => {
      Object.keys(updatedRoster[day]).forEach(post => {
        const cell = updatedRoster[day][post];
        if (cell && cell.militaryId === mil.id) {
          cell.militaryName = mil.name.toUpperCase();
          cell.rank = mil.rank;
        }
      });
    });

    setMilitaryList(updated);
    setRoster(updatedRoster);
    let logsList = addLog(`Cadastro do militar ${mil.rank}. ${mil.name} atualizado.`);
    saveState(updated, absences, updatedRoster, logsList);
    setEditingMil(null);
    showToast('Dados atualizados com sucesso!');
  };

  // Reset database to initial mock data
  const handleResetDatabase = () => {
    if (window.confirm('Atenção: Isso redefinirá todos os dados (Militares, Escalas, Afastamentos) para os valores iniciais de fábrica. Deseja prosseguir?')) {
      localStorage.removeItem('dr_military');
      localStorage.removeItem('dr_absences');
      localStorage.removeItem('dr_roster');
      localStorage.removeItem('dr_logs');
      localStorage.removeItem('dr_min_preta');
      localStorage.removeItem('dr_min_verm');
      
      setMilitaryList(initialMilitary);
      setAbsences(initialAbsences);
      const freshRoster = createInitialRoster();
      setRoster(freshRoster);
      setSelectedWeekMonday(getMondayOfWeek(new Date()));
      setChangelogs(initialLogs);
      setMinEfetivoPreta(12);
      setMinEfetivoVermelha(14);
      
      showToast('Banco de dados redefinido com sucesso!');
    }
  };

  // Register a personnel absence
  const handleRegisterAbsence = (e: React.FormEvent) => {
    e.preventDefault();

    if (!absentMilId) {
      showToast('Por favor, selecione um militar.', 'info');
      return;
    }

    const mil = militaryList.find(m => m.id === absentMilId);
    if (!mil) return;

    const todayIso = formatDateISO(new Date());
    const sDate = absenceStart || todayIso;
    const eDate = absenceIndefinite ? 'Indefinido' : (absenceEnd || todayIso);

    const newAbsence: Absence = {
      id: generateUniqueRecordId('afast'),
      militaryId: mil.id,
      militaryName: mil.name,
      rank: mil.rank,
      type: absenceType,
      startDate: sDate,
      endDate: eDate,
      indefinite: absenceIndefinite,
      notes: absenceNotes,
      autoUpdate: absenceAutoUpdate,
      status: 'ATIVO'
    };

    const updatedAbsences = [newAbsence, ...absences];
    const updatedMilList = militaryList.map(m => ({ ...m }));
    const updatedRoster: WeekRoster = JSON.parse(JSON.stringify(roster));

    // Mark military as Afastado
    const milIdx = updatedMilList.findIndex(m => m.id === mil.id);
    if (milIdx !== -1) {
      updatedMilList[milIdx].status = 'Afastado';
    }

    // Auto update roster if checked: replace active slots during absence period with "Dispensa"
    let shiftsSubstituted = 0;
    if (absenceAutoUpdate) {
      Object.keys(updatedRoster).forEach(day => {
        if (isDayInAbsence(day, newAbsence)) {
          Object.keys(updatedRoster[day]).forEach(post => {
            const cell = updatedRoster[day][post];
            if (cell && cell.militaryId === mil.id && cell.type !== 'DISP') {
              updatedRoster[day][post] = {
                militaryId: mil.id,
                militaryName: `${mil.rank}. ${mil.name.toUpperCase()}`,
                rank: mil.rank,
                type: 'DISP'
              };
              shiftsSubstituted++;
            }
          });
        }
      });

      // Decrement duty count for shifts that became dispensas
      if (shiftsSubstituted > 0 && milIdx !== -1) {
        updatedMilList[milIdx].dutyCount = Math.max(0, updatedMilList[milIdx].dutyCount - shiftsSubstituted);
      }
    }

    let logsList = addLog(`Registrado afastamento de ${mil.rank}. ${mil.name} (${absenceType})${shiftsSubstituted > 0 ? `. ${shiftsSubstituted} serviço(s) marcados como dispensa.` : '.'}`);

    setAbsences(updatedAbsences);
    setMilitaryList(updatedMilList);
    setRoster(updatedRoster);
    saveState(updatedMilList, updatedAbsences, updatedRoster, logsList);

    // Reset Form
    setAbsentMilId('');
    setAbsenceNotes('');
    setAbsenceStart('');
    setAbsenceEnd('');
    setAbsenceIndefinite(false);
    showToast(`Afastamento de ${mil.rank}. ${mil.name} registrado com sucesso!`);
  };

  // Terminate a leave early
  const handleEndAbsence = (id: string) => {
    const abs = absences.find(a => a.id === id);
    if (!abs) return;

    const updatedAbsences = absences.filter(a => a.id !== id);
    const updatedMilList = militaryList.map(m => ({ ...m }));

    // Set military back to Ativo if no other active absences
    const otherActive = updatedAbsences.some(a => a.militaryId === abs.militaryId && a.status === 'ATIVO');
    const milIdx = updatedMilList.findIndex(m => m.id === abs.militaryId);
    if (milIdx !== -1 && !otherActive) {
      updatedMilList[milIdx].status = 'Ativo';
    }

    // Clean dispensa entries in roster so they become vacant slots ready to be filled
    const updatedRoster: WeekRoster = JSON.parse(JSON.stringify(roster));
    Object.keys(updatedRoster).forEach(day => {
      Object.keys(updatedRoster[day]).forEach(post => {
        const cell = updatedRoster[day][post];
        if (cell && cell.militaryId === abs.militaryId && cell.type === 'DISP') {
          updatedRoster[day][post] = null;
        }
      });
    });

    let logsList = addLog(`Retorno de afastamento homologado para ${abs.rank}. ${abs.militaryName}. Postos vagos liberados.`);

    setAbsences(updatedAbsences);
    setMilitaryList(updatedMilList);
    setRoster(updatedRoster);
    saveState(updatedMilList, updatedAbsences, updatedRoster, logsList);
    showToast(`Militar ${abs.rank}. ${abs.militaryName} retornou ao serviço ativo.`);
  };

  // Toggle military specialties
  const handleToggleSpecialty = (milId: string, spec: string) => {
    const updatedMilList = [...militaryList];
    const idx = updatedMilList.findIndex(m => m.id === milId);
    if (idx !== -1) {
      updatedMilList[idx].specialty = spec;
      setMilitaryList(updatedMilList);
      saveState(updatedMilList, absences, roster, changelogs);
      showToast(`Especialidade atualizada para ${updatedMilList[idx].rank}. ${updatedMilList[idx].name}`);
    }
  };

  // Download Report Mock File
  const triggerReportDownload = () => {
    showToast('Iniciando compilação do documento...', 'info');

    setTimeout(() => {
      if (reportFormat === 'PDF') {
        const doc = new jsPDF();
        
        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('DOCUMENTO OFICIAL MILITAR', 105, 15, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(15, 18, 195, 18);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('UNIDADE MILITAR: Setor de Aprovisionamento - H Ge SM', 15, 25);
        doc.text(`DATA DE EMISSÃO: ${new Date().toLocaleDateString()}`, 15, 30);
        
        doc.setFont('helvetica', 'bold');
        let title = '';
        if (selectedReportType === 'weekly') {
          title = `ESCALA DE SERVIÇO SEMANAL (${formatDateDDMMAAAA(new Date())})`;
        } else if (selectedReportType === 'individual') {
          title = 'EXTRATO DE ESCALA INDIVIDUAL';
        } else if (selectedReportType === 'monthly') {
          title = 'CONSOLIDAÇÃO OPERACIONAL MENSAL';
        } else if (selectedReportType === 'equity') {
          title = 'RELATÓRIO DE DISTRIBUIÇÃO E EQUIDADE';
        }
        doc.text(title, 105, 42, { align: 'center' });
        doc.line(15, 45, 195, 45);
        
        // Content
        let y = 55;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        if (selectedReportType === 'weekly') {
          Object.keys(roster).forEach(day => {
            if (y > 250) {
              doc.addPage();
              y = 20;
            }
            doc.setFont('helvetica', 'bold');
            doc.text(`Data: ${day} (${getDayWeekdayLong(day)})`, 15, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            Object.keys(roster[day]).forEach(post => {
              const cell = roster[day][post];
              const text = `  - ${getSpecialtyDisplayName(post)}: ${cell ? `${cell.rank}. ${cell.militaryName} (${cell.type})` : 'VAGO'}`;
              doc.text(text, 15, y);
              y += 5;
            });
            y += 4;
          });
        } else if (selectedReportType === 'individual') {
          const selectedMil = militaryList.find(m => m.id === reportMilId) || militaryList[0];
          doc.text(`Militar: ${selectedMil.rank}. ${selectedMil.fullName}`, 15, y); y += 6;
          doc.text(`Antiguidade (Matrícula): ${selectedMil.matricula}`, 15, y); y += 6;
          doc.text(`Especialidade Primária: ${getSpecialtyDisplayName(selectedMil.specialty)}`, 15, y); y += 6;
          if (selectedMil.specialtySecondary) {
            doc.text(`Especialidade Secundária: ${getSpecialtyDisplayName(selectedMil.specialtySecondary)}`, 15, y); y += 6;
          }
          doc.text(`Total de Serviços Acumulados: ${selectedMil.dutyCount}`, 15, y); y += 6;
          doc.text(`Status de Saúde: ${selectedMil.status}`, 15, y); y += 6;
          
          y += 5;
          doc.setFont('helvetica', 'bold');
          doc.text('Histórico Recente de Alocações:', 15, y); y += 6;
          doc.setFont('helvetica', 'normal');

          const milAssignments: { day: string; post: string; type: string }[] = [];
          Object.keys(roster).forEach(day => {
            Object.keys(roster[day]).forEach(post => {
              const cell = roster[day][post];
              if (cell && cell.militaryId === selectedMil.id) {
                milAssignments.push({ day, post, type: cell.type });
              }
            });
          });

          if (milAssignments.length === 0) {
            doc.text('- Nenhuma escala registrada para este militar no período.', 15, y); y += 5;
          } else {
            milAssignments.forEach(item => {
              const typeLabel = item.type === 'EP' ? 'PRETA' : item.type === 'EV' ? 'VERMELHA' : item.type === 'PERM' ? 'PERMUTA' : 'DISPENSA';
              doc.text(`- ${item.day}: ${getSpecialtyDisplayName(item.post)} [${typeLabel}]`, 15, y);
              y += 5;
            });
          }
        } else if (selectedReportType === 'monthly') {
          doc.text(`Total de Militares Cadastrados: ${militaryList.length}`, 15, y); y += 6;
          doc.text(`Militares Afastados Hoje: ${absences.filter(a => a.status === 'ATIVO').length}`, 15, y); y += 6;
          doc.text(`Aproveitamento / Cobertura: ${complianceRate}%`, 15, y); y += 10;
          
          doc.setFont('helvetica', 'bold');
          doc.text('Estatísticas por Função:', 15, y); y += 6;
          doc.setFont('helvetica', 'normal');
          ['Cozinheiro de Dia', 'Copeiro de Dia', 'Auxiliar do Copeiro de Dia', 'Ceia de Dia'].forEach(spec => {
            const count = Object.values(roster).flatMap(d => Object.entries(d)).filter(([p, cell]) => p === spec && cell !== null && cell.type !== 'DISP').length;
            const totalDays = Object.keys(roster).length;
            const pct = totalDays > 0 ? Math.round((count / totalDays) * 100) : 0;
            doc.text(`- ${getSpecialtyDisplayName(spec)}: ${count} serviços atendidos (Aproveitamento: ${pct}%)`, 15, y);
            y += 5;
          });
        } else {
          doc.text(`Total de Militares Cadastrados: ${militaryList.length}`, 15, y); y += 6;
          doc.text(`Militares Afastados Hoje: ${absences.filter(a => a.status === 'ATIVO').length}`, 15, y); y += 10;
          doc.setFont('helvetica', 'bold');
          doc.text('Militar / Serviços Totais / Status de Equidade:', 15, y); y += 6;
          doc.setFont('helvetica', 'normal');
          
          const sorted = [...militaryList].sort(compareMilitaryHierarchy);
          const totalDuties = sorted.reduce((acc, m) => acc + m.dutyCount, 0);
          const avgDuties = sorted.length > 0 ? (totalDuties / sorted.length) : 0;

          sorted.slice(0, 15).forEach(mil => {
            const diff = mil.dutyCount - avgDuties;
            const statusLabel = Math.abs(diff) <= 1 ? 'ESTÁVEL' : diff > 1 ? `ACIMA DA MÉDIA (+${diff.toFixed(1)})` : `ABAIXO DA MÉDIA (${diff.toFixed(1)})`;
            doc.text(`- ${mil.rank}. ${mil.fullName}: ${mil.dutyCount} serviços (Status: ${statusLabel})`, 15, y);
            y += 5;
          });
        }

        // PDF Footer without Signatures
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('Documento gerado automaticamente pelo sistema de Escalas - Aprov H Ge SM.', 15, 285);
        
        doc.save(`Relatorio_${selectedReportType}.pdf`);
      } else {
        // Structured CSV output compatible with Excel (UTF-8 with BOM and semicolons)
        let csvContent = '\uFEFF';
        if (selectedReportType === 'weekly') {
          csvContent += 'Data;Função;Posto / Militar;Graduação;Tipo de Escala\n';
          Object.keys(roster).forEach(day => {
            Object.keys(roster[day]).forEach(post => {
              const cell = roster[day][post];
              if (cell) {
                csvContent += `"${day}";"${getSpecialtyDisplayName(post)}";"${cell.militaryName}";"${cell.rank}";"${cell.type}"\n`;
              } else {
                csvContent += `"${day}";"${getSpecialtyDisplayName(post)}";"VAGO";"-";"-"\n`;
              }
            });
          });
        } else if (selectedReportType === 'individual') {
          const selectedMil = militaryList.find(m => m.id === reportMilId) || militaryList[0];
          csvContent += `Extrato de Escala Individual - ${selectedMil.rank}. ${selectedMil.fullName}\n`;
          csvContent += `Matrícula;${selectedMil.matricula}\n`;
          csvContent += `Especialidade;${getSpecialtyDisplayName(selectedMil.specialty)}\n`;
          csvContent += `Serviços Acumulados;${selectedMil.dutyCount}\n\n`;
          csvContent += 'Dia;Função;Tipo de Escala\n';
          Object.keys(roster).forEach(day => {
            Object.keys(roster[day]).forEach(post => {
              const cell = roster[day][post];
              if (cell && cell.militaryId === selectedMil.id) {
                csvContent += `"${day}";"${getSpecialtyDisplayName(post)}";"${cell.type}"\n`;
              }
            });
          });
        } else if (selectedReportType === 'monthly') {
          csvContent += 'Especialidade;Serviços Atendidos;Aproveitamento\n';
          ['Cozinheiro de Dia', 'Copeiro de Dia', 'Auxiliar do Copeiro de Dia', 'Ceia de Dia'].forEach(spec => {
            const count = Object.values(roster).flatMap(d => Object.entries(d)).filter(([p, cell]) => p === spec && cell !== null && cell.type !== 'DISP').length;
            const totalDays = Object.keys(roster).length;
            const pct = totalDays > 0 ? Math.round((count / totalDays) * 100) : 0;
            csvContent += `"${getSpecialtyDisplayName(spec)}";${count};${pct}%\n`;
          });
        } else {
          csvContent += 'Graduação;Nome Completo;Matrícula;Especialidade;Serviços Acumulados;Status\n';
          const sorted = [...militaryList].sort(compareMilitaryHierarchy);
          sorted.forEach(mil => {
            csvContent += `"${mil.rank}";"${mil.fullName}";"${mil.matricula}";"${getSpecialtyDisplayName(mil.specialty)}";${mil.dutyCount};"${mil.status}"\n`;
          });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Escala_${selectedReportType}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      showToast('Relatório gerado e baixado com sucesso!');
    }, 1500);
  };

  // ==========================================
  // CALCULATED METRICS FOR FOOTER & CARDS
  // ==========================================
  const totalOnShift = Object.values(roster)
    .flatMap(dayObj => Object.values(dayObj))
    .filter(cell => cell !== null && cell.type !== 'DISP')
    .reduce((acc, cell) => {
      if (cell) acc.add(cell.militaryId);
      return acc;
    }, new Set<string>()).size;

  const totalMedicalAway = absences.filter(a => a.type.includes('LTS') || a.type.includes('Atestado')).length;
  const pendingSwaps = Object.values(roster)
    .flatMap(dayObj => Object.values(dayObj))
    .filter(cell => cell && cell.type === 'PERM').length;

  const totalPossibleSlots = Object.values(roster)
    .flatMap(dayObj => Object.keys(dayObj)).length;
  const filledSlots = Object.values(roster)
    .flatMap(dayObj => Object.values(dayObj))
    .filter(cell => cell !== null).length;
  const complianceRate = totalPossibleSlots > 0 ? Math.round((filledSlots / totalPossibleSlots) * 100) : 100;

  const currentWeekDates = getWeekDates(selectedWeekMonday);

  // Filter roster for display on Dashboard based on current week and view options
  let baseDays: string[] = [];
  if (viewOption === 'Semanal') {
    baseDays = currentWeekDates;
  } else if (viewOption === 'Quinzenal') {
    const nextMonday = new Date(selectedWeekMonday);
    nextMonday.setDate(selectedWeekMonday.getDate() + 7);
    baseDays = [...currentWeekDates, ...getWeekDates(nextMonday)];
  } else if (viewOption === 'Mensal') {
    const refDate = new Date(selectedWeekMonday);
    baseDays = getDaysInMonth(refDate.getFullYear(), refDate.getMonth());
  } else if (viewOption === 'Personalizado') {
    const s = parseDateAny(startDateFilter);
    const e = parseDateAny(endDateFilter);
    if (s && e) {
      const list: string[] = [];
      const cur = new Date(Math.min(s.getTime(), e.getTime()));
      const max = new Date(Math.max(s.getTime(), e.getTime()));
      while (cur <= max && list.length < 60) {
        list.push(formatDateDDMMAAAA(cur));
        cur.setDate(cur.getDate() + 1);
      }
      baseDays = list;
    } else {
      baseDays = currentWeekDates;
    }
  }

  const daysToShow = baseDays.filter(day => {
    const isWeekend = isDayWeekend(day);
    if (filterScaleType === 'Preta' && isWeekend) return false;
    if (filterScaleType === 'Vermelha' && !isWeekend) return false;
    return true;
  });

  return (
    <div className="flex h-screen w-full bg-[#050814] overflow-hidden text-slate-100 relative font-sans glass-container">
      {/* Background ambient refraction glows */}
      <div className="liquid-glow-3" />
      <div className="liquid-glow-4" />
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-slate-700/50"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-sm font-medium">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SideNavBar */}
      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 w-[260px] bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col z-40 transition-transform duration-300 transform md:transform-none shrink-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-0 -translate-x-full md:translate-x-0"
      )}>
        <div className="px-6 py-8 border-b border-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600 rounded text-white font-bold tracking-wider">ES</span>
            <h1 className="font-bold text-lg tracking-tight text-white">Escalas - Aprov H Ge SM</h1>
          </div>
          <button className="md:hidden p-1 hover:bg-slate-900 rounded" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logged User Info */}
        <div className="px-4 py-6 border-b border-slate-900">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/40 space-y-2">
            <div className="flex items-center gap-3">
              {currentUser?.photoURL ? (
                <Image 
                  src={currentUser.photoURL} 
                  alt="Avatar" 
                  width={40}
                  height={40}
                  unoptimized
                  className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-900/40 flex items-center justify-center text-blue-300 border border-blue-700/50 font-bold text-xs">
                  {currentUser?.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'SM'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-white truncate">
                  {currentUser?.displayName || 'Sgt. Marco'}
                </p>
                <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider truncate">
                  {currentUser?.email || 'aprov1hgesm@gmail.com'}
                </p>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between border-t border-slate-800/60 text-[10px]">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  cloudSyncStatus === 'synced' ? "bg-emerald-400" : cloudSyncStatus === 'syncing' ? "bg-amber-400 animate-ping" : "bg-blue-400"
                )} />
                {cloudSyncStatus === 'syncing' ? 'Sincronizando...' : 'Firebase Conectado'}
              </span>
              {currentUser ? (
                <button 
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-rose-400 font-medium transition-colors"
                >
                  Sair
                </button>
              ) : (
                <button 
                  onClick={handleGoogleLogin}
                  className="text-blue-400 hover:text-blue-300 font-bold transition-colors"
                >
                  Login Google
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Modules */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <button 
            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left",
              activeTab === 'dashboard' ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-semibold bg-slate-900" : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>Gestão de Escalas</span>
          </button>

          <button 
            onClick={() => { setActiveTab('efetivo'); setSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left",
              activeTab === 'efetivo' ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-semibold bg-slate-900" : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
            )}
          >
            <UserCheck className="w-4 h-4" />
            <span>Gerenciar Efetivo</span>
          </button>

          <button 
            onClick={() => { setActiveTab('afastamentos'); setSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left",
              activeTab === 'afastamentos' ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-semibold bg-slate-900" : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
            )}
          >
            <UserX className="w-4 h-4" />
            <span>Afastamentos</span>
          </button>

          <button 
            onClick={() => { setActiveTab('pdf'); setSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left",
              activeTab === 'pdf' ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-semibold bg-slate-900" : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>Relatórios PDF</span>
          </button>
        </nav>

        {/* Global Action Trigger Button */}
        <div className="px-4 py-6 border-t border-slate-900 space-y-3">
          <button 
            onClick={handleAutoGenerate}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-500 active:scale-[0.98] transition-all shadow-lg shadow-blue-950/40 flex items-center justify-center gap-2 text-sm"
          >
            <Sliders className="w-4 h-4 animate-spin-slow" />
            <span>Gerar Escala</span>
          </button>

          <button 
            onClick={handleClearRoster}
            className="w-full py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-semibold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm bg-white/50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Zerar Escala</span>
          </button>

          <div className="pt-2 flex flex-col gap-1">
            <button className="flex items-center gap-3 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <HelpCircle className="w-4 h-4" />
              <span>Ajuda</span>
            </button>
            <button className="flex items-center gap-3 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent z-10">
        
        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-35 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Top Sticky Header */}
        <header className="h-16 w-full bg-white border-b border-slate-200/80 px-6 flex justify-between items-center shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Context Header Title */}
            <h2 className="font-bold text-slate-800 text-lg hidden sm:block">
              {activeTab === 'dashboard' && (gestaoSubTab === 'quadro' ? 'Gestão de Escalas — Quadro Geral' : gestaoSubTab === 'preta' ? 'Gestão de Escalas — Escala Preta' : 'Gestão de Escalas — Escala Vermelha')}
              {activeTab === 'efetivo' && 'Gerenciamento do Efetivo Militar'}
              {activeTab === 'afastamentos' && 'Gestão de Afastamentos'}
              {activeTab === 'pdf' && 'Geração de Documentos e Relatórios'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Search military bar */}
            <div className="relative max-w-xs hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Pesquisar militar..." 
                value={filterMilitaryName}
                onChange={e => setFilterMilitaryName(e.target.value)}
                className="w-52 pl-9 pr-4 py-1.5 bg-slate-100 rounded-full border-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-700"
              />
            </div>

            {/* Cloud Sync Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-full text-xs transition-colors">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  cloudSyncStatus === 'synced' ? "bg-emerald-500" :
                  cloudSyncStatus === 'syncing' ? "bg-amber-500 animate-pulse" :
                  cloudSyncStatus === 'error' ? "bg-rose-500" : "bg-blue-500"
                )} />
                <span className="font-semibold text-slate-700 text-[11px]">
                  {cloudSyncStatus === 'syncing' ? 'Sincronizando Nuvem...' :
                   cloudSyncStatus === 'synced' ? (lastSyncedAt ? `Nuvem Ok (${lastSyncedAt})` : 'Nuvem Firebase Ativa') :
                   cloudSyncStatus === 'error' ? 'Erro de Sincronia' : 'Firebase Pronto'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleManualCloudSync}
                disabled={isFirebaseLoading}
                title="Sincronizar agora com Firebase Firestore"
                className="text-slate-500 hover:text-blue-600 disabled:opacity-50 transition-colors ml-1 p-0.5"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isFirebaseLoading && "animate-spin text-blue-600")} />
              </button>
            </div>

            {/* Google Authentication Trigger */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-1">
                {currentUser.photoURL ? (
                  <Image 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'Usuário'} 
                    width={32}
                    height={32}
                    unoptimized
                    className="w-8 h-8 rounded-full border border-blue-200 object-cover"
                    title={currentUser.email || ''}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div 
                    className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs"
                    title={currentUser.email || ''}
                  >
                    {currentUser.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'US'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Desconectar do Firebase"
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold transition-all shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar (Google)</span>
              </button>
            )}

            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>

            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: GESTÃO DE ESCALAS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Sub-Tabs: Quadro Geral | Escala Preta | Escala Vermelha */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-2xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setGestaoSubTab('quadro')}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all",
                      gestaoSubTab === 'quadro'
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Quadro Geral</span>
                  </button>

                  <button
                    onClick={() => setGestaoSubTab('preta')}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all",
                      gestaoSubTab === 'preta'
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", gestaoSubTab === 'preta' ? "bg-blue-400" : "bg-slate-400")} />
                    <span>Escala Preta (Dias Úteis)</span>
                  </button>

                  <button
                    onClick={() => setGestaoSubTab('vermelha')}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all",
                      gestaoSubTab === 'vermelha'
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full", gestaoSubTab === 'vermelha' ? "bg-white" : "bg-rose-500")} />
                    <span>Escala Vermelha (Fins de Semana)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pr-1">
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    Setor de Aprovisionamento
                  </span>
                </div>
              </div>

              {/* Sub-view 1: Quadro Geral */}
              {gestaoSubTab === 'quadro' && (
                <div className="space-y-6">
                  {/* Header Title & Date Range */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Quadro Geral de Escalas</h3>
                  <p className="text-slate-500 text-sm">
                    Gestão centralizada e automatizada de efetivo militar — {
                      viewOption === 'Semanal' 
                        ? `Semana de ${formatDateDDMMAAAA(selectedWeekMonday)} a ${formatDateDDMMAAAA(new Date(selectedWeekMonday.getTime() + 6 * 86400000))} ${selectedWeekMonday.getTime() === getMondayOfWeek(new Date()).getTime() ? '(Semana Atual)' : ''}`
                        : viewOption === 'Quinzenal'
                        ? `Quinzenal (${daysToShow[0] || ''} a ${daysToShow[daysToShow.length - 1] || ''})`
                        : viewOption === 'Mensal'
                        ? `Mês Vigente (${daysToShow[0] || ''} a ${daysToShow[daysToShow.length - 1] || ''})`
                        : `Período Personalizado (${formatDisplayDate(startDateFilter)} a ${formatDisplayDate(endDateFilter)})`
                    }
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  {/* Quick Week Controls */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
                    <button 
                      onClick={handlePrevWeek}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors text-xs font-semibold flex items-center gap-1"
                      title="Semana Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>
                    
                    <button 
                      onClick={handleCurrentWeek}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5",
                        selectedWeekMonday.getTime() === getMondayOfWeek(new Date()).getTime() 
                          ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs" 
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                      title="Ir para a Semana Atual"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Semana Atual</span>
                    </button>

                    <button 
                      onClick={handleNextWeek}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors text-xs font-semibold flex items-center gap-1"
                      title="Próxima Semana"
                    >
                      <span className="hidden sm:inline">Próxima</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button 
                    onClick={handleResetDatabase}
                    className="flex items-center gap-2 px-3 py-2 border border-rose-200 bg-rose-50/50 text-rose-700 rounded-lg font-semibold text-xs hover:bg-rose-100 transition-all shadow-xs"
                    title="Redefinir dados para o padrão de fábrica"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span className="hidden sm:inline">Redefinir</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('pdf')}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-lg text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-all shadow-xs"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Mudar Visão</span>
                  </button>
                  <button 
                    onClick={handleAutoGenerate}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-xs hover:opacity-90 transition-all shadow-md"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Gerar Escala</span>
                  </button>
                </div>
              </div>

              {/* Filter Row */}
              <div className="flex flex-col gap-4 p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Função</label>
                    <select 
                      value={filterFunction}
                      onChange={e => setFilterFunction(e.target.value)}
                      className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option>Todas as Funções</option>
                      <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                      <option value="Copeiro de Dia">Copeiro de Dia</option>
                      <option value="Auxiliar do Copeiro de Dia">Auxiliar do Copeiro de Dia</option>
                      <option value="Ceia de Dia">Ceia de Dia</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Opções de visualização</label>
                    <select 
                      value={viewOption}
                      onChange={e => setViewOption(e.target.value as 'Semanal' | 'Quinzenal' | 'Mensal' | 'Personalizado')}
                      className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-semibold text-slate-700"
                    >
                      <option value="Semanal">Semana Atual (7 dias)</option>
                      <option value="Quinzenal">Quinzenal (14 dias)</option>
                      <option value="Mensal">Mês Vigente (Mês Completo)</option>
                      <option value="Personalizado">Período Personalizado</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome do Militar</label>
                    <input 
                      type="text" 
                      placeholder="Ex: COSTA" 
                      value={filterMilitaryName}
                      onChange={e => setFilterMilitaryName(e.target.value)}
                      className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo de Escala</label>
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden h-full">
                      <button 
                        onClick={() => setFilterScaleType('Ambas')}
                        className={cn("flex-1 text-xs font-semibold py-2 transition-colors", filterScaleType === 'Ambas' ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-600")}
                      >
                        Ambas
                      </button>
                      <button 
                        onClick={() => setFilterScaleType('Preta')}
                        className={cn("flex-1 text-xs font-semibold border-l border-slate-200 py-2 transition-colors", filterScaleType === 'Preta' ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-600")}
                      >
                        Preta
                      </button>
                      <button 
                        onClick={() => setFilterScaleType('Vermelha')}
                        className={cn("flex-1 text-xs font-semibold border-l border-slate-200 py-2 transition-colors", filterScaleType === 'Vermelha' ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-600")}
                      >
                        Vermelha
                      </button>
                    </div>
                  </div>
                </div>

                {viewOption === 'Personalizado' && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex flex-col md:flex-row items-center gap-4 animate-fadeIn">
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data Inicial</span>
                      <input 
                        type="date"
                        value={startDateFilter}
                        onChange={e => setStartDateFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data Final</span>
                      <input 
                        type="date"
                        value={endDateFilter}
                        onChange={e => setEndDateFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-4 md:mt-0 font-medium">
                      Exibindo de <strong className="text-slate-800 font-bold">{formatDisplayDate(startDateFilter)}</strong> a <strong className="text-slate-800 font-bold">{formatDisplayDate(endDateFilter)}</strong> (formato dd/mm/aaaa).
                    </div>
                  </div>
                )}
              </div>

              {/* Roster Main Roster Grid */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                
                {/* Legends and metadata header */}
                <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legenda:</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Serviço Regular</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      <span>Escala Vermelha</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <span>Afastado / LTS</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Permuta</span>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">Clique em qualquer posto vazio para alocar manualmente</span>
                </div>

                {/* Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50">
                        <th className="w-52 border-b border-slate-200 p-4 text-left font-semibold text-xs uppercase tracking-wider text-slate-400 sticky left-0 bg-slate-50 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.01)]">
                          Função / Posto
                        </th>
                        
                        {/* Day headers */}
                        {daysToShow.map(day => {
                          const isWeekend = isDayWeekend(day);
                          const isToday = isDateToday(day);
                          const weekdayName = getDayWeekdayLong(day);

                          return (
                            <th 
                              key={day} 
                              className={cn(
                                "p-3 border-b border-slate-200 text-center min-w-[130px] transition-colors relative",
                                isWeekend ? "bg-rose-50/40" : "",
                                isToday ? "bg-blue-50/70 ring-1 ring-blue-500/40 ring-inset" : ""
                              )}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <p className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider",
                                  isWeekend ? "text-rose-600" : isToday ? "text-blue-700" : "text-slate-400"
                                )}>
                                  {weekdayName}
                                </p>
                                {isToday && (
                                  <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[8px] font-black uppercase tracking-wider">
                                    Hoje
                                  </span>
                                )}
                              </div>
                              <p className={cn(
                                "text-sm font-black leading-none mt-1 font-mono tracking-tight",
                                isWeekend ? "text-rose-700" : isToday ? "text-blue-950" : "text-slate-800"
                              )}>
                                {day}
                              </p>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                      
                      {/* Grid Rows */}
                      {['Cozinheiro de Dia', 'Copeiro de Dia', 'Auxiliar do Copeiro de Dia', 'Ceia de Dia'].map((post, postIdx) => {
                        // Skip row if a filter function is selected and doesn't match
                        if (filterFunction !== 'Todas as Funções' && filterFunction !== post) return null;

                        return (
                          <tr key={`${post}-${postIdx}`} className="hover:bg-slate-50/50 group transition-colors">
                            <td className="font-bold text-xs text-slate-800 p-4 sticky left-0 bg-white border-r border-slate-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.02)] z-10">
                              {getSpecialtyDisplayName(post)}
                            </td>

                            {daysToShow.map(day => {
                              const cell = roster[day] ? roster[day][post] : null;

                              // Highlight search matching
                              const isHighlighted = filterMilitaryName && cell && cell.militaryName.includes(filterMilitaryName.toUpperCase());

                              return (
                                <td 
                                  key={day} 
                                  onClick={() => { setSelectedCell({ day, post }); setIsAssigning(true); }}
                                  className={cn(
                                    "p-2.5 border-r border-slate-200/80 text-center cursor-pointer transition-all hover:bg-blue-50/20",
                                    isDayWeekend(day) ? "bg-rose-50/10 hover:bg-rose-100/10" : "",
                                    isHighlighted ? "bg-yellow-100/80 ring-2 ring-yellow-400 ring-inset" : ""
                                  )}
                                >
                                  {cell ? (
                                    <div className={cn(
                                      "px-3 py-2 rounded-lg text-[11px] font-bold flex flex-col text-left justify-center shadow-xs transition-transform group-hover:scale-[1.01]",
                                      cell.type === 'EP' && "bg-emerald-500 text-white",
                                      cell.type === 'EV' && "bg-rose-600 text-white",
                                      cell.type === 'DISP' && "bg-slate-400/50 text-slate-600 line-through font-normal opacity-80",
                                      cell.type === 'PERM' && "bg-amber-500 text-amber-950"
                                    )}>
                                      <span className="truncate">{cell.rank}. {cell.militaryName}</span>
                                      <span className="text-[9px] opacity-80 font-semibold tracking-wider">
                                        {cell.type === 'DISP' ? '(LTS)' : `(${cell.type})`}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="h-10 border border-dashed border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-100/50 hover:border-slate-300 group-hover:bg-slate-100/30 transition-all">
                                      <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer Dynamic Summary Statistics Card */}
                <div className="p-5 bg-slate-50 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-6 text-xs text-slate-500">
                  <div className="flex flex-col gap-1 border-r border-slate-200/80 pr-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Efetivo de Serviço</span>
                    <span className="text-lg font-black text-slate-800">{totalOnShift} Militares</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 border-r border-slate-200/80 pr-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispensa Médica</span>
                    <span className="text-lg font-black text-slate-800">{totalMedicalAway} {totalMedicalAway === 1 ? 'Militar' : 'Militares'}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 border-r border-slate-200/80 pr-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Permutas Ativas</span>
                    <span className="text-lg font-black text-slate-800">{pendingSwaps} Pendentes</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conformidade de Escala</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-black text-slate-800">{complianceRate}%</span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${complianceRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Workload Equity & Statistics Visualizer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Equity explanation card */}
                <div className="lg:col-span-4 bg-white border border-slate-200 p-6 rounded-xl shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Sliders className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-slate-800 text-sm">Controle de Equidade</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      O DutyRoster Pro utiliza um algoritmo de distribuição justa. Militares com menor contagem acumulada de serviços (<strong>Rodízio Equitativo</strong>) são automaticamente sugeridos e priorizados para novos postos.
                    </p>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs">
                        <span className="text-slate-500">Média de Serviços / Militar</span>
                        <span className="font-bold text-slate-800">
                          {(militaryList.reduce((acc, m) => acc + m.dutyCount, 0) / militaryList.length).toFixed(1)} sv
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs">
                        <span className="text-slate-500">Maior Carga (Sgt/Cb/Sd)</span>
                        <span className="font-bold text-slate-800">
                          {Math.max(...militaryList.map(m => m.dutyCount), 0)} sv
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs">
                        <span className="text-slate-500">Menor Carga (Sgt/Cb/Sd)</span>
                        <span className="font-bold text-slate-800">
                          {Math.min(...militaryList.map(m => m.dutyCount), 0)} sv
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 mt-4 text-[10px] text-slate-400">
                    *Métricas calculadas em tempo real com base no histórico armazenado localmente.
                  </div>
                </div>

                {/* Workload graph card */}
                <div className="lg:col-span-8 bg-white border border-slate-200 p-6 rounded-xl shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800 text-sm">Distribuição de Carga de Trabalho (Acumulado de Serviços)</h4>
                    <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider bg-blue-50 px-2 py-0.5 rounded-full">Ordem de Prioridade</span>
                  </div>
                  
                  {/* Visual Bar Graph */}
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2">
                    {[...militaryList]
                      .sort((a, b) => a.dutyCount - b.dutyCount)
                      .map(mil => {
                        const maxDuty = Math.max(...militaryList.map(m => m.dutyCount), 1);
                        const pct = (mil.dutyCount / maxDuty) * 100;
                        return (
                          <div key={mil.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-slate-700">{mil.rank}. {mil.name} <span className="text-slate-400 text-[10px] font-normal">({mil.specialty})</span></span>
                              <span className="text-slate-800">{mil.dutyCount} serviços</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  className={cn(
                                    "h-full rounded-full",
                                    mil.dutyCount <= 2 ? "bg-emerald-500" : mil.dutyCount <= 4 ? "bg-blue-500" : "bg-amber-500"
                                  )}
                                />
                              </div>
                              <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0",
                                mil.status === 'Ativo' ? "bg-slate-100 text-slate-600" : "bg-rose-50 text-rose-600"
                              )}>
                                {mil.status === 'Ativo' ? 'Disponível' : 'LTS'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Sub-view 2: Escala Preta (Dias Úteis) */}
          {gestaoSubTab === 'preta' && (
            <div className="grid grid-cols-12 gap-6">
              
              {/* Left personnel list and toggles */}
              <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Efetivo e Funções da Escala Preta</h3>
                    <p className="text-slate-400 text-xs">Configure as especialidades e postos elegíveis de cada militar</p>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/50 border-b border-slate-200">
                        <th className="p-4 font-bold uppercase tracking-wider text-slate-400">Militar</th>
                        <th className="p-4 font-bold uppercase tracking-wider text-slate-400">Função Atribuída</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                      {militaryList.filter(m => m.type !== 'EV').map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                                {m.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{m.rank}. {m.fullName}</p>
                                <p className="text-[10px] text-slate-400">{m.matricula} — {m.status}</p>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <select
                              value={m.specialty}
                              onChange={(e) => handleToggleSpecialty(m.id, e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden bg-white shadow-xs"
                            >
                              <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                              <option value="Copeiro de Dia">Copeiro de Dia</option>
                              <option value="Auxiliar do Copeiro de Dia">Aux. Copeiro de Dia</option>
                              <option value="Ceia de Dia">Ceia de Dia</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right rules panel */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                
                {/* Rules config card */}
                <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-base">Regras de Rodízio</h4>
                      <Sliders className="w-5 h-5 text-blue-400" />
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-800 p-4 rounded-lg">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Efetivo de Roster / Dia</label>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-white">{minEfetivoPreta}</span>
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => { setMinEfetivoPreta(prev => Math.max(1, prev - 1)); showToast('Regra de efetivo atualizada.'); }}
                              className="w-8 h-8 bg-slate-700/60 hover:bg-slate-700 rounded-lg flex items-center justify-center font-bold text-lg text-white"
                            >
                              -
                            </button>
                            <button 
                              onClick={() => { setMinEfetivoPreta(prev => prev + 1); showToast('Regra de efetivo atualizada.'); }}
                              className="w-8 h-8 bg-slate-700/60 hover:bg-slate-700 rounded-lg flex items-center justify-center font-bold text-lg text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-800 p-4 rounded-lg">
                        <label className="block text-[10px] font-bold text-slate-400 tracking-wider mb-1">INTERVALO MÍNIMO (FOLGA)</label>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold">48 horas</span>
                          <span className="text-xs text-slate-400 italic">Padrão Militar</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed mt-6">
                    A escala preta controla dias úteis de Segunda a Sexta. O algoritmo garante a rotação justa priorizando militares com menor contagem acumulada.
                  </p>
                </div>

                {/* Activity changelog panel */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <History className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Histórico de Alterações</span>
                  </div>

                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                    {changelogs.map((log, i) => (
                      <div key={i} className="flex gap-3 text-xs border-b border-slate-100 pb-2">
                        <span className="text-slate-400 font-semibold shrink-0">{log.time}</span>
                        <p className="text-slate-600">{log.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Sub-view 3: Escala Vermelha (Fins de Semana) */}
          {gestaoSubTab === 'vermelha' && (
            <div className="grid grid-cols-12 gap-6">
              
              {/* Personnel table */}
              <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Efetivo e Funções da Escala Vermelha</h3>
                    <p className="text-slate-400 text-xs">Configure o pessoal encarregado dos serviços nos fins de semana e feriados</p>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/50 border-b border-slate-200">
                        <th className="p-4 font-bold uppercase tracking-wider text-slate-400">Militar</th>
                        <th className="p-4 font-bold uppercase tracking-wider text-slate-400">Função Atribuída</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                      {militaryList.filter(m => m.type !== 'EP').map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                                {m.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{m.rank}. {m.fullName}</p>
                                <p className="text-[10px] text-slate-400">{m.matricula} — {m.status}</p>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <select
                              value={m.specialty}
                              onChange={(e) => handleToggleSpecialty(m.id, e.target.value)}
                              className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden bg-white shadow-xs"
                            >
                              <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                              <option value="Copeiro de Dia">Copeiro de Dia</option>
                              <option value="Auxiliar do Copeiro de Dia">Aux. Copeiro de Dia</option>
                              <option value="Ceia de Dia">Ceia de Dia</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rules panel */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                
                <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-base">Regras de Rodízio</h4>
                      <Sliders className="w-5 h-5 text-rose-400" />
                    </div>

                    <div className="space-y-4">
                      <div className="bg-slate-800 p-4 rounded-lg">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Efetivo de Roster / Fim de Semana</label>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-white">{minEfetivoVermelha}</span>
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => { setMinEfetivoVermelha(prev => Math.max(1, prev - 1)); showToast('Regra de efetivo atualizada.'); }}
                              className="w-8 h-8 bg-slate-700/60 hover:bg-slate-700 rounded-lg flex items-center justify-center font-bold text-lg text-white"
                            >
                              -
                            </button>
                            <button 
                              onClick={() => { setMinEfetivoVermelha(prev => prev + 1); showToast('Regra de efetivo atualizada.'); }}
                              className="w-8 h-8 bg-slate-700/60 hover:bg-slate-700 rounded-lg flex items-center justify-center font-bold text-lg text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-800 p-4 rounded-lg">
                        <label className="block text-[10px] font-bold text-slate-400 tracking-wider mb-1">INTERVALO MÍNIMO (FOLGA)</label>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold">72 horas</span>
                          <span className="text-xs text-slate-400 italic">Padrão Escala Vermelha</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Requisitos Mínimos Obrigatórios</p>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Cozinheiro</span>
                      <span className="font-semibold text-rose-400">1 Vaga</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Copeiros</span>
                      <span className="font-semibold text-rose-400">2 Vagas</span>
                    </div>
                  </div>
                </div>

                {/* Changelog panel */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <History className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Histórico de Alterações</span>
                  </div>

                  <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
                    {changelogs.map((log, i) => (
                      <div key={i} className="flex gap-3 text-xs border-b border-slate-100 pb-2">
                        <span className="text-slate-400 font-semibold shrink-0">{log.time}</span>
                        <p className="text-slate-600">{log.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          </div>
          )}

          {/* TAB 4: ABSENCES / AFASTAMENTOS */}
          {activeTab === 'afastamentos' && (
            <div className="space-y-6">
              
              {/* Stat summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Militares Afastados Hoje</span>
                    <h3 className="text-3xl font-black text-slate-800">{absences.filter(a => a.status === 'ATIVO').length}</h3>
                    <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Requer atenção na escala</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                    <UserX className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Retornos Previstos (7 dias)</span>
                    <h3 className="text-3xl font-black text-slate-800">
                      {absences.filter(a => a.status === 'ATIVO' && a.endDate !== 'Indefinido').length}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Normalização gradual da escala</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <UserCheck className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Substituições Pendentes</span>
                    <h3 className="text-3xl font-black text-rose-600">
                      {Object.values(roster).flatMap(d => Object.values(d)).filter(c => c !== null && c.type === 'DISP').length}
                    </h3>
                    <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <ArrowLeftRight className="w-3.5 h-3.5 animate-pulse" />
                      <span>Substituições urgentes necessárias</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <ArrowLeftRight className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Form & List split layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Absence Form */}
                <form 
                  onSubmit={handleRegisterAbsence}
                  className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col"
                >
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                    <h4 className="font-bold text-slate-800 text-sm">Cadastrar Afastamento</h4>
                    <p className="text-slate-400 text-[11px]">Registre atestados, férias e licenças</p>
                  </div>

                  <div className="p-6 space-y-4 flex-1">
                    {/* Select military */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selecione o Militar</label>
                      <select 
                        value={absentMilId}
                        onChange={e => setAbsentMilId(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg text-xs p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Selecione um oficial...</option>
                        {[...militaryList]
                          .sort((a, b) => {
                            const valA = getAntiguidadeValue(a.matricula);
                            const valB = getAntiguidadeValue(b.matricula);
                            if (valA !== valB) return valA - valB;
                            return a.name.localeCompare(b.name);
                          })
                          .map(mil => (
                            <option key={mil.id} value={mil.id}>
                              {mil.rank}. {mil.fullName} ({mil.status})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Type select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Afastamento</label>
                      <select 
                        value={absenceType}
                        onChange={e => setAbsenceType(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg text-xs p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option>Férias</option>
                        <option>LTS / Atestado Médico</option>
                        <option>Curso / Estágio</option>
                        <option>Missão Externa</option>
                        <option>Dispensa Recompensa</option>
                        <option>Núpcias / Luto</option>
                      </select>
                    </div>

                    {/* Dates start & end */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Início</label>
                        <input 
                          type="date" 
                          value={absenceStart}
                          onChange={e => setAbsenceStart(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Término</label>
                        <input 
                          type="date" 
                          value={absenceEnd}
                          disabled={absenceIndefinite}
                          onChange={e => setAbsenceEnd(e.target.value)}
                          className={cn(
                            "w-full border border-slate-200 rounded-lg text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-600",
                            absenceIndefinite ? "bg-slate-100 border-slate-200 opacity-60 text-slate-400 cursor-not-allowed" : ""
                          )}
                        />
                      </div>
                    </div>

                    {/* Checkbox Indefinite */}
                    <div className="flex items-center gap-2 py-1">
                      <input 
                        type="checkbox" 
                        id="check-indefinite"
                        checked={absenceIndefinite}
                        onChange={e => setAbsenceIndefinite(e.target.checked)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded border-slate-300"
                      />
                      <label htmlFor="check-indefinite" className="text-xs text-slate-600 font-medium">Data de retorno indefinida</label>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motivo / Observações</label>
                      <textarea 
                        rows={2}
                        placeholder="Insira notas do afastamento..."
                        value={absenceNotes}
                        onChange={e => setAbsenceNotes(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Checkbox auto update */}
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="check-auto"
                          checked={absenceAutoUpdate}
                          onChange={e => setAbsenceAutoUpdate(e.target.checked)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded border-slate-300"
                        />
                        <label htmlFor="check-auto" className="text-xs text-blue-900 font-semibold">Atualização Automática</label>
                      </div>
                      <p className="text-[10px] text-blue-700/80 leading-tight">
                        Atualiza as escalas futuras automaticamente removendo o militar dos serviços e sinalizando as vagas.
                      </p>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-slate-900 hover:opacity-95 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirmar Afastamento</span>
                    </button>
                  </div>
                </form>

                {/* Absence Table List */}
                <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-sm">Afastamentos Ativos &amp; Agendados</h4>
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/50 border-b border-slate-200">
                          <th className="px-6 py-4 font-bold uppercase tracking-wider text-slate-400">Militar</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-wider text-slate-400">Tipo</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-wider text-slate-400">Período</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-wider text-slate-400">Status</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-wider text-slate-400 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/80">
                        {absences.map(abs => (
                          <tr key={abs.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-bold text-slate-800">{abs.rank}. {abs.militaryName}</p>
                                <p className="text-[10px] text-slate-400">{abs.notes || 'Nenhuma nota informada'}</p>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 font-medium text-slate-600">
                              {abs.type}
                            </td>

                            <td className="px-6 py-4">
                              <p className="text-slate-700 font-medium">{abs.startDate} a {abs.endDate}</p>
                              <p className="text-[10px] text-slate-400">{abs.indefinite ? 'Duração Indeterminada' : 'Afastamento Programado'}</p>
                            </td>

                            <td className="px-6 py-4">
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                abs.status === 'ATIVO' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-700 border-slate-200"
                              )}>
                                {abs.status}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleEndAbsence(abs.id)}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-semibold"
                                title="Finalizar Afastamento"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Finalizar</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {absences.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                              Nenhum afastamento registrado neste período.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-slate-400 text-xs font-medium">
                    <span>Exibindo {absences.length} afastamentos registrados</span>
                    <div className="flex gap-1.5">
                      <button className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50" disabled>
                        Anterior
                      </button>
                      <button className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50" disabled>
                        Próxima
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: PDF REPORT CENTER */}
          {activeTab === 'pdf' && (
            <div className="space-y-6">
              
              {/* Header Title Section */}
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Centro de Geração de Relatórios</h3>
                <p className="text-slate-500 text-sm">Selecione o tipo de documento militar oficial, configure e faça o download em PDF ou Excel.</p>
              </div>

              <div className="grid grid-cols-12 gap-6">
                
                {/* Customizer sidebar options */}
                <div className="col-span-12 lg:col-span-5 space-y-6">
                  
                  {/* Select Report Type Cards */}
                  <section className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Selecione o Tipo de Relatório</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Individual Extract card */}
                      <button 
                        onClick={() => setSelectedReportType('individual')}
                        className={cn(
                          "p-4 border rounded-xl text-left transition-all",
                          selectedReportType === 'individual' ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        <Users className={cn("w-5 h-5 mb-2", selectedReportType === 'individual' ? "text-blue-400" : "text-slate-400")} />
                        <h5 className="font-bold text-xs">Extrato Individual</h5>
                        <p className={cn("text-[10px] mt-1", selectedReportType === 'individual' ? "text-slate-300" : "text-slate-400")}>
                          Histórico detalhado por militar.
                        </p>
                      </button>

                      {/* Weekly scale card */}
                      <button 
                        onClick={() => setSelectedReportType('weekly')}
                        className={cn(
                          "p-4 border rounded-xl text-left transition-all",
                          selectedReportType === 'weekly' ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        <Calendar className={cn("w-5 h-5 mb-2", selectedReportType === 'weekly' ? "text-blue-400" : "text-slate-400")} />
                        <h5 className="font-bold text-xs">Escala Semanal</h5>
                        <p className={cn("text-[10px] mt-1", selectedReportType === 'weekly' ? "text-slate-300" : "text-slate-400")}>
                          Escala pronta para o quadro de aviso.
                        </p>
                      </button>

                      {/* Monthly consolidation card */}
                      <button 
                        onClick={() => setSelectedReportType('monthly')}
                        className={cn(
                          "p-4 border rounded-xl text-left transition-all",
                          selectedReportType === 'monthly' ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        <FileText className={cn("w-5 h-5 mb-2", selectedReportType === 'monthly' ? "text-blue-400" : "text-slate-400")} />
                        <h5 className="font-bold text-xs">Consolidação Mensal</h5>
                        <p className={cn("text-[10px] mt-1", selectedReportType === 'monthly' ? "text-slate-300" : "text-slate-400")}>
                          Resumos e estatísticas consolidadas.
                        </p>
                      </button>

                      {/* Equity report card */}
                      <button 
                        onClick={() => setSelectedReportType('equity')}
                        className={cn(
                          "p-4 border rounded-xl text-left transition-all",
                          selectedReportType === 'equity' ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        )}
                      >
                        <Sliders className={cn("w-5 h-5 mb-2", selectedReportType === 'equity' ? "text-blue-400" : "text-slate-400")} />
                        <h5 className="font-bold text-xs">Relatório de Equidade</h5>
                        <p className={cn("text-[10px] mt-1", selectedReportType === 'equity' ? "text-slate-300" : "text-slate-400")}>
                          Métricas e justiça na distribuição.
                        </p>
                      </button>

                    </div>
                  </section>

                  {/* Parameter Customizer card */}
                  <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Configure os Parâmetros</h4>
                    
                    <div className="space-y-4">
                      {/* Render military select if individual is picked */}
                      {selectedReportType === 'individual' && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Militar Alvo</label>
                          <select 
                            value={reportMilId}
                            onChange={e => setReportMilId(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg text-xs p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {[...militaryList]
                              .sort((a, b) => {
                                const valA = getAntiguidadeValue(a.matricula);
                                const valB = getAntiguidadeValue(b.matricula);
                                if (valA !== valB) return valA - valB;
                                return a.name.localeCompare(b.name);
                              })
                              .map(mil => (
                                <option key={mil.id} value={mil.id}>
                                  {mil.rank}. {mil.fullName}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}



                      {/* Export Format toggles */}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 block">Formato de Exportação</label>
                        <div className="flex gap-4 mt-1">
                          <button 
                            type="button"
                            onClick={() => setReportFormat('PDF')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 p-2.5 border rounded-lg font-bold text-xs transition-all",
                              reportFormat === 'PDF' ? "border-slate-900 bg-slate-100 text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            <FileCheck className="w-4 h-4 text-rose-500" />
                            <span>PDF Document</span>
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => setReportFormat('XLSX')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 p-2.5 border rounded-lg font-bold text-xs transition-all",
                              reportFormat === 'XLSX' ? "border-slate-900 bg-slate-100 text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            <FileText className="w-4 h-4 text-emerald-500" />
                            <span>Excel Sheet</span>
                          </button>
                        </div>
                      </div>

                      {/* Extra options checkboxes */}
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-semibold text-slate-700 block">Opções Adicionais</label>
                        <div className="flex flex-wrap gap-3">
                          <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={includeRankLogos}
                              onChange={e => setIncludeRankLogos(e.target.checked)}
                              className="rounded text-slate-900 focus:ring-slate-900" 
                            />
                            <span className="text-xs text-slate-600 font-medium">Logos de Posto/Graduação</span>
                          </label>
                        </div>
                      </div>

                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-end">
                      <button 
                        type="button"
                        onClick={triggerReportDownload}
                        className="px-5 py-2.5 bg-slate-900 hover:opacity-95 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md"
                      >
                        <Download className="w-4 h-4" />
                        <span>Gerar e Baixar Relatório</span>
                      </button>
                    </div>

                  </section>

                </div>

                {/* Right interactive document layout preview */}
                <div className="col-span-12 lg:col-span-7 flex flex-col">
                  
                  {/* Interactive zoom controls */}
                  <div className="flex items-center justify-between mb-3 text-slate-400">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider">Pré-visualização Oficial Militar</h5>
                    <div className="flex gap-2">
                      <button className="p-1 hover:bg-slate-200 rounded-md transition-colors"><ZoomIn className="w-4 h-4" /></button>
                      <button className="p-1 hover:bg-slate-200 rounded-md transition-colors"><ZoomOut className="w-4 h-4" /></button>
                      <button className="p-1 hover:bg-slate-200 rounded-md transition-colors"><Maximize2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* PDF Canvas Container */}
                  <div className="bg-slate-300 rounded-xl p-8 flex flex-col items-center overflow-auto max-h-[580px] shadow-inner relative border border-slate-400/20">
                    
                    {/* The Paper sheet */}
                    <div className="bg-white w-full max-w-2xl shadow-2xl p-10 aspect-[1/1.414] border border-slate-300 relative flex flex-col font-sans select-none overflow-hidden text-slate-900">
                      
                      {/* Stamp background effect */}
                      <div className="absolute top-10 right-10 opacity-[0.03] pointer-events-none">
                        <FileCheck className="w-48 h-48" />
                      </div>

                      {/* PDF Letterhead */}
                      <div className="text-center border-b-2 border-slate-900 pb-5 mb-6">
                        <div className="font-bold text-[10px] tracking-[0.25em] text-slate-400 mb-1.5 uppercase">Documento Oficial Militar</div>
                        <h4 className="font-black text-lg text-slate-900 tracking-tight leading-none uppercase">
                          {selectedReportType === 'weekly' && 'Escala de Serviço Semanal'}
                          {selectedReportType === 'individual' && 'Extrato de Escala Individual'}
                          {selectedReportType === 'monthly' && 'Consolidação Operacional'}
                          {selectedReportType === 'equity' && 'Distribuição de Escalas e Equidade'}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-semibold tracking-wider mt-1.5 uppercase">
                          Setor de Aprovisionamento - H Ge SM | SEMANA ATUAL ({formatDateDDMMAAAA(new Date())})
                        </p>
                      </div>

                      {/* PDF Report Body Content */}
                      <div className="flex-1 overflow-hidden text-xs">
                        
                        {/* Weekly Scale Preview */}
                        {selectedReportType === 'weekly' && (
                          <div className="space-y-4">
                            <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase tracking-wider text-[10px]">
                                  <th className="p-2 border-r border-slate-300">FUNÇÃO / POSTO</th>
                                  {currentWeekDates.map((day, idx) => (
                                    <th key={day} className={cn("p-2 text-center", idx < currentWeekDates.length - 1 ? "border-r border-slate-300" : "")}>
                                      <div className="text-[9px] font-bold text-slate-500">{getDayWeekdayShort(day)}</div>
                                      <div className="text-[10px] font-mono">{day}</div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {['Cozinheiro de Dia', 'Copeiro de Dia', 'Auxiliar do Copeiro de Dia', 'Ceia de Dia'].map(post => (
                                  <tr key={post}>
                                    <td className="p-2 border-r border-slate-300 font-bold bg-slate-50/50">{getSpecialtyDisplayName(post)}</td>
                                    {currentWeekDates.map(day => {
                                      const cell = roster[day] ? roster[day][post] : null;
                                      return (
                                        <td key={day} className="p-2 border-r border-slate-300 text-center">
                                          {cell ? (
                                            <p className="font-semibold text-[10px] truncate">{cell.rank}. {cell.militaryName}</p>
                                          ) : (
                                            <span className="text-slate-400 italic text-[10px]">VAGO</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Individual Extract Preview */}
                        {selectedReportType === 'individual' && (
                          <div className="space-y-5">
                            {(() => {
                              const mil = militaryList.find(m => m.id === reportMilId) || militaryList[0];
                              return (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">Militar Requerente</p>
                                      <p className="font-bold text-sm text-slate-800">{mil.rank}. {mil.fullName}</p>
                                      <p className="text-slate-500">{mil.matricula}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">Especialidade / Escala</p>
                                      <p className="font-bold text-sm text-slate-800">{mil.specialty}</p>
                                      <p className="text-slate-500">Acumulado: {mil.dutyCount} Serviços</p>
                                    </div>
                                  </div>

                                  <h5 className="font-bold border-b border-slate-200 pb-1 uppercase tracking-wider text-slate-700">Histórico Recente de Alocações</h5>
                                  <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                                    <thead>
                                      <tr className="bg-slate-100 border-b border-slate-200">
                                        <th className="p-2 font-bold">Dia / Escala</th>
                                        <th className="p-2 font-bold">Função Alocada</th>
                                        <th className="p-2 font-bold text-center">Tipo</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {(() => {
                                        const assignments: { day: string; post: string; type: string }[] = [];
                                        Object.keys(roster).forEach(day => {
                                          Object.keys(roster[day]).forEach(post => {
                                            const cell = roster[day][post];
                                            if (cell && cell.militaryId === mil.id) {
                                              assignments.push({ day, post, type: cell.type });
                                            }
                                          });
                                        });

                                        if (assignments.length === 0) {
                                          return (
                                            <tr>
                                              <td colSpan={3} className="p-3 text-center text-slate-400 italic">
                                                Nenhuma escala registrada para este militar no período.
                                              </td>
                                            </tr>
                                          );
                                        }

                                        return assignments.map((item, idx) => (
                                          <tr key={idx}>
                                            <td className="p-2">{item.day}</td>
                                            <td className="p-2">{getSpecialtyDisplayName(item.post)}</td>
                                            <td className="p-2 text-center font-bold">
                                              {item.type === 'EP' ? (
                                                <span className="text-slate-800">PRETA</span>
                                              ) : item.type === 'EV' ? (
                                                <span className="text-rose-600">VERMELHA</span>
                                              ) : item.type === 'PERM' ? (
                                                <span className="text-amber-600">PERMUTA</span>
                                              ) : (
                                                <span className="text-slate-400">DISPENSA</span>
                                              )}
                                            </td>
                                          </tr>
                                        ));
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Monthly Consolidation Preview */}
                        {selectedReportType === 'monthly' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                                <p className="text-[10px] font-bold text-slate-400">EFETIVO ATIVO</p>
                                <p className="text-lg font-black text-slate-800">{militaryList.filter(m => m.status === 'Ativo').length}</p>
                              </div>
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                                <p className="text-[10px] font-bold text-slate-400">AUSENCIAS</p>
                                <p className="text-lg font-black text-slate-800">{absences.filter(a => a.status === 'ATIVO').length}</p>
                              </div>
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                                <p className="text-[10px] font-bold text-slate-400">POSTOS COBERTOS</p>
                                <p className="text-lg font-black text-slate-800">{complianceRate}%</p>
                              </div>
                            </div>

                            <h5 className="font-bold border-b border-slate-200 pb-1 mt-4 uppercase tracking-wider text-slate-700">Métricas Gerais de Alocação por Especialidade</h5>
                            <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-200">
                                  <th className="p-2 font-bold">Especialidade</th>
                                  <th className="p-2 font-bold text-center">Serviços Atendidos</th>
                                  <th className="p-2 font-bold text-center">Aproveitamento</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {['Cozinheiro de Dia', 'Copeiro de Dia', 'Auxiliar do Copeiro de Dia', 'Ceia de Dia'].map(spec => {
                                  const count = Object.values(roster).flatMap(d => Object.entries(d)).filter(([p, cell]) => p === spec && cell !== null && cell.type !== 'DISP').length;
                                  const totalDays = Object.keys(roster).length;
                                  const pct = totalDays > 0 ? Math.round((count / totalDays) * 100) : 0;
                                  return (
                                    <tr key={spec}>
                                      <td className="p-2 font-medium">{getSpecialtyDisplayName(spec)}</td>
                                      <td className="p-2 text-center font-bold">{count}</td>
                                      <td className="p-2 text-center text-emerald-600 font-semibold">{pct}%</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Equity Report Preview */}
                        {selectedReportType === 'equity' && (
                          <div className="space-y-4">
                            <h5 className="font-bold border-b border-slate-200 pb-1 uppercase tracking-wider text-slate-700">Métricas de Justiça de Rodízio (Desvio de Alocação)</h5>
                            <p className="text-[10px] text-slate-500 leading-relaxed mb-2">
                              O desvio de alocação mede a diferença entre serviços acumulados de cada militar em comparação à média da equipe, garantindo conformidade e equidade.
                            </p>
                            
                            <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-200">
                                  <th className="p-2 font-bold">Posto / Militar</th>
                                  <th className="p-2 font-bold text-center">Serviços Totais</th>
                                  <th className="p-2 font-bold text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(() => {
                                  const sorted = [...militaryList].sort(compareMilitaryHierarchy);
                                  const totalDuties = sorted.reduce((acc, m) => acc + m.dutyCount, 0);
                                  const avgDuties = sorted.length > 0 ? (totalDuties / sorted.length) : 0;

                                  return sorted.slice(0, 8).map(mil => {
                                    const diff = mil.dutyCount - avgDuties;
                                    const isStable = Math.abs(diff) <= 1;
                                    return (
                                      <tr key={mil.id}>
                                        <td className="p-2 font-medium">{mil.rank}. {mil.fullName}</td>
                                        <td className="p-2 text-center font-bold">{mil.dutyCount}</td>
                                        <td className="p-2 text-center">
                                          <span className={cn(
                                            "px-2 py-0.5 rounded-full font-bold border text-[10px]",
                                            isStable 
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                              : diff > 1
                                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                                : "bg-blue-50 text-blue-700 border-blue-100"
                                          )}>
                                            {isStable ? 'ESTÁVEL' : diff > 1 ? `+${diff.toFixed(1)} SV` : `${diff.toFixed(1)} SV`}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        )}

                      </div>

                      {/* PDF Footer without Signatures */}
                      <div className="mt-8 pt-4 border-t border-slate-900 flex justify-between items-end text-slate-800">
                        <div className="text-left">
                          <p className="text-[8px] text-slate-400">Escalas - Aprov H Ge SM</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-slate-900 uppercase">Report ID: DR-9011-HQ</p>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB: GERENCIAR EFETIVO (CRUD) */}
          {activeTab === 'efetivo' && (
            <div className="grid grid-cols-12 gap-6">
              
              {/* Left Column: Personnel List */}
              <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                <div className="px-6 py-5 border-b border-slate-200/80 bg-slate-50 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Militares Cadastrados</h4>
                    <p className="text-slate-400 text-xs mt-0.5">{militaryList.length} militares registrados no efetivo</p>
                  </div>
                  
                  {/* Localized search & filter */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input 
                      type="text"
                      placeholder="Buscar por nome..."
                      value={filterMilitaryName}
                      onChange={e => setFilterMilitaryName(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white w-full sm:w-48 shadow-xs"
                    />
                    <select
                      value={filterFunction}
                      onChange={e => setFilterFunction(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden bg-white shadow-xs"
                    >
                      <option value="Todas as Funções">Funções: Todas</option>
                      <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                      <option value="Copeiro de Dia">Copeiro de Dia</option>
                      <option value="Auxiliar do Copeiro de Dia">Auxiliar do Copeiro de Dia</option>
                      <option value="Ceia de Dia">Ceia de Dia</option>
                    </select>
                  </div>
                </div>

                {/* Table list */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-4">Posto/Grad</th>
                        <th className="p-4">Nome de Guerra / Antiguidade</th>
                        <th className="p-4">Nome Completo</th>
                        <th className="p-4">Especialidade(s)</th>
                        <th className="p-4 text-center">Tipo Escala</th>
                        <th className="p-4 text-center">Contagem</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {militaryList
                        .filter(mil => {
                          const matchesName = mil.name.toLowerCase().includes(filterMilitaryName.toLowerCase()) || 
                                              mil.fullName.toLowerCase().includes(filterMilitaryName.toLowerCase());
                          const matchesFunc = filterFunction === 'Todas as Funções' || mil.specialty === filterFunction || mil.specialtySecondary === filterFunction;
                          return matchesName && matchesFunc;
                        })
                        .sort((a, b) => {
                          const valA = getAntiguidadeValue(a.matricula);
                          const valB = getAntiguidadeValue(b.matricula);
                          if (valA !== valB) return valA - valB;
                          return a.name.localeCompare(b.name);
                        })
                        .map(mil => (
                          <tr key={mil.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-4">
                              <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md font-bold uppercase text-[10px]">
                                {mil.rank}
                              </span>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-slate-800">{mil.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Antiguidade: {mil.matricula}</p>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">{mil.fullName}</td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium text-[10px]">
                                  P: {getSpecialtyDisplayName(mil.specialty)}
                                </span>
                                {mil.specialtySecondary && (
                                  <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-md font-medium text-[10px]">
                                    S: {getSpecialtyDisplayName(mil.specialtySecondary)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                mil.type === 'EP' && "bg-slate-900 text-white",
                                mil.type === 'EV' && "bg-rose-100 text-rose-800",
                                mil.type === 'Ambas' && "bg-emerald-50 text-emerald-800 border border-emerald-200/50"
                              )}>
                                {mil.type === 'EP' ? 'PRETA' : mil.type === 'EV' ? 'VERMELHA' : 'AMBAS'}
                              </span>
                            </td>
                            <td className="p-4 text-center font-bold text-slate-800 font-mono text-sm">{mil.dutyCount}</td>
                            <td className="p-4 text-center">
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                mil.status === 'Ativo' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              )}>
                                {mil.status === 'Ativo' ? 'Ativo' : 'LTS / Disp'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => setEditingMil(mil)}
                                  className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-950 transition-colors"
                                  title="Editar Militar"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMilitary(mil.id)}
                                  className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Excluir Militar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Register/Add military personnel Form */}
              <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 p-6 rounded-xl shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-slate-800 text-sm">Cadastrar Novo Militar</h4>
                </div>

                <form onSubmit={handleAddMilitary} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block">Posto/Graduação</label>
                      <select
                        value={newMilRank}
                        onChange={e => setNewMilRank(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                      >
                        <option value="Ten">Tenente (Ten)</option>
                        <option value="Sgt">Sargento (Sgt)</option>
                        <option value="Cb">Cabo (Cb)</option>
                        <option value="Sd">Soldado (Sd)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block">Nome de Guerra</label>
                      <input 
                        type="text"
                        placeholder="Ex: Costa"
                        value={newMilName}
                        onChange={e => setNewMilName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Nome Completo</label>
                    <input 
                      type="text"
                      placeholder="Ex: João da Silva Costa"
                      value={newMilFullName}
                      onChange={e => setNewMilFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-700 block">Antiguidade</label>
                      <input 
                        type="text"
                        placeholder="Ex: 1, 2, 3..."
                        value={newMilMatricula}
                        onChange={e => setNewMilMatricula(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-700 block">Função Principal</label>
                      <select
                        value={newMilSpecialty}
                        onChange={e => setNewMilSpecialty(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                      >
                        <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                        <option value="Copeiro de Dia">Copeiro de Dia</option>
                        <option value="Auxiliar do Copeiro de Dia">Auxiliar do Copeiro de Dia</option>
                        <option value="Ceia de Dia">Ceia de Dia</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-700 block">Função Secundária</label>
                      <select
                        value={newMilSpecialtySecondary}
                        onChange={e => setNewMilSpecialtySecondary(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                      >
                        <option value="Nenhuma">Nenhuma</option>
                        <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                        <option value="Copeiro de Dia">Copeiro de Dia</option>
                        <option value="Auxiliar do Copeiro de Dia">Auxiliar do Copeiro de Dia</option>
                        <option value="Ceia de Dia">Ceia de Dia</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block">Tipo de Escala</label>
                      <select
                        value={newMilScaleType}
                        onChange={e => setNewMilScaleType(e.target.value as 'EP' | 'EV' | 'Ambas')}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                      >
                        <option value="Ambas">Ambas (Preta e Vermelha)</option>
                        <option value="EP">Apenas Escala Preta (Úteis)</option>
                        <option value="EV">Apenas Vermelha (Fins Semana)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block">Contagem de Serviços Inicial</label>
                      <input 
                        type="number"
                        min="0"
                        value={newMilDutyCount}
                        onChange={e => setNewMilDutyCount(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Status de Saúde / Operabilidade</label>
                    <select
                      value={newMilStatus}
                      onChange={e => setNewMilStatus(e.target.value as 'Ativo' | 'Afastado')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                    >
                      <option value="Ativo">Ativo / Pronto para Serviço</option>
                      <option value="Afastado">Afastado (LTS / Licença)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-xs hover:bg-blue-500 shadow-sm transition-colors mt-4 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Militar</span>
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>

      </main>
      {isAssigning && selectedCell && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
          >
            <div className="px-6 py-4 bg-slate-100 border-b border-slate-200/80 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Alocar Militar Manualmente</h4>
                <p className="text-xs text-slate-500">{getSpecialtyDisplayName(selectedCell.post)} — {selectedCell.day} ({getDayWeekdayLong(selectedCell.day)})</p>
              </div>
              <button 
                onClick={() => { setIsAssigning(false); setSelectedCell(null); }}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Selecione o tipo de escala e em seguida o militar correspondente. O sistema prioriza a quantidade de escalas acumuladas.
              </p>

              {/* Segmented Selector for Assignment Type */}
              <div className="space-y-1.5 pb-2 border-b border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tipo de Alocação</label>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedAssignType('EP')}
                    className={cn(
                      "flex-1 text-center py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                      selectedAssignType === 'EP' || selectedAssignType === 'EV' ? "bg-white text-slate-950 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Regular
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAssignType('PERM')}
                    className={cn(
                      "flex-1 text-center py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                      selectedAssignType === 'PERM' ? "bg-amber-500 text-amber-950 shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Permuta
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAssignType('DISP')}
                    className={cn(
                      "flex-1 text-center py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                      selectedAssignType === 'DISP' ? "bg-slate-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Dispensa (LTS)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                {/* Clear assignment option */}
                <button
                  type="button"
                  onClick={() => handleAssignMilitary('empty')}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 text-left hover:bg-rose-50 text-rose-600 font-semibold text-xs transition-colors"
                >
                  <span>Remover militar escalado (Deixar Vago)</span>
                  <X className="w-4 h-4" />
                </button>

                {/* Direct selector for Ceia de Dia: Copeiro or Auxiliar of the day */}
                {selectedCell.post === 'Ceia de Dia' && (() => {
                  const dayObj = roster[selectedCell.day] || {};
                  const copeiro = dayObj['Copeiro de Dia'];
                  const aux = dayObj['Auxiliar do Copeiro de Dia'];
                  if (!copeiro && !aux) return null;

                  return (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-blue-600" />
                          Escalados no Dia (Copeiro / Auxiliar)
                        </span>
                        <span className="text-[9px] bg-blue-200/70 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                          Regra da Ceia
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-800 leading-snug">
                        Para a <strong>Ceia de Dia</strong>, pode ser escolhido o Copeiro ou o Auxiliar já escalado neste dia:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {copeiro && (
                          <button
                            type="button"
                            onClick={() => handleAssignMilitary(copeiro.militaryId)}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all shadow-2xs group"
                          >
                            <div>
                              <span className="text-[9px] font-bold text-blue-600 uppercase block">Copeiro de Dia</span>
                              <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                                {copeiro.rank}. {copeiro.militaryName}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 group-hover:bg-blue-100 px-2 py-1 rounded">
                              Escalar
                            </span>
                          </button>
                        )}
                        {aux && (
                          <button
                            type="button"
                            onClick={() => handleAssignMilitary(aux.militaryId)}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all shadow-2xs group"
                          >
                            <div>
                              <span className="text-[9px] font-bold text-blue-600 uppercase block">Aux. Copeiro de Dia</span>
                              <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                                {aux.rank}. {aux.militaryName}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 group-hover:bg-blue-100 px-2 py-1 rounded">
                              Escalar
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Filter list of eligible military */}
                {militaryList
                  .filter(mil => {
                    const isWeekend = isDayWeekend(selectedCell.day);
                    if (isWeekend) {
                      return mil.type === 'EV' || mil.type === 'Ambas';
                    } else {
                      return mil.type === 'EP' || mil.type === 'Ambas';
                    }
                  })
                  .map(mil => {
                    const dayObj = roster[selectedCell.day] || {};
                    const otherPostAssigned = Object.keys(dayObj).find(
                      p => p !== selectedCell.post && dayObj[p]?.militaryId === mil.id
                    );
                    const isOverlapAllowed = !!otherPostAssigned && isAllowedOverlap(selectedCell.post, otherPostAssigned);
                    const isOccupiedToday = !!otherPostAssigned && !isOverlapAllowed;
                    const isDisabled = mil.status === 'Afastado' || isOccupiedToday;

                    return (
                      <button
                        key={mil.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleAssignMilitary(mil.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-all",
                          isDisabled 
                            ? "border-slate-100 bg-slate-50/50 opacity-50 cursor-not-allowed" 
                            : isOverlapAllowed
                              ? "border-blue-200 bg-blue-50/30 hover:border-blue-400 hover:bg-blue-50/60"
                              : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-8 h-8 rounded flex items-center justify-center font-bold font-mono text-[10px]",
                            isOverlapAllowed ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
                          )}>
                            {mil.dutyCount}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">{mil.rank}. {mil.fullName}</p>
                            <p className="text-[10px] text-slate-400">
                              {getSpecialtyDisplayName(mil.specialty)}
                              {mil.specialtySecondary ? ` / ${getSpecialtyDisplayName(mil.specialtySecondary)}` : ''}
                              {mil.status === 'Afastado' ? ' — Afastado' : ''}
                              {isOverlapAllowed ? ` — Escalado hoje em ${getSpecialtyDisplayName(otherPostAssigned!)} (Permitido para Ceia)` : isOccupiedToday ? ` — Já Escalado em ${getSpecialtyDisplayName(otherPostAssigned!)}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          isOverlapAllowed ? "text-blue-700" : "text-slate-400"
                        )}>
                          {isOverlapAllowed 
                            ? 'Permitido (Ceia)' 
                            : isOccupiedToday 
                              ? 'INDISPONÍVEL' 
                              : mil.dutyCount === 0 
                                ? 'Sem Serviços' 
                                : `${mil.dutyCount} sv`}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {editingMil && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
          >
            <div className="px-6 py-4 bg-slate-100 border-b border-slate-200/80 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Editar Cadastro do Militar</h4>
                <p className="text-xs text-slate-500">{editingMil.rank}. {editingMil.name}</p>
              </div>
              <button 
                onClick={() => setEditingMil(null)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEditMilitary(editingMil);
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Posto/Graduação</label>
                  <select
                    value={editingMil.rank}
                    onChange={e => setEditingMil({ ...editingMil, rank: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                  >
                    <option value="Ten">Tenente (Ten)</option>
                    <option value="Sgt">Sargento (Sgt)</option>
                    <option value="Cb">Cabo (Cb)</option>
                    <option value="Sd">Soldado (Sd)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Nome de Guerra</label>
                  <input 
                    type="text"
                    value={editingMil.name}
                    onChange={e => setEditingMil({ ...editingMil, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Nome Completo</label>
                <input 
                  type="text"
                  value={editingMil.fullName}
                  onChange={e => setEditingMil({ ...editingMil, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-700 block">Antiguidade</label>
                  <input 
                    type="text"
                    value={editingMil.matricula}
                    onChange={e => setEditingMil({ ...editingMil, matricula: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-700 block">Função Primária</label>
                  <select
                    value={editingMil.specialty}
                    onChange={e => setEditingMil({ ...editingMil, specialty: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                  >
                    <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                    <option value="Copeiro de Dia">Copeiro de Dia</option>
                    <option value="Auxiliar do Copeiro de Dia">Auxiliar do Copeiro de Dia</option>
                    <option value="Ceia de Dia">Ceia de Dia</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-700 block">Função Secundária</label>
                  <select
                    value={editingMil.specialtySecondary || 'Nenhuma'}
                    onChange={e => setEditingMil({ ...editingMil, specialtySecondary: e.target.value === 'Nenhuma' ? undefined : e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                  >
                    <option value="Nenhuma">Nenhuma</option>
                    <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                    <option value="Copeiro de Dia">Copeiro de Dia</option>
                    <option value="Auxiliar do Copeiro de Dia">Auxiliar do Copeiro de Dia</option>
                    <option value="Ceia de Dia">Ceia de Dia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Tipo de Escala</label>
                  <select
                    value={editingMil.type}
                    onChange={e => setEditingMil({ ...editingMil, type: e.target.value as 'EP' | 'EV' | 'Ambas' })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                  >
                    <option value="Ambas">Ambas (Preta e Vermelha)</option>
                    <option value="EP">Apenas Escala Preta (Úteis)</option>
                    <option value="EV">Apenas Vermelha (Fins Semana)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Serviços Cumpridos</label>
                  <input 
                    type="number"
                    min="0"
                    value={editingMil.dutyCount}
                    onChange={e => setEditingMil({ ...editingMil, dutyCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Situação de Prontidão</label>
                <select
                  value={editingMil.status}
                  onChange={e => setEditingMil({ ...editingMil, status: e.target.value as 'Ativo' | 'Afastado' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                >
                  <option value="Ativo">Ativo / Pronto</option>
                  <option value="Afastado">Afastado (LTS / Licença)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setEditingMil(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-500"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:opacity-95 text-white rounded-lg text-xs font-semibold"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
