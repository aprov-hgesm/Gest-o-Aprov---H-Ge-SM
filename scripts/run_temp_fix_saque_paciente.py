from pathlib import Path

script_path = Path('scripts/temp_fix_saque_paciente.py')
script = script_path.read_text(encoding='utf-8')
start_marker = "replace_once(\n\"\"\"      text += `   • Consumo:"
label_marker = "'text export origin')"
start = script.find(start_marker)
if start < 0:
    raise SystemExit('text export replacement block start not found')
label = script.find(label_marker, start)
if label < 0:
    raise SystemExit('text export replacement block end not found')
end = label + len(label_marker)
script = script[:start] + script[end:]
exec(compile(script, str(script_path), 'exec'), {})

component = Path('components/CardapioSemanal.tsx')
source = component.read_text(encoding='utf-8')
old = "      text += `   • Consumo: ${item.diaSemanaCardapioLabel} (${formatDdmmyyyy(item.diaCardapioIso)}) - ${item.preparacao}\\n`;"
new = "      text += `   • Consumo: ${item.origem} — ${item.diaSemanaCardapioLabel} (${formatDdmmyyyy(item.diaCardapioIso)}) - ${item.preparacao}\\n`;"
if source.count(old) != 1:
    raise SystemExit(f'text export origin final patch: expected 1, found {source.count(old)}')
component.write_text(source.replace(old, new, 1), encoding='utf-8')
