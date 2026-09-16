from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Anchor not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))

# app/page.tsx
path = 'app/page.tsx'
replace_once(path,
"import { validateRoster } from '@/lib/persistence/validation';\n",
"import { validateRoster } from '@/lib/persistence/validation';\nimport { signOutUser } from '@/lib/firebase';\nimport {\n  isMilitaryAbsentOnDate, localIsoDate, normalizeMilitaryStatuses,\n  recalculateDutyCounts, resolveAbsenceStatus, rosterCompliance\n} from '@/lib/domain/roster-integrity';\n")
replace_once(path,
"  status: 'ATIVO' | 'AGENDADO';\n}",
"  status: 'ATIVO' | 'AGENDADO' | 'ENCERRADO' | 'CANCELADO';\n  actualEndDate?: string;\n  closedAt?: string;\n}")
replace_once(path,
"  const { militaryList, absences, roster, changelogs, customHolidays } =\n    rosterCloud.state.records[0] ?? initialRosterDocuments[0];\n",
"  const rosterDocument = rosterCloud.state.records[0] ?? initialRosterDocuments[0];\n  const { absences, roster, changelogs, customHolidays } = rosterDocument;\n  const militaryList = normalizeMilitaryStatuses(rosterDocument.militaryList, absences);\n")
replace_once(path,
"  const [newHolidayDate, setNewHolidayDate] = useState('2026-09-18');\n",
"  const [newHolidayDate, setNewHolidayDate] = useState(() => localIsoDate());\n")
replace_once(path,
"  const [startDateFilter, setStartDateFilter] = useState('2026-09-01');\n  const [endDateFilter, setEndDateFilter] = useState('2026-11-30');\n",
"  const [startDateFilter, setStartDateFilter] = useState(() => {\n    const today = localIsoDate();\n    return `${today.slice(0, 8)}01`;\n  });\n  const [endDateFilter, setEndDateFilter] = useState(() => {\n    const date = new Date();\n    date.setMonth(date.getMonth() + 3);\n    return localIsoDate(date);\n  });\n")
replace_once(path,
"  ) => {\n    return rosterCloud.controller.update([{\n      id: 'principal', militaryList: newMil, absences: newAbs,\n      roster: newRos, changelogs: newLogs, customHolidays: newHolidays\n    }]);\n  };\n",
"  ) => {\n    const normalizedAbsences = newAbs.map(absence => ({\n      ...absence,\n      status: resolveAbsenceStatus(absence)\n    }));\n    const normalizedMilitary = recalculateDutyCounts(\n      normalizeMilitaryStatuses(newMil, normalizedAbsences),\n      newRos\n    );\n    return rosterCloud.controller.update([{\n      id: 'principal', militaryList: normalizedMilitary, absences: normalizedAbsences,\n      roster: newRos, changelogs: newLogs, customHolidays: newHolidays\n    }]);\n  };\n")
replace_once(path,
"  const isMilitaryAbsentOnDay = (militaryId: string, dayStr: string, activeAbsences: Absence[] = absences): boolean => {\n    const dayISO = ddmmyyyyToIso(dayStr);\n    return activeAbsences.some(a => {\n      if (a.militaryId !== militaryId) return false;\n      if (a.status !== 'ATIVO' && a.status !== 'AGENDADO') return false;\n      if (a.indefinite) return dayISO >= a.startDate;\n      return dayISO >= a.startDate && dayISO <= a.endDate;\n    });\n  };\n",
"  const isMilitaryAbsentOnDay = (militaryId: string, dayStr: string, activeAbsences: Absence[] = absences): boolean =>\n    isMilitaryAbsentOnDate(activeAbsences, militaryId, ddmmyyyyToIso(dayStr));\n")
replace_once(path,
"    const newAbsence: Absence = {\n      id: `afast-${Date.now()}`,\n      militaryId: mil.id,\n      militaryName: mil.name,\n      rank: mil.rank,\n      type: absenceType,\n      startDate: absenceStart || new Date().toISOString().split('T')[0],\n      endDate: absenceIndefinite ? 'Indefinido' : absenceEnd || new Date().toISOString().split('T')[0],\n      indefinite: absenceIndefinite,\n      notes: absenceNotes,\n      autoUpdate: absenceAutoUpdate,\n      status: 'ATIVO'\n    };\n\n    const updatedAbsences = [newAbsence, ...absences];\n    const updatedMilList = clean(militaryList);\n\n    // Mark military as Afastado\n    const milIdx = updatedMilList.findIndex(m => m.id === mil.id);\n    if (milIdx !== -1) {\n      updatedMilList[milIdx].status = 'Afastado';\n    }\n",
"    const today = localIsoDate();\n    const startDate = absenceStart || today;\n    const newAbsence: Absence = {\n      id: `afast-${Date.now()}`,\n      militaryId: mil.id,\n      militaryName: mil.name,\n      rank: mil.rank,\n      type: absenceType,\n      startDate,\n      endDate: absenceIndefinite ? 'Indefinido' : absenceEnd || today,\n      indefinite: absenceIndefinite,\n      notes: absenceNotes,\n      autoUpdate: absenceAutoUpdate,\n      status: startDate > today ? 'AGENDADO' : 'ATIVO'\n    };\n\n    const updatedAbsences = [newAbsence, ...absences];\n    const updatedMilList = normalizeMilitaryStatuses(clean(militaryList), updatedAbsences, today);\n    const milIdx = updatedMilList.findIndex(m => m.id === mil.id);\n")
replace_once(path,
"  // Terminate a leave early\n  const handleEndAbsence = (id: string) => {\n    const abs = absences.find(a => a.id === id);\n    if (!abs) return;\n\n    const updatedAbsences = absences.filter(a => a.id !== id);\n    const updatedMilList = clean(militaryList);\n\n    // Set military back to Ativo only if no other active absences remain\n    const hasOtherAbsences = updatedAbsences.some(a => a.militaryId === abs.militaryId);\n    const milIdx = updatedMilList.findIndex(m => m.id === abs.militaryId);\n    if (milIdx !== -1 && !hasOtherAbsences) {\n      updatedMilList[milIdx].status = 'Ativo';\n    }\n\n    // Clean dispensa entries in roster\n    const updatedRoster = clean(roster);\n    Object.keys(updatedRoster).forEach(day => {\n      Object.keys(updatedRoster[day]).forEach(post => {\n        const cell = updatedRoster[day][post];\n        if (cell && cell.militaryId === abs.militaryId && cell.type === 'DISP') {\n          updatedRoster[day][post] = null;\n        }\n      });\n    });\n\n    let logsList = addLog(`Retorno de afastamento homologado para ${abs.rank}. ${abs.militaryName}.`);\n    if (!saveState(updatedMilList, updatedAbsences, updatedRoster, logsList)) return;\n    showToast(`Militar ${abs.militaryName} retornou ao serviço ativo.`);\n  };\n",
"  // Encerrar/cancelar sem apagar o histórico do afastamento\n  const handleEndAbsence = (id: string) => {\n    const abs = absences.find(a => a.id === id);\n    if (!abs) return;\n    const today = localIsoDate();\n    const effectiveStatus = resolveAbsenceStatus(abs, today);\n    if (effectiveStatus === 'ENCERRADO' || effectiveStatus === 'CANCELADO') return;\n    const nextStatus: Absence['status'] = effectiveStatus === 'AGENDADO' ? 'CANCELADO' : 'ENCERRADO';\n    const updatedAbsences = absences.map(item => item.id === id ? {\n      ...item,\n      status: nextStatus,\n      actualEndDate: nextStatus === 'ENCERRADO' ? today : item.actualEndDate,\n      closedAt: new Date().toISOString()\n    } : item);\n    const updatedMilList = normalizeMilitaryStatuses(clean(militaryList), updatedAbsences, today);\n\n    const updatedRoster = clean(roster);\n    Object.keys(updatedRoster).forEach(day => {\n      Object.keys(updatedRoster[day]).forEach(post => {\n        const cell = updatedRoster[day][post];\n        if (cell && cell.militaryId === abs.militaryId && cell.type === 'DISP') updatedRoster[day][post] = null;\n      });\n    });\n\n    const action = nextStatus === 'CANCELADO' ? 'Afastamento agendado cancelado' : 'Retorno de afastamento homologado';\n    const logsList = addLog(`${action} para ${abs.rank}. ${abs.militaryName}.`);\n    if (!saveState(updatedMilList, updatedAbsences, updatedRoster, logsList)) return;\n    showToast(nextStatus === 'CANCELADO' ? `Afastamento de ${abs.militaryName} cancelado.` : `Militar ${abs.militaryName} retornou ao serviço ativo.`);\n  };\n")
replace_once(path,
"  const totalMedicalAway = absences.filter(a => a.type.includes('LTS') || a.type.includes('Atestado')).length;\n",
"  const totalMedicalAway = absences.filter(a =>\n    resolveAbsenceStatus(a) === 'ATIVO' && (a.type.includes('LTS') || a.type.includes('Atestado'))\n  ).length;\n")
replace_once(path,
"  const totalPossibleSlots = Object.values(roster)\n    .flatMap(dayObj => Object.keys(dayObj)).length;\n  const filledSlots = Object.values(roster)\n    .flatMap(dayObj => Object.values(dayObj))\n    .filter(cell => cell !== null).length;\n  const complianceRate = totalPossibleSlots > 0 ? Math.round((filledSlots / totalPossibleSlots) * 100) : 100;\n",
"  const { rate: complianceRate } = rosterCompliance(roster);\n")
replace_once(path,
"          <button className=\"flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors w-full rounded-lg hover:bg-slate-900/40\">\n            <LogOut className=\"w-4 h-4 text-rose-500\" />\n            <span>Sair</span>\n          </button>\n",
"          <button onClick={() => void signOutUser()} className=\"flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors w-full rounded-lg hover:bg-slate-900/40\">\n            <LogOut className=\"w-4 h-4 text-rose-500\" />\n            <span>Sair</span>\n          </button>\n")
replace_once(path,
"            <div className=\"relative max-w-xs hidden md:block\">\n",
"            {activeTab !== 'cardapio' && <div className=\"relative max-w-xs hidden md:block\">\n")
replace_once(path,
"            </div>\n\n            <button className=\"p-2 text-slate-400 hover:bg-slate-100 rounded-full relative transition-colors\">\n",
"            </div>}\n\n            <button className=\"p-2 text-slate-400 hover:bg-slate-100 rounded-full relative transition-colors\">\n")
# Status render and action in absences table
replace_once(path,
"                                      abs.status === 'ATIVO' ? \"bg-emerald-50 text-emerald-700 border-emerald-100\" : \"bg-slate-100 text-slate-700 border-slate-200\"\n                                    )}>\n                                      {abs.status}\n",
"                                      resolveAbsenceStatus(abs) === 'ATIVO' ? \"bg-emerald-50 text-emerald-700 border-emerald-100\" :\n                                      resolveAbsenceStatus(abs) === 'AGENDADO' ? \"bg-blue-50 text-blue-700 border-blue-100\" :\n                                      resolveAbsenceStatus(abs) === 'CANCELADO' ? \"bg-rose-50 text-rose-700 border-rose-100\" : \"bg-slate-100 text-slate-700 border-slate-200\"\n                                    )}>\n                                      {resolveAbsenceStatus(abs)}\n")
replace_once(path,
"                                    <button \n                                      onClick={() => handleEndAbsence(abs.id)}\n                                      className=\"p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-semibold\"\n                                      title=\"Finalizar Afastamento\"\n                                    >\n                                      <Trash2 className=\"w-4 h-4\" />\n                                      <span className=\"hidden sm:inline\">Finalizar</span>\n                                    </button>\n",
"                                    {['ATIVO', 'AGENDADO'].includes(resolveAbsenceStatus(abs)) && (\n                                      <button \n                                        onClick={() => handleEndAbsence(abs.id)}\n                                        className=\"p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-semibold\"\n                                        title={resolveAbsenceStatus(abs) === 'AGENDADO' ? 'Cancelar Afastamento' : 'Finalizar Afastamento'}\n                                      >\n                                        <Trash2 className=\"w-4 h-4\" />\n                                        <span className=\"hidden sm:inline\">{resolveAbsenceStatus(abs) === 'AGENDADO' ? 'Cancelar' : 'Finalizar'}</span>\n                                      </button>\n                                    )}\n")

# components/CardapioSemanal.tsx
path = 'components/CardapioSemanal.tsx'
replace_once(path,
"import { validateCardapio } from '@/lib/persistence/validation';\n",
"import { validateCardapio } from '@/lib/persistence/validation';\nimport { getCardapioReadiness } from '@/lib/domain/cardapio-readiness';\n")
replace_once(path,
"  const [newWeekMonday, setNewWeekMonday] = useState('2026-09-21');\n",
"  const [newWeekMonday, setNewWeekMonday] = useState(() => {\n    const now = new Date();\n    const day = now.getDay();\n    const distance = day === 1 ? 7 : (8 - day) % 7 || 7;\n    now.setDate(now.getDate() + distance);\n    return formatIsoDate(now);\n  });\n")
replace_once(path,
"  const updateCurrentCardapio = (updated: WeeklyCardapioDoc) => {\n    const updatedList = cardapiosList.some(c => c.id === updated.id)\n",
"  const updateCurrentCardapio = (updated: WeeklyCardapioDoc) => {\n    const persisted = cardapiosList.find(c => c.id === updated.id);\n    if (persisted?.workflow.status === 'FINALIZADO' && updated.workflow.status !== 'EM_ELABORACAO') {\n      showToast('Cardápio finalizado está bloqueado para edição. Reabra o documento antes de alterar.', 'info');\n      return false;\n    }\n    const updatedList = cardapiosList.some(c => c.id === updated.id)\n")
replace_once(path,
"  const handleAdvanceWorkflow = () => {\n    const currentStatus = currentCardapio.workflow.status;\n",
"  const handleAdvanceWorkflow = () => {\n    const readiness = getCardapioReadiness(currentCardapio);\n    if (!readiness.ok) {\n      const preview = readiness.missing.slice(0, 3).join('; ');\n      const extra = readiness.missing.length > 3 ? ` (+${readiness.missing.length - 3} pendência(s))` : '';\n      showToast(`Cardápio com ${readiness.percent}% de prontidão. Corrija: ${preview}${extra}.`, 'info');\n      return;\n    }\n    const currentStatus = currentCardapio.workflow.status;\n")
replace_once(path,
"    updated.workflow.status = 'EM_ELABORACAO';\n    updated.workflow.conferido.status = 'PENDENTE';\n    updated.workflow.aprovado.status = 'PENDENTE';\n",
"    updated.workflow.status = 'EM_ELABORACAO';\n    updated.workflow.conferido.status = 'PENDENTE';\n    updated.workflow.conferido.data = undefined;\n    updated.workflow.aprovado.status = 'PENDENTE';\n    updated.workflow.aprovado.data = undefined;\n")
replace_once(path,
"              <div className={cn(\n                \"px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-2xs\",\n",
"              <div className={cn(\n                \"px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-2xs\",\n")
# Insert readiness badge immediately after workflow badge closing block marker
anchor = "              </div>\n            </div>\n            \n            <p className=\"text-slate-500 text-xs mt-1\">\n"
insert = "              </div>\n              {(() => {\n                const readiness = getCardapioReadiness(currentCardapio);\n                return (\n                  <span className={cn(\n                    'px-2.5 py-1 rounded-full text-xs font-bold border',\n                    readiness.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'\n                  )} title={readiness.ok ? 'Cardápio completo para avançar o fluxo' : readiness.missing.slice(0, 5).join(' • ')}>\n                    Prontidão {readiness.percent}%\n                  </span>\n                );\n              })()}\n            </div>\n            \n            <p className=\"text-slate-500 text-xs mt-1\">\n"
replace_once(path, anchor, insert)
replace_once(path,
"              onClick={() => setIsNewWeekModalOpen(true)}\n",
"              onClick={() => {\n                const latest = [...cardapiosList].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))[0];\n                if (latest) {\n                  const next = parseIsoDate(latest.dataInicio);\n                  next.setDate(next.getDate() + 7);\n                  setNewWeekMonday(formatIsoDate(next));\n                }\n                setIsNewWeekModalOpen(true);\n              }}\n")

# components/DocumentExports.tsx
path = 'components/DocumentExports.tsx'
replace_once(path,
"import jsPDF from 'jspdf';\n",
"import jsPDF from 'jspdf';\nimport { normalizeMilitaryStatuses, resolveAbsenceStatus } from '@/lib/domain/roster-integrity';\n")
replace_once(path,
"  status: 'ATIVO' | 'AGENDADO';\n};\n",
"  status: 'ATIVO' | 'AGENDADO' | 'ENCERRADO' | 'CANCELADO';\n  actualEndDate?: string;\n  closedAt?: string;\n};\n")
replace_once(path,
"  const active = data.absences.filter(item => item.status === 'ATIVO').length;\n",
"  const active = data.absences.filter(item => resolveAbsenceStatus(item) === 'ATIVO').length;\n")
replace_once(path,
"      item.status,\n",
"      resolveAbsenceStatus(item),\n")
replace_once(path,
"  const activeMilitary = data.militaryList.filter(item => item.status === 'Ativo').length;\n  const awayMilitary = data.militaryList.filter(item => item.status === 'Afastado').length;\n  const activeAbsences = data.absences.filter(item => item.status === 'ATIVO').length;\n",
"  const normalizedMilitary = normalizeMilitaryStatuses(data.militaryList, data.absences);\n  const activeMilitary = normalizedMilitary.filter(item => item.status === 'Ativo').length;\n  const awayMilitary = normalizedMilitary.filter(item => item.status === 'Afastado').length;\n  const activeAbsences = data.absences.filter(item => resolveAbsenceStatus(item) === 'ATIVO').length;\n")

print('Integrity block applied successfully.')
