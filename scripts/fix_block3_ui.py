from pathlib import Path
import re

p = Path('app/page.tsx')
text = p.read_text()


def replace_select(pattern: str, replacement: str, label: str):
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'{label}: encontrado {count}')

replace_select(
    r'<select\s+value=\{filterFunction\}.*?</select>',
    '''<select
                      value={filterFunction}
                      onChange={e => setFilterFunction(e.target.value)}
                      className="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-800 bg-white"
                    >
                      <option>Todas as Funções</option>
                      {rosterPostsForDisplay.map(post => <option key={post} value={post}>{post}</option>)}
                    </select>''',
    'filterFunction'
)
replace_select(
    r'<select\s+value=\{m\.specialty\}.*?</select>',
    '''<select
                                  value={m.specialty}
                                  onChange={(e) => handleToggleSpecialty(m.id, e.target.value)}
                                  className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden bg-white shadow-2xs"
                                >
                                  {adminSettings.specialties.map(item => <option key={item} value={item}>{item}</option>)}
                                </select>''',
    'inline specialty'
)
replace_select(
    r'<select\s+value=\{absenceType\}.*?</select>',
    '''<select
                        value={absenceType}
                        onChange={e => setAbsenceType(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg text-xs p-2.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-800"
                      >
                        {adminSettings.absenceTypes.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>''',
    'absenceType'
)
replace_select(
    r'<select\s+value=\{newMilRank\}.*?</select>',
    '''<select
                        value={newMilRank}
                        onChange={e => setNewMilRank(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                      >
                        {adminSettings.ranks.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>''',
    'newMilRank'
)
replace_select(
    r'<select\s+value=\{newMilSpecialty\}.*?</select>',
    '''<select
                        value={newMilSpecialty}
                        onChange={e => setNewMilSpecialty(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-hidden bg-white"
                      >
                        {adminSettings.specialties.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>''',
    'newMilSpecialty'
)

marker = "  // Filter roster for display on Dashboard (Weekends & Custom Holidays)\n  const daysToShow ="
replacement = """  // Configured posts plus historical assigned posts stay visible for traceability.
  const historicalAssignedPosts = Object.values(roster).flatMap(day =>
    Object.entries(day).filter(([, cell]) => cell !== null).map(([post]) => post)
  );
  const rosterPostsForDisplay = Array.from(new Set([...adminSettings.rosterPosts, ...historicalAssignedPosts]));

  // Filter roster for display on Dashboard (Weekends & Custom Holidays)
  const daysToShow ="""
if marker not in text:
    raise RuntimeError('daysToShow marker not found')
text = text.replace(marker, replacement, 1)
text = text.replace('{adminSettings.rosterPosts.map(post => {', '{rosterPostsForDisplay.map(post => {', 1)

# Preserve the original assignment type when a structured swap is cancelled.
old_restore = """        rank: swap.originalRank,
        type: 'EV'
"""
new_restore = """        rank: swap.originalRank,
        type: swap.originalType
"""
if old_restore not in text:
    raise RuntimeError('swap restore marker not found')
text = text.replace(old_restore, new_restore, 1)
old_create = """            originalMilitaryName: prevCell.militaryName,
            originalRank: prevCell.rank,
            replacementMilitaryId: mil.id,
"""
new_create = """            originalMilitaryName: prevCell.militaryName,
            originalRank: prevCell.rank,
            originalType: prevCell.type,
            replacementMilitaryId: mil.id,
"""
if old_create not in text:
    raise RuntimeError('swap creation marker not found')
text = text.replace(old_create, new_create, 1)

p.write_text(text)
print('Interface administrativa e permutas corrigidas')
