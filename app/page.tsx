'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  CalendarPlus,
  CheckCircle2,
  UserX, 
  Settings, 
  Plus, 
  Search, 
  History, 
  ArrowLeftRight, 
  RotateCcw,
  Check, 
  X, 
  Menu, 
  Bell, 
  ShieldAlert, 
  Sliders, 
  Trash2,
  HelpCircle,
  LogOut,
  UserCheck,
  MousePointerClick,
  Eraser,
  UtensilsCrossed
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import CardapioSemanal from '@/components/CardapioSemanal';
import SyncStatus from '@/components/SyncStatus';
import { useCloudData } from '@/hooks/use-cloud-data';
import { clean, equal } from '@/lib/persistence/core';
import { validateRoster } from '@/lib/persistence/validation';

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

export interface HolidayDate {
  id: string;
  date: string; // ISO format 'YYYY-MM-DD'
  name: string;
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
    specialty: 'Copeiro de Dia',
    specialtySecondary: 'Auxiliar do Copeiro de Dia',
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

const initialHolidays: HolidayDate[] = [
  { id: 'hol-1', date: '2026-09-11', name: 'Data Especial / Feriado' },
  { id: 'hol-2', date: '2026-10-12', name: 'N. Sra. Aparecida (Feriado Nacional)' },
  { id: 'hol-3', date: '2026-11-02', name: 'Finados (Feriado Nacional)' },
  { id: 'hol-4', date: '2026-11-15', name: 'Proclamação da República' }
];

const ddmmyyyyToIso = (d: string): string => {
  if (!d) return '';
  const parts = d.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return d;
};

const isoToDdmmyyyy = (iso: string): string => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return iso;
};

const getDayDetails = (dayKey: string, customHolidays: HolidayDate[] = []) => {
  const iso = ddmmyyyyToIso(dayKey);
  const parts = iso.split('-').map(Number);
  const y = parts[0] || 2026;
  const m = parts[1] || 9;
  const d = parts[2] || 1;
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeekIndex = dateObj.getDay(); // 0 = Dom, 6 = Sáb
  const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
  const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayNamesFull = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  
  const holiday = customHolidays.find(h => h.date === iso || isoToDdmmyyyy(h.date) === dayKey);
  const isHoliday = !!holiday;

  return {
    dayKey,
    iso,
    dateObj,
    dayOfWeekIndex,
    isWeekend,
    isHoliday,
    holidayTitle: holiday?.name,
    shortDay: dayNamesShort[dayOfWeekIndex] || 'Dia',
    fullDay: dayNamesFull[dayOfWeekIndex] || 'Dia'
  };
};

const generateWeekendAndHolidayDays = (
  customHolidays: HolidayDate[] = initialHolidays,
  startMonthIso: string = '2026-09-01',
  endMonthIso: string = '2026-12-31'
): string[] => {
  const [sy, sm, sd] = startMonthIso.split('-').map(Number);
  const [ey, em, ed] = endMonthIso.split('-').map(Number);
  const curr = new Date(sy, (sm || 1) - 1, sd || 1);
  const end = new Date(ey, (em || 1) - 1, ed || 1);

  const daysSet = new Set<string>();

  while (curr <= end) {
    const dayOfWeek = curr.getDay();
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    const key = `${d}/${m}/${y}`;

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = customHolidays.some(h => h.date === iso);

    if (isWeekend || isHoliday) {
      daysSet.add(key);
    }
    curr.setDate(curr.getDate() + 1);
  }

  // Also include any holidays explicitly registered
  customHolidays.forEach(h => {
    if (h.date) {
      daysSet.add(isoToDdmmyyyy(h.date));
    }
  });

  const sorted = Array.from(daysSet).sort((a, b) => {
    return ddmmyyyyToIso(a).localeCompare(ddmmyyyyToIso(b));
  });

  return sorted;
};

const createEmptyRoster = (days?: string[]): WeekRoster => {
  const r: WeekRoster = {};
  const daysList = days && days.length > 0 ? days : generateWeekendAndHolidayDays(initialHolidays);
  daysList.forEach(day => {
    r[day] = {
      'Cozinheiro de Dia': null,
      'Copeiro de Dia': null,
      'Ceia de Dia': null,
      'Auxiliar do Copeiro de Dia': null
    };
  });
  return r;
};

const initialRoster: WeekRoster = createEmptyRoster();

const initialLogs: LogEntry[] = [
  { time: '14:47', text: 'Efetivo inicializado. Escala configurada para Finais de Semana e Feriados.' }
];

const getAntiguidadeValue = (str: string) => {
  if (!str) return 999999;
  const digits = str.replace(/\D/g, '');
  if (!digits) return 999999;
  return parseInt(digits, 10);
};

const getDayNumberFromISO = (isoStr: string): number => {
  const parts = isoStr.split('-');
  if (parts.length < 3) return 1;
  const num = parseInt(parts[2], 10);
  return isNaN(num) ? 1 : num;
};

interface RosterDocument {
  id: string;
  militaryList: Military[];
  absences: Absence[];
  roster: WeekRoster;
  changelogs: LogEntry[];
  customHolidays: HolidayDate[];
}
const initialRosterDocuments: RosterDocument[] = [{
  id: 'principal', militaryList: initialMilitary, absences: initialAbsences,
  roster: initialRoster, changelogs: initialLogs, customHolidays: initialHolidays
}];
function readLegacyRoster(): RosterDocument[] | null {
  const keys = ['dr_military', 'dr_absences', 'dr_roster', 'dr_logs', 'dr_holidays'] as const;
  const raw = keys.map(key => localStorage.getItem(key));
  if (raw.every(value => value === null)) return null;
  return [{
    id: 'principal',
    militaryList: raw[0] === null ? initialMilitary : JSON.parse(raw[0]),
    absences: raw[1] === null ? initialAbsences : JSON.parse(raw[1]),
    roster: raw[2] === null ? initialRoster : JSON.parse(raw[2]),
    changelogs: raw[3] === null ? initialLogs : JSON.parse(raw[3]),
    customHolidays: raw[4] === null ? initialHolidays : JSON.parse(raw[4])
  }];
}

export default function RosterApp() {
  const rosterCloud = useCloudData({
    name: 'roster', initial: initialRosterDocuments,
    validate: validateRoster, legacy: readLegacyRoster
  });
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const { militaryList, absences, roster, changelogs, customHolidays } =
    rosterCloud.state.records[0] ?? initialRosterDocuments[0];
  const [activeTab, setActiveTab] = useState<'dashboard' | 'efetivo' | 'afastamentos' | 'cardapio'>('dashboard');
  
  // Sidebar state for mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tab switching helper with automatic modal and selection cleanup
  const switchTab = (tab: 'dashboard' | 'efetivo' | 'afastamentos' | 'cardapio') => {
    setActiveTab(tab);
    setIsAssigning(false);
    setSelectedCell(null);
    setEditingMil(null);
    setSidebarOpen(false);
  };

  // ----------------------------------------------------
  // TAB 1: GESTÃO DE ESCALAS (Independent State)
  // ----------------------------------------------------
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('2026-09-18');
  const [newHolidayName, setNewHolidayName] = useState('');

  const [viewOption, setViewOption] = useState<'4 Finais de Semana' | '8 Finais de Semana' | 'Todos' | 'Personalizado'>('Todos');
  const [startDateFilter, setStartDateFilter] = useState('2026-09-01');
  const [endDateFilter, setEndDateFilter] = useState('2026-11-30');
  const [filterMilitaryName, setFilterMilitaryName] = useState('');
  const [filterFunction, setFilterFunction] = useState('Todas as Funções');
  const [filterScaleType, setFilterScaleType] = useState<'Todos' | 'Fins de Semana' | 'Feriados'>('Todos');
  const [selectedCell, setSelectedCell] = useState<{ day: string; post: string } | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedAssignType, setSelectedAssignType] = useState<'EP' | 'EV' | 'PERM' | 'DISP'>('EV');
  const [modalSearch, setModalSearch] = useState('');

  // ----------------------------------------------------
  // TAB 2: AFASTAMENTOS (Independent State)
  // ----------------------------------------------------
  const [absenceSearch, setAbsenceSearch] = useState('');
  const [absenceTypeFilter, setAbsenceTypeFilter] = useState('Todos');
  const [absentMilId, setAbsentMilId] = useState('');
  const [absenceType, setAbsenceType] = useState('Férias');
  const [absenceStart, setAbsenceStart] = useState('');
  const [absenceEnd, setAbsenceEnd] = useState('');
  const [absenceIndefinite, setAbsenceIndefinite] = useState(false);
  const [absenceNotes, setAbsenceNotes] = useState('');
  const [absenceAutoUpdate, setAbsenceAutoUpdate] = useState(true);

  // ----------------------------------------------------
  // TAB 3: GERENCIAR EFETIVO (Independent State)
  // ----------------------------------------------------
  const [efetivoSearch, setEfetivoSearch] = useState('');
  const [efetivoFunctionFilter, setEfetivoFunctionFilter] = useState('Todas as Funções');
  const [efetivoStatusFilter, setEfetivoStatusFilter] = useState<'Todos' | 'Ativo' | 'Afastado'>('Todos');
  const [efetivoScaleFilter, setEfetivoScaleFilter] = useState<'Todas' | 'Ambas' | 'EP' | 'EV'>('Todas');
  
  // Military CRUD form states
  const [editingMil, setEditingMil] = useState<Military | null>(null);
  const [editingMilOriginal, setEditingMilOriginal] = useState<Military | null>(null);
  const [newMilRank, setNewMilRank] = useState('Sd');
  const [newMilName, setNewMilName] = useState('');
  const [newMilFullName, setNewMilFullName] = useState('');
  const [newMilMatricula, setNewMilMatricula] = useState('');
  const [newMilSpecialty, setNewMilSpecialty] = useState('Cozinheiro de Dia');
  const [newMilSpecialtySecondary, setNewMilSpecialtySecondary] = useState('Nenhuma');
  const [newMilScaleType, setNewMilScaleType] = useState<'EP' | 'EV' | 'Ambas'>('Ambas');
  const [newMilStatus, setNewMilStatus] = useState<'Ativo' | 'Afastado'>('Ativo');
  const [newMilDutyCount, setNewMilDutyCount] = useState(0);

  // Notification Toast state
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'info' }>({ show: false, msg: '', type: 'success' });

  // One versioned document keeps personnel, absences and assignments consistent.
  const saveState = (
    newMil: Military[],
    newAbs: Absence[],
    newRos: WeekRoster,
    newLogs: LogEntry[],
    newHolidays: HolidayDate[] = customHolidays
  ) => {
    return rosterCloud.controller.update([{
      id: 'principal', militaryList: newMil, absences: newAbs,
      roster: newRos, changelogs: newLogs, customHolidays: newHolidays
    }]);
  };

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    const pending = rosterCloud.controller.getSnapshot().pending;
    setToast({ show: true, msg: type === 'success' && pending ? msg + ' — envio ao servidor pendente.' : msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000);
  };

  const formatTimeNow = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const addLog = (text: string, currentLogsList?: LogEntry[]) => {
    const newEntry: LogEntry = { time: formatTimeNow(), text };
    const updated = [newEntry, ...(currentLogsList || changelogs)];
    return updated;
  };

  // ==========================================
  // LOGIC & ALGORITHMS
  // ==========================================

  // Helper: Check if a military has an active or scheduled absence covering a given day
  const isMilitaryAbsentOnDay = (militaryId: string, dayStr: string, activeAbsences: Absence[] = absences): boolean => {
    const dayISO = ddmmyyyyToIso(dayStr);
    return activeAbsences.some(a => {
      if (a.militaryId !== militaryId) return false;
      if (a.status !== 'ATIVO' && a.status !== 'AGENDADO') return false;
      if (a.indefinite) return dayISO >= a.startDate;
      return dayISO >= a.startDate && dayISO <= a.endDate;
    });
  };

  // ==========================================
  // OPERAÇÃO MANUAL DA ESCALA
  // ==========================================

  // Assign specific military manually
  const handleAssignMilitary = (milId: string | 'empty') => {
    if (!selectedCell) return;
    const { day, post } = selectedCell;

    const updatedRoster = clean(roster);
    const updatedMilList = clean(militaryList);
    let logsList = [...changelogs];

    if (milId !== 'empty' && isMilitaryAbsentOnDay(milId, day, absences)) {
      showToast('Militar afastado nesta data. Finalize ou ajuste o afastamento na aba Afastamentos antes de escalá-lo.', 'info');
      return;
    }

    const prevCell = updatedRoster[day] ? updatedRoster[day][post] : null;

    // Decrement previous duty count if existed
    if (prevCell && prevCell.militaryId) {
      const idx = updatedMilList.findIndex(m => m.id === prevCell.militaryId);
      if (idx !== -1) {
        updatedMilList[idx].dutyCount = Math.max(0, updatedMilList[idx].dutyCount - 1);
      }
    }

    if (milId === 'empty') {
      if (updatedRoster[day]) {
        updatedRoster[day][post] = null;
      }
      logsList = addLog(`Posto ${post} em ${day} foi desmarcado manualmente (posto vago).`, logsList);
    } else {
      const mil = updatedMilList.find(m => m.id === milId);
      if (mil) {
        const finalType = selectedAssignType === 'PERM' || selectedAssignType === 'DISP'
          ? selectedAssignType
          : 'EV';

        if (!updatedRoster[day]) updatedRoster[day] = {};
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

        const typeLabel = finalType === 'EV' ? 'Escala Vermelha' : finalType === 'PERM' ? 'Permuta' : 'Dispensa (LTS)';
        logsList = addLog(`${mil.rank}. ${mil.name} escalado manualmente (${typeLabel}) para ${post} em ${day}.`, logsList);
      }
    }
    if (!saveState(updatedMilList, absences, updatedRoster, logsList, customHolidays)) return;
    setIsAssigning(false);
    setSelectedCell(null);
    setModalSearch('');
    showToast('Escala atualizada com sucesso!');
  };

  const handleClearRoster = () => {
    if (!window.confirm('Deseja realmente desmarcar todas as alocações da escala? Todos os postos ficarão vagos para alocação manual.')) {
      return;
    }
    const emptyRoster = createEmptyRoster(daysToShow);
    const resetMilList = militaryList.map(mil => ({ ...mil, dutyCount: 0 }));
    const resetLogs = addLog('Todas as designações da escala foram desmarcadas para operação manual.', changelogs);
    if (!saveState(resetMilList, absences, emptyRoster, resetLogs, customHolidays)) return;
    showToast('Escala limpa com sucesso! Pronta para alocação manual.', 'success');
  };

  // CRUD: Add new military personnel
  const handleAddMilitary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilName || !newMilFullName || !newMilMatricula) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'info');
      return;
    }

    const newMil: Military = {
      id: `mil-${Date.now()}`,
      rank: newMilRank,
      name: newMilName,
      fullName: newMilFullName,
      matricula: newMilMatricula,
      specialty: newMilSpecialty,
      specialtySecondary: newMilSpecialtySecondary === 'Nenhuma' ? undefined : newMilSpecialtySecondary,
      status: newMilStatus,
      type: newMilScaleType,
      dutyCount: newMilDutyCount
    };

    const updated = [...militaryList, newMil];
    let logsList = addLog(`Novo militar adicionado: ${newMilRank}. ${newMilName} (${newMilSpecialty}${newMilSpecialtySecondary !== 'Nenhuma' ? ` / ${newMilSpecialtySecondary}` : ''}).`);
    if (!saveState(updated, absences, roster, logsList)) return;

    // Reset fields
    setNewMilName('');
    setNewMilFullName('');
    setNewMilMatricula('');
    showToast(`${newMilRank}. ${newMilName} cadastrado com sucesso!`);
  };

  // CRUD: Delete military personnel and clean up rosters
  const handleDeleteMilitary = (id: string) => {
    const target = militaryList.find(m => m.id === id);
    if (!target) return;

    if (window.confirm(`Tem certeza que deseja excluir o militar ${target.rank}. ${target.name}?`)) {
      const updatedMil = militaryList.filter(m => m.id !== id);
      const updatedAbs = absences.filter(a => a.militaryId !== id);

      // Clean slots in roster
      const updatedRoster = clean(roster);
      Object.keys(updatedRoster).forEach(day => {
        Object.keys(updatedRoster[day]).forEach(post => {
          const cell = updatedRoster[day][post];
          if (cell && cell.militaryId === id) {
            updatedRoster[day][post] = null;
          }
        });
      });

      let logsList = addLog(`Militar excluído do sistema: ${target.rank}. ${target.name}.`);
      if (!saveState(updatedMil, updatedAbs, updatedRoster, logsList)) return;
      showToast(`Militar ${target.name} removido com sucesso.`);
    }
  };

  // CRUD: Save edit of military personnel and synchronize with roster and absences
  const handleSaveEditMilitary = (mil: Military) => {
    if (!editingMilOriginal || !equal(militaryList.find(item => item.id === mil.id), editingMilOriginal)) {
      showToast('Este cadastro mudou em outro dispositivo. Seu formulário foi preservado; copie as alterações e reabra o cadastro atualizado.', 'info');
      return;
    }
    const updated = militaryList.map(m => m.id === mil.id ? mil : m);
    
    // Propagate military name and rank changes to absences
    const updatedAbs = absences.map(a => 
      a.militaryId === mil.id 
        ? { ...a, militaryName: mil.name, rank: mil.rank } 
        : a
    );

    // Propagate military name and rank changes to roster
    const updatedRoster = clean(roster);
    Object.keys(updatedRoster).forEach(day => {
      Object.keys(updatedRoster[day]).forEach(post => {
        const cell = updatedRoster[day][post];
        if (cell && cell.militaryId === mil.id) {
          updatedRoster[day][post] = {
            ...cell,
            militaryName: mil.name.toUpperCase(),
            rank: mil.rank
          };
        }
      });
    });

    let logsList = addLog(`Cadastro do militar ${mil.rank}. ${mil.name} atualizado.`);
    if (!saveState(updated, updatedAbs, updatedRoster, logsList)) return;
    setEditingMil(null);
    showToast('Dados e vínculos atualizados com sucesso!');
  };

  // Reset is an explicit, recoverable cloud operation, never an automatic deletion.
  const handleResetDatabase = () => {
    if (window.confirm('Redefinir militares, escalas, afastamentos e feriados para o modelo inicial? A alteração será sincronizada com os demais dispositivos.')) {
      if (!rosterCloud.controller.checkpoint()) return;
      const freshRoster = createEmptyRoster();
      if (!saveState(initialMilitary, initialAbsences, freshRoster, initialLogs, initialHolidays)) return;
      showToast('Redefinição registrada.');
    }
  };

  // Holiday management: Add new holiday/special date to schedule
  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate) {
      showToast('Selecione uma data para o feriado.', 'info');
      return;
    }

    const dayKey = isoToDdmmyyyy(newHolidayDate);
    const alreadyExists = customHolidays.some(h => h.date === newHolidayDate);
    if (alreadyExists) {
      showToast('Este feriado já está cadastrado!', 'info');
      return;
    }

    const holidayItem: HolidayDate = {
      id: `hol-${Date.now()}`,
      date: newHolidayDate,
      name: newHolidayName.trim() || 'Feriado / Data Especial'
    };

    const updatedHolidays = [...customHolidays, holidayItem].sort((a, b) => a.date.localeCompare(b.date));

    // Create empty slots for this holiday in the roster if not already present
    const updatedRoster = clean(roster);
    if (!updatedRoster[dayKey]) {
      updatedRoster[dayKey] = {
        'Cozinheiro de Dia': null,
        'Copeiro de Dia': null,
        'Ceia de Dia': null,
        'Auxiliar do Copeiro de Dia': null
      };
    }
    const updatedLogs = addLog(`Feriado cadastrado: ${dayKey} (${holidayItem.name}). Adicionado à escala operacional.`);
    if (!saveState(militaryList, absences, updatedRoster, updatedLogs, updatedHolidays)) return;

    setNewHolidayName('');
    setIsHolidayModalOpen(false);
    showToast(`Feriado ${dayKey} adicionado à escala com sucesso!`);
  };

  // Holiday management: Remove holiday
  const handleRemoveHoliday = (isoDate: string) => {
    const dayKey = isoToDdmmyyyy(isoDate);
    const target = customHolidays.find(h => h.date === isoDate);
    if (!target) return;

    if (window.confirm(`Deseja remover o feriado "${target.name}" (${dayKey}) da escala?`)) {
      const updatedHolidays = customHolidays.filter(h => h.date !== isoDate);

      // If it's not a weekend day (Sat/Sun), remove the day column from roster
      const [y, m, d] = isoDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      const updatedRoster = clean(roster);
      if (!isWeekend) {
        delete updatedRoster[dayKey];
      }
      const updatedLogs = addLog(`Feriado ${dayKey} (${target.name}) removido da escala.`);
      if (!saveState(militaryList, absences, updatedRoster, updatedLogs, updatedHolidays)) return;
      showToast(`Feriado ${dayKey} removido da escala.`);
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

    const newAbsence: Absence = {
      id: `afast-${Date.now()}`,
      militaryId: mil.id,
      militaryName: mil.name,
      rank: mil.rank,
      type: absenceType,
      startDate: absenceStart || new Date().toISOString().split('T')[0],
      endDate: absenceIndefinite ? 'Indefinido' : absenceEnd || new Date().toISOString().split('T')[0],
      indefinite: absenceIndefinite,
      notes: absenceNotes,
      autoUpdate: absenceAutoUpdate,
      status: 'ATIVO'
    };

    const updatedAbsences = [newAbsence, ...absences];
    const updatedMilList = clean(militaryList);

    // Mark military as Afastado
    const milIdx = updatedMilList.findIndex(m => m.id === mil.id);
    if (milIdx !== -1) {
      updatedMilList[milIdx].status = 'Afastado';
    }

    // Auto update roster if checked: replace their active slots with "Dispensa"
    const updatedRoster = clean(roster);
    if (absenceAutoUpdate) {
      Object.keys(updatedRoster).forEach(day => {
        const dayISO = ddmmyyyyToIso(day);
        const isInRange = newAbsence.indefinite 
          ? dayISO >= newAbsence.startDate 
          : (dayISO >= newAbsence.startDate && dayISO <= newAbsence.endDate);

        if (isInRange) {
          Object.keys(updatedRoster[day]).forEach(post => {
            const cell = updatedRoster[day][post];
            if (cell && cell.militaryId === mil.id && cell.type !== 'DISP') {
              if (milIdx !== -1) {
                updatedMilList[milIdx].dutyCount = Math.max(0, updatedMilList[milIdx].dutyCount - 1);
              }
              updatedRoster[day][post] = {
                militaryId: mil.id,
                militaryName: `${mil.rank} ${mil.name.toUpperCase()}`,
                rank: mil.rank,
                type: 'DISP'
              };
            }
          });
        }
      });
    }

    let logsList = addLog(`Registrado afastamento de ${mil.rank}. ${mil.name} (${absenceType}).`);
    if (!saveState(updatedMilList, updatedAbsences, updatedRoster, logsList, customHolidays)) return;

    // Reset Form
    setAbsentMilId('');
    setAbsenceNotes('');
    showToast(`Afastamento de ${mil.name} registrado com sucesso!`);
  };

  // Terminate a leave early
  const handleEndAbsence = (id: string) => {
    const abs = absences.find(a => a.id === id);
    if (!abs) return;

    const updatedAbsences = absences.filter(a => a.id !== id);
    const updatedMilList = clean(militaryList);

    // Set military back to Ativo only if no other active absences remain
    const hasOtherAbsences = updatedAbsences.some(a => a.militaryId === abs.militaryId);
    const milIdx = updatedMilList.findIndex(m => m.id === abs.militaryId);
    if (milIdx !== -1 && !hasOtherAbsences) {
      updatedMilList[milIdx].status = 'Ativo';
    }

    // Clean dispensa entries in roster
    const updatedRoster = clean(roster);
    Object.keys(updatedRoster).forEach(day => {
      Object.keys(updatedRoster[day]).forEach(post => {
        const cell = updatedRoster[day][post];
        if (cell && cell.militaryId === abs.militaryId && cell.type === 'DISP') {
          updatedRoster[day][post] = null;
        }
      });
    });

    let logsList = addLog(`Retorno de afastamento homologado para ${abs.rank}. ${abs.militaryName}.`);
    if (!saveState(updatedMilList, updatedAbsences, updatedRoster, logsList)) return;
    showToast(`Militar ${abs.militaryName} retornou ao serviço ativo.`);
  };

  // Toggle military specialties
  const handleToggleSpecialty = (milId: string, spec: string) => {
    const updatedMilList = clean(militaryList);
    const idx = updatedMilList.findIndex(m => m.id === milId);
    if (idx !== -1) {
      updatedMilList[idx].specialty = spec;
      if (!saveState(updatedMilList, absences, roster, changelogs)) return;
      showToast(`Especialidade atualizada para ${updatedMilList[idx].rank}. ${updatedMilList[idx].name}`);
    }
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

  // Filter roster for display on Dashboard (Weekends & Custom Holidays)
  const daysToShow = Object.keys(roster)
    .sort((a, b) => ddmmyyyyToIso(a).localeCompare(ddmmyyyyToIso(b)))
    .filter((day, index) => {
      const details = getDayDetails(day, customHolidays);

      // Scale type filter
      if (filterScaleType === 'Fins de Semana' && !details.isWeekend) return false;
      if (filterScaleType === 'Feriados' && !details.isHoliday) return false;

      // View option filter
      if (viewOption === '4 Finais de Semana' && index >= 8) return false;
      if (viewOption === '8 Finais de Semana' && index >= 16) return false;
      if (viewOption === 'Personalizado') {
        const iso = details.iso;
        if (iso < startDateFilter || iso > endDateFilter) return false;
      }

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
            <span className="p-1.5 bg-[#1e382b] text-emerald-300 border border-emerald-700/60 rounded text-xs font-bold tracking-wider shadow-xs">GA</span>
            <h1 className="font-bold text-lg tracking-tight text-white">Gestão de Aprov</h1>
          </div>
          <button className="md:hidden p-1 hover:bg-slate-900 rounded" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Modules */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <button 
            onClick={() => switchTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left",
              activeTab === 'dashboard' ? "bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-600 font-semibold bg-slate-900" : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>Gestão de Escalas</span>
          </button>

          <button 
            onClick={() => switchTab('efetivo')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left",
              activeTab === 'efetivo' ? "bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-600 font-semibold bg-slate-900" : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
            )}
          >
            <UserCheck className="w-4 h-4" />
            <span>Gerenciar Efetivo</span>
          </button>

          <button 
            onClick={() => switchTab('afastamentos')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left",
              activeTab === 'afastamentos' ? "bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-600 font-semibold bg-slate-900" : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
            )}
          >
            <UserX className="w-4 h-4" />
            <span>Afastamentos</span>
          </button>

          <button 
            onClick={() => switchTab('cardapio')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left",
              activeTab === 'cardapio' ? "bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-600 font-semibold bg-slate-900" : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
            )}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Cardápio Semanal</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="px-4 py-4 border-t border-slate-900 space-y-1">
          <button className="flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors w-full rounded-lg hover:bg-slate-900/40">
            <HelpCircle className="w-4 h-4 text-emerald-500" />
            <span>Ajuda &amp; Informações</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors w-full rounded-lg hover:bg-slate-900/40">
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sair</span>
          </button>
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
              {activeTab === 'dashboard' && 'Gestão de Escalas'}
              {activeTab === 'efetivo' && 'Gerenciamento do Efetivo Militar'}
              {activeTab === 'afastamentos' && 'Gestão de Afastamentos'}
              {activeTab === 'cardapio' && 'Cardápio Semanal de Aprovisionamento'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Context-aware Search bar */}
            <div className="relative max-w-xs hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder={
                  activeTab === 'dashboard' 
                    ? "Filtrar militar na escala..." 
                    : activeTab === 'efetivo' 
                    ? "Buscar no efetivo militar..." 
                    : "Buscar afastamento ou militar..."
                } 
                value={
                  activeTab === 'dashboard' 
                    ? filterMilitaryName 
                    : activeTab === 'efetivo' 
                    ? efetivoSearch 
                    : absenceSearch
                }
                onChange={e => {
                  const val = e.target.value;
                  if (activeTab === 'dashboard') setFilterMilitaryName(val);
                  else if (activeTab === 'efetivo') setEfetivoSearch(val);
                  else setAbsenceSearch(val);
                }}
                className="w-64 pl-9 pr-4 py-1.5 bg-slate-100 rounded-full border-none focus:ring-1 focus:ring-emerald-800 text-xs text-slate-700"
              />
            </div>

            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>

            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>
        <SyncStatus title="Escalas e efetivo" state={rosterCloud.state} controller={rosterCloud.controller} />

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: DASHBOARD / GESTÃO DE ESCALAS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Header Title & Date Range */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Escalas</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                      Finais de Semana & Feriados
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mt-0.5">
                    Organização exclusiva dos finais de semana (sábado e domingo) e datas comemorativas / feriados cadastrados
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => setIsHolidayModalOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 border border-[#1e382b]/30 bg-emerald-50 hover:bg-emerald-100/80 text-[#1e382b] rounded-lg font-semibold text-xs transition-all shadow-xs"
                    title="Cadastrar nova data especial ou feriado na escala"
                  >
                    <CalendarPlus className="w-4 h-4 text-[#1e382b]" />
                    <span>Cadastrar Feriado</span>
                  </button>

                  <button 
                    onClick={handleClearRoster}
                    className="flex items-center gap-2 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition-all shadow-xs"
                    title="Limpar todas as designações da escala para recomeçar alocação manual"
                  >
                    <Eraser className="w-4 h-4 text-slate-500" />
                    <span>Limpar Escala</span>
                  </button>

                  <button 
                    onClick={handleResetDatabase}
                    className="flex items-center gap-2 px-3.5 py-2 border border-rose-200 bg-rose-50/50 text-rose-700 rounded-lg font-semibold text-xs hover:bg-rose-100 transition-all shadow-xs"
                    title="Redefinir escala e dados para o padrão"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Redefinir</span>
                  </button>
                </div>
              </div>

              {/* Manual Operation Notice Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1e382b]/10 flex items-center justify-center text-[#1e382b] shrink-0">
                    <MousePointerClick className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Operação Manual da Escala
                    </p>
                    <p className="text-[11px] text-slate-500">
                      A designação é totalmente manual e não aplica rodízio, prioridade, especialidade, contagem de serviços ou regra entre dias. Apenas afastamentos cadastrados para a data impedem a seleção.
                    </p>
                  </div>
                </div>
                {customHolidays.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-[#1e382b] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-[#1e382b]" />
                    <span><strong>{customHolidays.length}</strong> feriado(s) na escala</span>
                  </div>
                )}
              </div>

              {/* Filter Row */}
              <div className="flex flex-col gap-4 p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Função</label>
                    <select 
                      value={filterFunction}
                      onChange={e => setFilterFunction(e.target.value)}
                      className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-800 bg-white"
                    >
                      <option>Todas as Funções</option>
                      <option>Cozinheiro de Dia</option>
                      <option>Copeiro de Dia</option>
                      <option>Auxiliar do Copeiro de Dia</option>
                      <option>Ceia de Dia</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visualização de Período</label>
                    <select 
                      value={viewOption}
                      onChange={e => setViewOption(e.target.value as 'Todos' | '4 Finais de Semana' | '8 Finais de Semana' | 'Personalizado')}
                      className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-800 bg-white font-semibold text-slate-700"
                    >
                      <option value="Todos">Todos os Dias Cadastrados</option>
                      <option value="4 Finais de Semana">Próximos 4 Finais de Semana</option>
                      <option value="8 Finais de Semana">Próximos 8 Finais de Semana</option>
                      <option value="Personalizado">Período Personalizado</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome do Militar</label>
                    <input 
                      type="text" 
                      placeholder="Ex: SILVA, COSTA..." 
                      value={filterMilitaryName}
                      onChange={e => setFilterMilitaryName(e.target.value)}
                      className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filtrar Dias</label>
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden h-full">
                      <button 
                        onClick={() => setFilterScaleType('Todos')}
                        className={cn("flex-1 text-xs font-semibold py-2 transition-colors", filterScaleType === 'Todos' ? "bg-[#1e382b] text-white" : "hover:bg-slate-100 text-slate-600")}
                      >
                        Todos
                      </button>
                      <button 
                        onClick={() => setFilterScaleType('Fins de Semana')}
                        className={cn("flex-1 text-xs font-semibold border-l border-slate-200 py-2 transition-colors", filterScaleType === 'Fins de Semana' ? "bg-[#1e382b] text-white" : "hover:bg-slate-100 text-slate-600")}
                      >
                        Fins de Semana
                      </button>
                      <button 
                        onClick={() => setFilterScaleType('Feriados')}
                        className={cn("flex-1 text-xs font-semibold border-l border-slate-200 py-2 transition-colors", filterScaleType === 'Feriados' ? "bg-[#1e382b] text-white" : "hover:bg-slate-100 text-slate-600")}
                      >
                        Feriados
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
                        className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-800 bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-full md:w-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Data Final</span>
                      <input 
                        type="date" 
                        value={endDateFilter}
                        onChange={e => setEndDateFilter(e.target.value)}
                        className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-800 bg-white"
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-4 md:mt-0 font-medium">
                      Exibindo dias cadastrados entre <strong className="text-slate-800">{isoToDdmmyyyy(startDateFilter)}</strong> e <strong className="text-slate-800">{isoToDdmmyyyy(endDateFilter)}</strong>.
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
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      <span>Escala Vermelha (Fim de Semana / Feriado)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Feriado / Data Especial</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <span>Afastado / LTS</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span>Permuta</span>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">Clique em qualquer posto vazio para alocar manualmente</span>
                </div>

                {/* Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100/60">
                        <th className="w-52 border-b border-r border-slate-200 p-4 text-left font-semibold text-xs uppercase tracking-wider text-slate-500 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                          Função / Posto
                        </th>
                        
                        {/* Day headers */}
                        {daysToShow.map(day => {
                          const details = getDayDetails(day, customHolidays);
                          return (
                            <th key={day} className={cn(
                              "p-3 border-b border-r border-slate-200 text-center min-w-[135px] transition-colors relative",
                              details.isHoliday ? "bg-amber-50/70" : "bg-rose-50/40"
                            )}>
                              <div className="flex items-center justify-center gap-1">
                                <p className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider",
                                  details.isHoliday ? "text-amber-800" : "text-rose-600"
                                )}>
                                  {details.shortDay}
                                </p>
                                {details.isHoliday && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded font-bold">
                                    Feriado
                                  </span>
                                )}
                                {details.isHoliday && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveHoliday(details.iso);
                                    }}
                                    title={`Remover feriado ${day}`}
                                    className="w-4 h-4 rounded hover:bg-amber-200 text-amber-800 flex items-center justify-center transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className={cn(
                                "text-sm font-black leading-tight mt-0.5",
                                details.isHoliday ? "text-amber-950" : "text-slate-900"
                              )}>
                                {day}
                              </p>
                              {details.holidayTitle && (
                                <p className="text-[10px] font-semibold text-amber-800 truncate max-w-[125px] mx-auto mt-0.5" title={details.holidayTitle}>
                                  {details.holidayTitle}
                                </p>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                      
                      {/* Grid Rows */}
                      {['Cozinheiro de Dia', 'Copeiro de Dia', 'Auxiliar do Copeiro de Dia', 'Ceia de Dia'].map(post => {
                        if (filterFunction !== 'Todas as Funções' && filterFunction !== post) return null;

                        return (
                          <tr key={post} className="hover:bg-slate-50/50 group transition-colors">
                            <td className="font-bold text-xs text-slate-800 p-4 sticky left-0 bg-white border-r border-slate-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.02)] z-10">
                              <span>{post}</span>
                            </td>

                            {daysToShow.map(day => {
                              const cell = roster[day] ? roster[day][post] : null;
                              const details = getDayDetails(day, customHolidays);

                              // Highlight search matching
                              const isHighlighted = filterMilitaryName && cell && cell.militaryName.includes(filterMilitaryName.toUpperCase());

                              return (
                                <td 
                                  key={day} 
                                  onClick={() => { setSelectedCell({ day, post }); setIsAssigning(true); }}
                                  className={cn(
                                    "p-2.5 border-r border-slate-200/80 text-center cursor-pointer transition-all hover:bg-emerald-50/30",
                                    details.isHoliday ? "bg-amber-50/20 hover:bg-amber-100/20" : "bg-rose-50/10 hover:bg-rose-100/10",
                                    isHighlighted ? "bg-yellow-100/80 ring-2 ring-yellow-400 ring-inset" : ""
                                  )}
                                >
                                  {cell ? (
                                    <div className={cn(
                                      "px-3 py-2 rounded-lg text-[11px] font-bold flex flex-col text-left justify-center shadow-xs transition-transform group-hover:scale-[1.01]",
                                      cell.type === 'EV' && "bg-rose-600 text-white",
                                      cell.type === 'EP' && "bg-[#1e382b] text-white",
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
                          className="bg-emerald-800 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${complianceRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* SEÇÃO CONSOLIDADA: GESTÃO DA ESCALA VERMELHA (FINS DE SEMANA E FERIADOS) */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-base">Escala Vermelha (Fins de Semana e Feriados)</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                          {militaryList.length} Militares Cadastrados
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Preenchimento manual sem rodízio ou prioridade automática. Somente afastamentos registrados na aba própria bloqueiam a seleção na respectiva data.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  {/* Personnel table */}
                  <div className="col-span-12 lg:col-span-7 bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                    <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-100/60 flex justify-between items-center">
                      <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Efetivo Cadastrado para Alocação Manual</span>
                      <span className="text-[11px] text-slate-400">Referência cadastral; não limita a seleção</span>
                    </div>
                    <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-white border-b border-slate-200 z-10 shadow-2xs">
                          <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="p-3">Militar</th>
                            <th className="p-3">Função Atribuída</th>
                            <th className="p-3 text-center">Tipo</th>
                            <th className="p-3 text-right">Serviços</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 bg-white">
                          {militaryList.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center font-bold text-[10px] text-rose-700">
                                    {m.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800 text-xs">{m.rank}. {m.fullName}</p>
                                    <p className="text-[10px] text-slate-400">{m.matricula} — {m.status}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <select
                                  value={m.specialty}
                                  onChange={(e) => handleToggleSpecialty(m.id, e.target.value)}
                                  className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden bg-white shadow-2xs"
                                >
                                  <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                                  <option value="Copeiro de Dia">Copeiro de Dia</option>
                                  <option value="Auxiliar do Copeiro de Dia">Auxiliar do Copeiro de Dia</option>
                                  <option value="Ceia de Dia">Ceia de Dia</option>
                                </select>
                              </td>
                              <td className="p-3 text-center">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  {m.type === 'Ambas' ? 'Ambas' : 'Vermelha'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-slate-700">
                                {m.dutyCount} sv
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Rules & Changelog */}
                  <div className="col-span-12 lg:col-span-5 space-y-4">
                    {/* Rules config */}
                    {/* Operação Manual & Resumo */}
                    <div className="bg-[#1e382b] text-white rounded-xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-bold text-sm">Operação Manual do Efetivo</h5>
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                      </div>

                      <div className="space-y-3">
                        <div className="bg-white/10 p-3.5 rounded-lg">
                          <label className="block text-[10px] font-bold text-emerald-200 uppercase tracking-wider mb-1">
                            Militares Cadastrados
                          </label>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-black text-white">{militaryList.length}</span>
                            <span className="text-xs text-emerald-200">{militaryList.filter(m => m.status === 'Ativo').length} ativos</span>
                          </div>
                        </div>

                        <div className="bg-white/10 p-3.5 rounded-lg">
                          <label className="block text-[10px] font-bold text-emerald-200 tracking-wider mb-1">POSTOS OPERACIONAIS</label>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">4 Funções / Dia</span>
                            <span className="text-xs text-emerald-200/80">Alocação 100% manual</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/15">
                          <p className="text-[10px] font-bold text-emerald-200 uppercase mb-2">Funções Disponíveis</p>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-emerald-100">Cozinha / Ceia</span>
                            <span className="font-semibold text-white">Cozinheiro & Ceia de Dia</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-100">Copa / Apoio</span>
                            <span className="font-semibold text-white">Copeiro & Auxiliar</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Changelog preview */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                      <div className="flex items-center gap-2 mb-3 text-slate-400">
                        <History className="w-4 h-4 text-slate-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Histórico de Alterações Manuais</span>
                      </div>
                      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                        {changelogs.slice(0, 5).map((log, i) => (
                          <div key={i} className="flex gap-2.5 text-xs border-b border-slate-100 pb-1.5">
                            <span className="text-slate-400 font-semibold shrink-0 text-[11px]">{log.time}</span>
                            <p className="text-slate-600 text-xs truncate">{log.text}</p>
                          </div>
                        ))}
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
                      <UserCheck className="w-5 h-5 text-[#1e382b]" />
                      <h4 className="font-bold text-slate-800 text-sm">Resumo de Carga de Serviços</h4>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Dados acumulados exibidos apenas para consulta. Eles não alteram, ordenam nem priorizam a seleção manual dos militares.
                    </p>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs">
                        <span className="text-slate-500">Média de Serviços / Militar</span>
                        <span className="font-bold text-slate-800">
                          {militaryList.length > 0 ? (militaryList.reduce((acc, m) => acc + m.dutyCount, 0) / militaryList.length).toFixed(1) : 0} sv
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
                    *Métricas calculadas em tempo real com base na operação manual.
                  </div>
                </div>

                {/* Workload graph card */}
                <div className="lg:col-span-8 bg-white border border-slate-200 p-6 rounded-xl shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800 text-sm">Distribuição de Carga de Trabalho (Acumulado de Serviços)</h4>
                    <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">Indicador Informativo</span>
                  </div>
                  
                  {/* Visual Bar Graph */}
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2">
                    {militaryList.map(mil => {
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
                                    mil.dutyCount <= 2 ? "bg-emerald-600" : mil.dutyCount <= 4 ? "bg-emerald-800" : "bg-amber-600"
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

          {/* TAB 2: GESTÃO DE AFASTAMENTOS */}
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
                      {String(absences.filter(a => {
                        if (a.indefinite || !a.endDate || a.endDate === 'Indefinido') return false;
                        const endDay = getDayNumberFromISO(a.endDate);
                        return endDay >= 1 && endDay <= 7;
                      }).length).padStart(2, '0')}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Normalização gradual da escala</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <UserCheck className="w-6 h-6" />
                  </div>
                </div>

                {(() => {
                  const pendingSubstitutions = Object.values(roster)
                    .flatMap(dayObj => Object.values(dayObj))
                    .filter(cell => cell && cell.type === 'DISP').length;
                  return (
                    <div 
                      onClick={() => switchTab('dashboard')}
                      className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all"
                      title="Clique para ir à Gestão de Escalas e suprir postos vagos"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Substituições Pendentes</span>
                        <h3 className={cn("text-3xl font-black", pendingSubstitutions > 0 ? "text-rose-600" : "text-slate-800")}>
                          {String(pendingSubstitutions).padStart(2, '0')}
                        </h3>
                        <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                          <ArrowLeftRight className={cn("w-3.5 h-3.5", pendingSubstitutions > 0 && "animate-pulse")} />
                          <span>{pendingSubstitutions > 0 ? `${pendingSubstitutions} vaga(s) de dispensa na escala` : 'Nenhuma substituição pendente'}</span>
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <ArrowLeftRight className="w-6 h-6" />
                      </div>
                    </div>
                  );
                })()}
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
                        className="w-full border border-slate-200 rounded-lg text-xs p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-800"
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
                        className="w-full border border-slate-200 rounded-lg text-xs p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-800"
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
                          className="w-full border border-slate-200 rounded-lg text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-800 text-slate-600"
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
                            "w-full border border-slate-200 rounded-lg text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-800 text-slate-600",
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
                        className="w-4 h-4 text-emerald-800 focus:ring-emerald-800 rounded border-slate-300"
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
                        className="w-full border border-slate-200 rounded-lg text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-800"
                      />
                    </div>

                    {/* Checkbox auto update */}
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="check-auto"
                          checked={absenceAutoUpdate}
                          onChange={e => setAbsenceAutoUpdate(e.target.checked)}
                          className="w-4 h-4 text-emerald-800 focus:ring-emerald-800 rounded border-slate-300"
                        />
                        <label htmlFor="check-auto" className="text-xs text-emerald-950 font-semibold">Atualização Automática</label>
                      </div>
                      <p className="text-[10px] text-emerald-800/80 leading-tight">
                        Atualiza as escalas futuras automaticamente removendo o militar dos serviços e sinalizando as vagas.
                      </p>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-[#1e382b] hover:bg-[#162b21] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirmar Afastamento</span>
                    </button>
                  </div>
                </form>

                {/* Absence Table List */}
                <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Afastamentos Ativos &amp; Agendados</h4>
                      <p className="text-[11px] text-slate-400">Total de {absences.length} registro(s)</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Filtrar afastamentos..." 
                          value={absenceSearch}
                          onChange={e => setAbsenceSearch(e.target.value)}
                          className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 w-36 sm:w-44 focus:outline-none focus:ring-1 focus:ring-emerald-800"
                        />
                      </div>
                      <select 
                        value={absenceTypeFilter}
                        onChange={e => setAbsenceTypeFilter(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-800 font-medium"
                      >
                        <option value="Todos">Todos os Tipos</option>
                        <option value="Férias">Férias</option>
                        <option value="LTS / Atestado Médico">LTS / Atestado</option>
                        <option value="Licença Prêmio">Licença Prêmio</option>
                        <option value="Missão Oficial">Missão Oficial</option>
                        <option value="Curso / Instrução">Curso / Instrução</option>
                        <option value="Dispensa Regulamentar">Dispensa</option>
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const filteredAbsences = absences.filter(abs => {
                      const matchesSearch = !absenceSearch || 
                        abs.militaryName.toLowerCase().includes(absenceSearch.toLowerCase()) ||
                        abs.rank.toLowerCase().includes(absenceSearch.toLowerCase()) ||
                        (abs.notes && abs.notes.toLowerCase().includes(absenceSearch.toLowerCase()));
                      const matchesType = absenceTypeFilter === 'Todos' || abs.type === absenceTypeFilter;
                      return matchesSearch && matchesType;
                    });

                    return (
                      <>
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
                              {filteredAbsences.map(abs => (
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
                              {filteredAbsences.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                                    {absences.length === 0 ? 'Nenhum afastamento registrado neste período.' : 'Nenhum afastamento encontrado com os filtros atuais.'}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-slate-400 text-xs font-medium">
                          <span>Exibindo {filteredAbsences.length} de {absences.length} afastamento(s)</span>
                          <div className="flex gap-1.5">
                            <button className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50" disabled>
                              Anterior
                            </button>
                            <button className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50" disabled>
                              Próxima
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: GERENCIAR EFETIVO MILITAR (CRUD) */}
          {activeTab === 'efetivo' && (() => {
            const filteredMilitaryList = militaryList
              .filter(mil => {
                const matchesSearch = !efetivoSearch || 
                  mil.name.toLowerCase().includes(efetivoSearch.toLowerCase()) || 
                  mil.fullName.toLowerCase().includes(efetivoSearch.toLowerCase()) ||
                  mil.matricula.toLowerCase().includes(efetivoSearch.toLowerCase());
                const matchesFunc = efetivoFunctionFilter === 'Todas as Funções' || mil.specialty === efetivoFunctionFilter || mil.specialtySecondary === efetivoFunctionFilter;
                const matchesStatus = efetivoStatusFilter === 'Todos' || mil.status === efetivoStatusFilter;
                const matchesScale = efetivoScaleFilter === 'Todas' || mil.type === efetivoScaleFilter;
                return matchesSearch && matchesFunc && matchesStatus && matchesScale;
              })
              .sort((a, b) => {
                const valA = getAntiguidadeValue(a.matricula);
                const valB = getAntiguidadeValue(b.matricula);
                if (valA !== valB) return valA - valB;
                return a.name.localeCompare(b.name);
              });

            return (
              <div className="grid grid-cols-12 gap-6">
                
                {/* Left Column: Personnel List */}
                <div className="col-span-12 lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
                  <div className="px-6 py-5 border-b border-slate-200/80 bg-slate-50 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Militares Cadastrados</h4>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {filteredMilitaryList.length} de {militaryList.length} militares exibidos
                      </p>
                    </div>
                    
                    {/* Independent localized search & filter */}
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Buscar nome ou matrícula..."
                          value={efetivoSearch}
                          onChange={e => setEfetivoSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white w-full sm:w-44 shadow-xs"
                        />
                      </div>

                      <select
                        value={efetivoFunctionFilter}
                        onChange={e => setEfetivoFunctionFilter(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden bg-white shadow-xs"
                      >
                        <option value="Todas as Funções">Funções: Todas</option>
                        <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                        <option value="Copeiro de Dia">Copeiro de Dia</option>
                        <option value="Auxiliar do Copeiro de Dia">Auxiliar do Copeiro</option>
                        <option value="Ceia de Dia">Ceia de Dia</option>
                      </select>

                      <select
                        value={efetivoStatusFilter}
                        onChange={e => setEfetivoStatusFilter(e.target.value as 'Todos' | 'Ativo' | 'Afastado')}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden bg-white shadow-xs"
                      >
                        <option value="Todos">Status: Todos</option>
                        <option value="Ativo">Ativo</option>
                        <option value="Afastado">Afastado / LTS</option>
                      </select>

                      <select
                        value={efetivoScaleFilter}
                        onChange={e => setEfetivoScaleFilter(e.target.value as 'Todas' | 'Ambas' | 'EP' | 'EV')}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden bg-white shadow-xs"
                      >
                        <option value="Todas">Escalas: Todas</option>
                        <option value="Ambas">Ambas (Preta e Vermelha)</option>
                        <option value="EP">Apenas Preta (EP)</option>
                        <option value="EV">Apenas Vermelha (EV)</option>
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
                        {filteredMilitaryList.map(mil => (
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
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-md font-medium text-[10px]">
                                  P: {mil.specialty}
                                </span>
                                {mil.specialtySecondary && (
                                  <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-md font-medium text-[10px]">
                                    S: {mil.specialtySecondary}
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
                                  onClick={() => { setEditingMilOriginal(clean(mil)); setEditingMil(clean(mil)); }}
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
                  <UserCheck className="w-5 h-5 text-emerald-800" />
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
                    className="w-full py-2.5 bg-[#1e382b] text-white font-semibold rounded-xl text-xs hover:bg-[#162b21] shadow-sm transition-colors mt-4 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Militar</span>
                  </button>
                </form>
              </div>

            </div>
          ); })()}

          {/* TAB 4: CARDÁPIO SEMANAL (APROVISIONAMENTO HGeSM) */}
          {activeTab === 'cardapio' && (
            <CardapioSemanal onNotify={showToast} />
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
                <h4 className="font-bold text-slate-900 text-sm">Designação Manual de Militar</h4>
                <p className="text-xs text-slate-500 font-medium">{selectedCell.post} — {selectedCell.day}</p>
              </div>
              <button 
                onClick={() => { setIsAssigning(false); setSelectedCell(null); setModalSearch(''); }}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current assignment banner */}
              {roster[selectedCell.day]?.[selectedCell.post] ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Escalado Atualmente</span>
                    <p className="text-xs font-bold text-emerald-950">
                      {roster[selectedCell.day][selectedCell.post]?.rank}. {roster[selectedCell.day][selectedCell.post]?.militaryName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAssignMilitary('empty')}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[11px] font-bold transition-colors shadow-2xs"
                  >
                    Desmarcar
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg text-[11px] text-slate-500">
                  Este posto está <strong>vago</strong> nesta data. Selecione abaixo o militar para escalá-lo manualmente.
                </div>
              )}

              {/* Segmented Selector for Assignment Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tipo de Alocação</label>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSelectedAssignType('EV')}
                    className={cn(
                      "flex-1 text-center py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                      selectedAssignType === 'EV' || selectedAssignType === 'EP' ? "bg-white text-slate-950 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Escala Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAssignType('PERM')}
                    className={cn(
                      "flex-1 text-center py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                      selectedAssignType === 'PERM' ? "bg-amber-500 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Permuta
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 leading-relaxed">
                Todos os militares sem afastamento vigente nesta data podem ser selecionados livremente. A lista não aplica prioridade ou bloqueio por função, contagem de serviços, tipo de escala, dia anterior ou dia seguinte.
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar militar por nome ou graduação..."
                  value={modalSearch}
                  onChange={e => setModalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#1e382b] outline-hidden text-slate-800"
                />
              </div>

              {/* List of personnel */}
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                {/* Clear assignment button */}
                <button
                  type="button"
                  onClick={() => handleAssignMilitary('empty')}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-dashed border-rose-200 text-left hover:bg-rose-50 text-rose-600 font-semibold text-xs transition-colors"
                >
                  <span>Deixar Posto Vago (Desmarcar)</span>
                  <X className="w-4 h-4" />
                </button>

                {militaryList
                  .filter(mil => {
                    if (isMilitaryAbsentOnDay(mil.id, selectedCell.day, absences)) return false;
                    if (!modalSearch) return true;
                    const query = modalSearch.toLowerCase();
                    return (
                      mil.name.toLowerCase().includes(query) ||
                      mil.fullName.toLowerCase().includes(query) ||
                      mil.rank.toLowerCase().includes(query) ||
                      mil.specialty.toLowerCase().includes(query)
                    );
                  })
                  .map(mil => {

                    return (
                      <button
                        key={mil.id}
                        type="button"
                        onClick={() => handleAssignMilitary(mil.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-[#1e382b] hover:bg-slate-50 text-left text-xs transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600 shrink-0">
                            {mil.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{mil.rank}. {mil.fullName}</p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {mil.name} • {mil.specialty}{mil.specialtySecondary ? ` / ${mil.specialtySecondary}` : ''}
                            </p>
                          </div>
                        </div>
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
                  className="px-4 py-2 bg-[#1e382b] hover:bg-[#162b21] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Cadastrar Novo Feriado na Escala */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
          >
            <div className="px-6 py-4 bg-[#1e382b] text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Cadastrar Novo Feriado</h4>
                  <p className="text-xs text-emerald-200/80">Adicione uma data para inclusão automática na escala</p>
                </div>
              </div>
              <button 
                onClick={() => setIsHolidayModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Data do Feriado / Data Especial <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="date"
                  value={newHolidayDate}
                  onChange={e => setNewHolidayDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1e382b] outline-hidden bg-white text-slate-800"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Aparecerá automaticamente na escala em ordem cronológica com os finais de semana.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Nome do Feriado / Celebração
                </label>
                <input 
                  type="text"
                  placeholder="Ex: Dia da Independência, Feriado Municipal..."
                  value={newHolidayName}
                  onChange={e => setNewHolidayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#1e382b] outline-hidden bg-white text-slate-800"
                />
              </div>

              {customHolidays.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Feriados Cadastrados ({customHolidays.length})
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {customHolidays.map(h => (
                      <div 
                        key={h.id} 
                        className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1e382b]">{isoToDdmmyyyy(h.date)}</span>
                          <span className="text-slate-600 font-medium truncate max-w-[180px]">— {h.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveHoliday(h.date)}
                          className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-colors"
                          title="Remover feriado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button 
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[#1e382b] hover:bg-[#162b21] text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Cadastrar Feriado</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
