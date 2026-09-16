from pathlib import Path

p = Path('app/page.tsx')
text = p.read_text()

def rep(old, new):
    global text
    if old not in text:
        raise SystemExit('Anchor not found: ' + old[:160])
    text = text.replace(old, new, 1)

rep(
"""  const [newMilScaleType, setNewMilScaleType] = useState<'EP' | 'EV' | 'Ambas'>('Ambas');
  const [newMilStatus, setNewMilStatus] = useState<'Ativo' | 'Afastado'>('Ativo');
  const [newMilDutyCount, setNewMilDutyCount] = useState(0);
""",
"""  const [newMilScaleType, setNewMilScaleType] = useState<'EP' | 'EV' | 'Ambas'>('Ambas');
"""
)

rep(
"""      specialtySecondary: newMilSpecialtySecondary === 'Nenhuma' ? undefined : newMilSpecialtySecondary,
      status: newMilStatus,
      type: newMilScaleType,
      dutyCount: newMilDutyCount
""",
"""      specialtySecondary: newMilSpecialtySecondary === 'Nenhuma' ? undefined : newMilSpecialtySecondary,
      status: 'Ativo',
      type: newMilScaleType,
      dutyCount: 0
"""
)

rep(
"""                    <div className="space-y-1">
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
""",
"""                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block">Situação operacional</label>
                      <div className="min-h-[34px] px-3 py-2 border border-slate-200 rounded-lg text-[11px] leading-4 bg-slate-50 text-slate-600">
                        Status é definido pela aba <strong>Afastamentos</strong>; a contagem de serviços é calculada automaticamente pela escala.
                      </div>
                    </div>
                  </div>
"""
)

rep(
"""                <div className="space-y-1">
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
""",
"""                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">Serviços Cumpridos</label>
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-slate-50 text-slate-700">
                    {editingMil.dutyCount} serviço(s) — cálculo automático
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Situação de Prontidão</label>
                <div className={cn(
                  'w-full px-3 py-2 border rounded-lg text-xs font-semibold',
                  editingMil.status === 'Ativo' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
                )}>
                  {editingMil.status} — gerenciado exclusivamente pela aba Afastamentos
                </div>
              </div>
"""
)

rep(
"""                    <h3 className="text-3xl font-black text-slate-800">{absences.filter(a => a.status === 'ATIVO').length}</h3>
""",
"""                    <h3 className="text-3xl font-black text-slate-800">{new Set(absences.filter(a => resolveAbsenceStatus(a) === 'ATIVO').map(a => a.militaryId)).size}</h3>
"""
)

rep(
"""                      {String(absences.filter(a => {
                        if (a.indefinite || !a.endDate || a.endDate === 'Indefinido') return false;
                        const endDay = getDayNumberFromISO(a.endDate);
                        return endDay >= 1 && endDay <= 7;
                      }).length).padStart(2, '0')}
""",
"""                      {(() => {
                        const today = localIsoDate();
                        const horizonDate = new Date();
                        horizonDate.setDate(horizonDate.getDate() + 7);
                        const horizon = localIsoDate(horizonDate);
                        const returning = new Set(absences.filter(a => {
                          if (resolveAbsenceStatus(a) !== 'ATIVO' || a.indefinite || !a.endDate || a.endDate === 'Indefinido') return false;
                          return a.endDate >= today && a.endDate <= horizon;
                        }).map(a => a.militaryId));
                        return String(returning.size).padStart(2, '0');
                      })()}
"""
)

rep("<option value=\"Afastado\">Afastado / LTS</option>", "<option value=\"Afastado\">Afastado</option>")
rep("{mil.status === 'Ativo' ? 'Disponível' : 'LTS'}", "{mil.status === 'Ativo' ? 'Disponível' : 'Afastado'}")
rep("{mil.status === 'Ativo' ? 'Ativo' : 'LTS / Disp'}", "{mil.status === 'Ativo' ? 'Ativo' : 'Afastado'}")

p.write_text(text)
print('Manual status/duty editing removed and absence dashboard metrics corrected.')
