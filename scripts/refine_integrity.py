from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Anchor not found in {path}: {old[:140]!r}')
    p.write_text(text.replace(old, new, 1))

path = 'app/page.tsx'
replace_once(path,
"const generateWeekendAndHolidayDays = (\n  customHolidays: HolidayDate[] = initialHolidays,\n  startMonthIso: string = '2026-09-01',\n  endMonthIso: string = '2026-12-31'\n): string[] => {\n  const [sy, sm, sd] = startMonthIso.split('-').map(Number);\n  const [ey, em, ed] = endMonthIso.split('-').map(Number);\n",
"const generateWeekendAndHolidayDays = (\n  customHolidays: HolidayDate[] = initialHolidays,\n  startMonthIso?: string,\n  endMonthIso?: string\n): string[] => {\n  const now = new Date();\n  const defaultStart = `${localIsoDate(now).slice(0, 8)}01`;\n  const future = new Date(now.getFullYear(), now.getMonth() + 6, 0);\n  const defaultEnd = localIsoDate(future);\n  const rangeStart = startMonthIso || defaultStart;\n  const rangeEnd = endMonthIso || defaultEnd;\n  const [sy, sm, sd] = rangeStart.split('-').map(Number);\n  const [ey, em, ed] = rangeEnd.split('-').map(Number);\n")
replace_once(path,
"  customHolidays.forEach(h => {\n    if (h.date) {\n      daysSet.add(isoToDdmmyyyy(h.date));\n    }\n  });\n",
"  customHolidays.forEach(h => {\n    if (h.date && h.date >= rangeStart && h.date <= rangeEnd) {\n      daysSet.add(isoToDdmmyyyy(h.date));\n    }\n  });\n")
replace_once(path,
"    const emptyRoster = createEmptyRoster(daysToShow);\n    const resetMilList = militaryList.map(mil => ({ ...mil, dutyCount: 0 }));\n",
"    const emptyRoster = Object.fromEntries(\n      Object.entries(roster).map(([day, posts]) => [\n        day,\n        Object.fromEntries(Object.keys(posts).map(post => [post, null]))\n      ])\n    ) as WeekRoster;\n    const resetMilList = militaryList.map(mil => ({ ...mil, dutyCount: 0 }));\n")
replace_once(path,
"  // CRUD: Delete military personnel and clean up rosters\n  const handleDeleteMilitary = (id: string) => {\n    const target = militaryList.find(m => m.id === id);\n    if (!target) return;\n\n    if (window.confirm(`Tem certeza que deseja excluir o militar ${target.rank}. ${target.name}?`)) {\n      const updatedMil = militaryList.filter(m => m.id !== id);\n      const updatedAbs = absences.filter(a => a.militaryId !== id);\n\n      // Clean slots in roster\n      const updatedRoster = clean(roster);\n      Object.keys(updatedRoster).forEach(day => {\n        Object.keys(updatedRoster[day]).forEach(post => {\n          const cell = updatedRoster[day][post];\n          if (cell && cell.militaryId === id) {\n            updatedRoster[day][post] = null;\n          }\n        });\n      });\n\n      let logsList = addLog(`Militar excluído do sistema: ${target.rank}. ${target.name}.`);\n      if (!saveState(updatedMil, updatedAbs, updatedRoster, logsList)) return;\n      showToast(`Militar ${target.name} removido com sucesso.`);\n    }\n  };\n",
"  // Excluir somente cadastros sem histórico operacional; vínculos históricos devem ser preservados.\n  const handleDeleteMilitary = (id: string) => {\n    const target = militaryList.find(m => m.id === id);\n    if (!target) return;\n    const hasAbsenceHistory = absences.some(a => a.militaryId === id);\n    const hasRosterHistory = Object.values(roster).some(day =>\n      Object.values(day).some(cell => cell?.militaryId === id)\n    );\n    if (hasAbsenceHistory || hasRosterHistory) {\n      showToast(`O cadastro de ${target.rank}. ${target.name} possui histórico de escala ou afastamento e não pode ser excluído. Edite o cadastro para preservar a rastreabilidade.`, 'info');\n      return;\n    }\n    if (!window.confirm(`Tem certeza que deseja excluir o militar ${target.rank}. ${target.name}?`)) return;\n    const updatedMil = militaryList.filter(m => m.id !== id);\n    const logsList = addLog(`Cadastro sem histórico excluído: ${target.rank}. ${target.name}.`);\n    if (!saveState(updatedMil, absences, roster, logsList)) return;\n    showToast(`Militar ${target.name} removido com sucesso.`);\n  };\n")
replace_once(path,
"    const today = localIsoDate();\n    const startDate = absenceStart || today;\n    const newAbsence: Absence = {\n",
"    const today = localIsoDate();\n    const startDate = absenceStart || today;\n    const plannedEndDate = absenceEnd || today;\n    if (!absenceIndefinite && plannedEndDate < startDate) {\n      showToast('A data final do afastamento não pode ser anterior à data inicial.', 'info');\n      return;\n    }\n    const newAbsence: Absence = {\n")
replace_once(path,
"      endDate: absenceIndefinite ? 'Indefinido' : absenceEnd || today,\n",
"      endDate: absenceIndefinite ? 'Indefinido' : plannedEndDate,\n")
replace_once(path,
"  const totalMedicalAway = absences.filter(a =>\n    resolveAbsenceStatus(a) === 'ATIVO' && (a.type.includes('LTS') || a.type.includes('Atestado'))\n  ).length;\n",
"  const totalMedicalAway = new Set(absences.filter(a =>\n    resolveAbsenceStatus(a) === 'ATIVO' && (a.type.includes('LTS') || a.type.includes('Atestado'))\n  ).map(a => a.militaryId)).size;\n")

path = 'components/DocumentExports.tsx'
replace_once(path,
"import { normalizeMilitaryStatuses, resolveAbsenceStatus } from '@/lib/domain/roster-integrity';\n",
"import { normalizeMilitaryStatuses, resolveAbsenceStatus, rosterCompliance } from '@/lib/domain/roster-integrity';\n")
replace_once(path,
"  const rows = [...data.absences]\n    .sort((a, b) => (a.status === b.status ? isoFromDate(a.startDate).localeCompare(isoFromDate(b.startDate)) : a.status === 'ATIVO' ? -1 : 1))\n",
"  const rows = [...data.absences]\n    .sort((a, b) => {\n      const statusA = resolveAbsenceStatus(a);\n      const statusB = resolveAbsenceStatus(b);\n      if (statusA === statusB) return isoFromDate(a.startDate).localeCompare(isoFromDate(b.startDate));\n      const order = { ATIVO: 0, AGENDADO: 1, ENCERRADO: 2, CANCELADO: 3 } as const;\n      return order[statusA] - order[statusB];\n    })\n")
replace_once(path,
"  const allSlots = Object.values(data.roster).flatMap(day => Object.values(day));\n  const filledSlots = allSlots.filter(Boolean).length;\n  const occupation = allSlots.length ? Math.round((filledSlots / allSlots.length) * 100) : 0;\n",
"  const { rate: occupation } = rosterCompliance(data.roster);\n")

print('Refinements applied.')
