from pathlib import Path

p = Path('scripts/apply_block4b.py')
t = p.read_text()
marker = "'efetivo-actions'"
pos = t.index(marker)
start = t.rfind('text = replace_once(', 0, pos)
end = t.index('\n\ntext = replace_once(', pos)
replacement = r'''text = replace_once(
    text,
    "<div className=\"flex gap-2 justify-center\">\n                                <button\n                                  onClick={() => { setEditingMilOriginal(clean(mil)); setEditingMil(clean(mil)); }}",
    "<div className=\"flex gap-1 justify-center\">\n                                <button\n                                  onClick={() => openRosterForMilitary(mil.id, mil.name)}\n                                  className=\"p-1.5 hover:bg-emerald-50 rounded text-slate-400 hover:text-emerald-800 transition-colors\"\n                                  title=\"Localizar militar na escala\"\n                                >\n                                  <Calendar className=\"w-3.5 h-3.5\" />\n                                </button>\n                                <button\n                                  onClick={() => openAbsenceForMilitary(mil)}\n                                  className=\"p-1.5 hover:bg-amber-50 rounded text-slate-400 hover:text-amber-700 transition-colors\"\n                                  title={mil.status === 'Afastado' ? 'Ver afastamento vigente' : 'Registrar afastamento'}\n                                >\n                                  <UserX className=\"w-3.5 h-3.5\" />\n                                </button>\n                                <button\n                                  onClick={() => { setEditingMilOriginal(clean(mil)); setEditingMil(clean(mil)); }}",
    'efetivo-actions',
)'''
p.write_text(t[:start] + replacement + t[end:])
print('Patch preparatório aplicado.')
