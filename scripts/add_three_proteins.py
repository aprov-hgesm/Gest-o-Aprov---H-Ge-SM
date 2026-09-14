from pathlib import Path
import re

component_path = Path('components/CardapioSemanal.tsx')
validation_path = Path('lib/persistence/validation.ts')
text = component_path.read_text(encoding='utf-8')
validation = validation_path.read_text(encoding='utf-8')


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {count}')
    return source.replace(old, new, 1)


def replace_between(source: str, start: str, end: str, replacement: str, label: str) -> str:
    start_idx = source.find(start)
    if start_idx < 0:
        raise SystemExit(f'{label}: start marker not found')
    end_idx = source.find(end, start_idx)
    if end_idx < 0:
        raise SystemExit(f'{label}: end marker not found')
    return source[:start_idx] + replacement + source[end_idx:]


# Clear-day behavior: clear the new dinner protein field too.
text = replace_once(
    text,
    """      jantarPaciente: {\n        prato: ''\n      },""",
    """      jantarPaciente: {\n        proteina: '',\n        prato: ''\n      },""",
    'clear-day dinner protein',
)

# New weeks: initialize the field explicitly without changing existing stored documents.
gen_start = text.find('export const generateWeeklyDates = (mondayIso: string): DayCardapio[] => {')
gen_end = text.find('export const formatCardapioTitle', gen_start)
if gen_start < 0 or gen_end < 0:
    raise SystemExit('generateWeeklyDates section not found')
gen = text[gen_start:gen_end]
old_gen = """      jantarPaciente: {\n        prato: 'Arroz, feijão, ISCAS DE CARNE ACEBOLADA, legumes ao vapor, sopa de legumes, fruta'\n      },"""
new_gen = """      jantarPaciente: {\n        proteina: '',\n        prato: 'Arroz, feijão, ISCAS DE CARNE ACEBOLADA, legumes ao vapor, sopa de legumes, fruta'\n      },"""
if gen.count(old_gen) != 1:
    raise SystemExit(f'generate-week dinner default: expected 1 occurrence, found {gen.count(old_gen)}')
gen = gen.replace(old_gen, new_gen, 1)
text = text[:gen_start] + gen + text[gen_end:]

# Make the three protein fields explicit and numbered in the meal registration UI.
text = replace_once(
    text,
    'Proteína Principal (Preparação no Cardápio) *',
    'Proteína 1 — Almoço Geral *',
    'general lunch protein label',
)
text = replace_once(
    text,
    'Cardápio do Paciente (Proteína Especial)',
    'Proteína 2 — Almoço do Paciente',
    'patient lunch protein label',
)

# Replace the dinner editor with a dedicated dinner-protein field plus the remaining components.
dinner_start = '              {/* Refeição 5: Jantar PACIENTE */}'
dinner_end = '              {/* Refeição 7: CEIA */}'
new_dinner = r'''              {/* Refeição 5: Jantar PACIENTE */}
              <div className={cn(
                "p-3 rounded-xl border transition-all space-y-3",
                editingFocusMeal === 'jantar' ? "bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-200" : "bg-white border-slate-200",
                editingFocusMeal !== 'all' && editingFocusMeal !== 'jantar' && "hidden"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">
                      Jantar PACIENTE
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Cadastre a proteína separadamente dos acompanhamentos para facilitar a leitura do cardápio.
                    </p>
                  </div>
                  {editingFocusMeal === 'jantar' && (
                    <span className="text-[10px] font-bold text-emerald-700">Campo focado</span>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-950 uppercase tracking-wide block">
                    Proteína 3 — Jantar do Paciente
                  </label>
                  <input
                    type="text"
                    value={currentCardapio.dias[editingDayIndex].jantarPaciente.proteina || ''}
                    onChange={e => {
                      const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                      updated.dias[editingDayIndex].jantarPaciente.proteina = e.target.value;
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-xs font-bold uppercase bg-white text-emerald-950"
                    placeholder="Ex: ISCAS DE CARNE ACEBOLADA"
                  />
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Sugestões:</span>
                    {PRESET_PACIENTE.map(p => (
                      <button
                        key={`jantar-${p}`}
                        type="button"
                        onClick={() => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.dias[editingDayIndex].jantarPaciente.proteina = p;
                          updateCurrentCardapio(updated);
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded text-[9.5px] font-bold transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block">
                    Demais componentes do jantar
                  </label>
                  <textarea
                    rows={2}
                    value={currentCardapio.dias[editingDayIndex].jantarPaciente.prato}
                    onChange={e => {
                      const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                      updated.dias[editingDayIndex].jantarPaciente.prato = e.target.value;
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                    placeholder="Ex: Arroz, feijão, legumes ao vapor, sopa de legumes, fruta"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Combinações rápidas:</span>
                    {[
                      { proteina: 'ISCAS DE CARNE ACEBOLADA', prato: 'Arroz, feijão, legumes ao vapor, sopa de legumes, fruta' },
                      { proteina: 'PEITO DE FRANGO GRELHADO', prato: 'Arroz, feijão, purê, sopa, fruta' },
                      { proteina: 'OMELETE DE FORNO COM LEGUMES', prato: 'Arroz, feijão, canja, fruta' }
                    ].map((j, jIdx) => (
                      <button
                        key={jIdx}
                        type="button"
                        onClick={() => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.dias[editingDayIndex].jantarPaciente.proteina = j.proteina;
                          updated.dias[editingDayIndex].jantarPaciente.prato = j.prato;
                          updateCurrentCardapio(updated);
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9.5px] text-left"
                      >
                        {j.proteina}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

'''
text = replace_between(text, dinner_start, dinner_end, new_dinner, 'dinner editor block')

# Render the separate dinner protein prominently in the official A4 document while preserving legacy dinner text.
render_start = '  // Format Jantar string with protein bolding if detected (uppercase words/dishes)\n  const renderJantarContent = (day: DayCardapio) => {'
render_end = '\n\n  return (\n    <div className="space-y-6">'
new_render = r'''  // Format Jantar with an explicit protein field; legacy cardápios without the field remain unchanged.
  const renderJantarContent = (day: DayCardapio) => {
    const protein = day.jantarPaciente.proteina?.trim() || '';
    const text = day.jantarPaciente.prato || '';
    if (!protein && !text) return <span className="text-slate-400 italic">Jantar a definir</span>;

    const parts = text ? text.split(',') : [];
    return (
      <div className="text-[11px] leading-snug text-slate-900">
        {protein && (
          <span className="font-black text-black uppercase">{protein.toUpperCase()}</span>
        )}
        {protein && parts.length > 0 && ', '}
        {parts.map((part, pIdx) => {
          const trimmed = part.trim();
          const isUppercase = trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
          return (
            <React.Fragment key={pIdx}>
              {pIdx > 0 && ', '}
              {isUppercase ? (
                <span className="font-black text-black uppercase">{trimmed}</span>
              ) : (
                <span>{trimmed}</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };'''
text = replace_between(text, render_start, render_end, new_render, 'renderJantarContent')

# Include the separate dinner protein in copied textual summaries.
text = replace_once(
    text,
    "      txt += `• Jantar Paciente: ${d.jantarPaciente.prato}\\n`;",
    "      txt += `• Jantar Paciente: ${d.jantarPaciente.proteina ? `${d.jantarPaciente.proteina.toUpperCase()}${d.jantarPaciente.prato ? ', ' : ''}` : ''}${d.jantarPaciente.prato}\\n`;",
    'copy summary dinner',
)

# Show the dinner protein in the per-day editor preview.
text = replace_once(
    text,
    '<span className="text-slate-700 line-clamp-1">{dia.jantarPaciente.prato}</span>',
    '<span className="text-slate-700 line-clamp-1">{dia.jantarPaciente.proteina ? `${dia.jantarPaciente.proteina.toUpperCase()}${dia.jantarPaciente.prato ? ` • ${dia.jantarPaciente.prato}` : \'\'}` : dia.jantarPaciente.prato}</span>',
    'day preview dinner protein',
)

# Validation accepts old documents without jantarPaciente.proteina and validates it when present.
validation = replace_once(
    validation,
    "    !object(value.jantarPaciente) || typeof value.jantarPaciente.prato !== 'string') return false;",
    "    !object(value.jantarPaciente) || typeof value.jantarPaciente.prato !== 'string' ||\n    !optional(value.jantarPaciente, 'proteina', 'string')) return false;",
    'validation optional dinner protein',
)

component_path.write_text(text, encoding='utf-8')
validation_path.write_text(validation, encoding='utf-8')
print('Three-protein meal registration patch applied successfully.')
