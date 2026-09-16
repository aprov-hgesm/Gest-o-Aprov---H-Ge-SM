from pathlib import Path
import re

p = Path('app/page.tsx')
text = p.read_text()

marker = """  const rosterPostsForDisplay = Array.from(new Set([...adminSettings.rosterPosts, ...historicalAssignedPosts]));

  // Filter roster for display on Dashboard (Weekends & Custom Holidays)
"""
replacement = """  const rosterPostsForDisplay = Array.from(new Set([...adminSettings.rosterPosts, ...historicalAssignedPosts]));
  const absenceTypesForDisplay = Array.from(new Set([...adminSettings.absenceTypes, ...absences.map(item => item.type)]));
  const specialtiesForDisplay = Array.from(new Set([
    ...adminSettings.specialties,
    ...militaryList.flatMap(item => [item.specialty, item.specialtySecondary || '']).filter(Boolean)
  ]));

  // Filter roster for display on Dashboard (Weekends & Custom Holidays)
"""
if marker not in text:
    raise RuntimeError('display unions marker missing')
text = text.replace(marker, replacement, 1)

# Existing military keeps historical specialties visible even when an admin option is retired.
text = text.replace(
    "{adminSettings.specialties.map(item => <option key={item} value={item}>{item}</option>)}\n                                </select>",
    "{specialtiesForDisplay.map(item => <option key={item} value={item}>{item}</option>)}\n                                </select>",
    1
)

# Absence history filter includes configured options and historical values already stored.
pattern = r'''<select\s+\n?\s*value=\{absenceTypeFilter\}.*?</select>'''
replacement = '''<select
                        value={absenceTypeFilter}
                        onChange={e => setAbsenceTypeFilter(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-800 font-medium"
                      >
                        <option value="Todos">Todos os Tipos</option>
                        {absenceTypesForDisplay.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>'''
text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
if count != 1:
    raise RuntimeError(f'absence filter: {count}')

# Personnel function filter includes configured and historical specialties.
pattern = r'''<select\s*\n\s*value=\{efetivoFunctionFilter\}.*?</select>'''
replacement = '''<select
                        value={efetivoFunctionFilter}
                        onChange={e => setEfetivoFunctionFilter(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden bg-white shadow-xs"
                      >
                        <option value="Todas as Funções">Funções: Todas</option>
                        {specialtiesForDisplay.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>'''
text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
if count != 1:
    raise RuntimeError(f'efetivo function filter: {count}')

# Secondary specialty is also governed by the administrative specialty list.
pattern = r'''<select\s*\n\s*value=\{newMilSpecialtySecondary\}.*?</select>'''
replacement = '''<select
                        value={newMilSpecialtySecondary}
                        onChange={e => setNewMilSpecialtySecondary(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                      >
                        <option value="Nenhuma">Nenhuma</option>
                        {adminSettings.specialties.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>'''
text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
if count != 1:
    raise RuntimeError(f'secondary specialty: {count}')

p.write_text(text)
print('Refinamentos finais da interface administrativa aplicados')
