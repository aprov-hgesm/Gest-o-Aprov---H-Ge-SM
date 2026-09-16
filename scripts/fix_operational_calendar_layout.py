from pathlib import Path

p = Path('components/OperationalDashboard.tsx')
text = p.read_text()

wrong = """      <div className=\"text-[11px] text-slate-500 mt-1\">{detail}</div>
      <OperationalCalendar days={calendarDays} onNavigate={onNavigate} />

    </div>
  );
}"""
right = """      <div className=\"text-[11px] text-slate-500 mt-1\">{detail}</div>
    </div>
  );
}"""
if text.count(wrong) != 1:
    raise SystemExit(f'bloco incorreto esperado 1 vez, encontrado {text.count(wrong)}')
text = text.replace(wrong, right, 1)

boundary = """      </div>
    </div>
  );
}

function MetricCard"""
replacement = """      </div>

      <OperationalCalendar days={calendarDays} onNavigate={onNavigate} />
    </div>
  );
}

function MetricCard"""
if text.count(boundary) != 1:
    raise SystemExit(f'fechamento do dashboard esperado 1 vez, encontrado {text.count(boundary)}')
text = text.replace(boundary, replacement, 1)

p.write_text(text)
print('Calendário operacional movido para o escopo correto do dashboard')
