from pathlib import Path

path = Path('components/CardapioSemanal.tsx')
text = path.read_text(encoding='utf-8')

old = '''                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Cargo Conferência</label>
                    <input
                      type="text"
                      value={currentCardapio.workflow.conferido.cargo}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.workflow.conferido.cargo = e.target.value;
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Cargo Aprovação</label>
                    <input
                      type="text"
                      value={currentCardapio.workflow.aprovado.cargo}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.workflow.aprovado.cargo = e.target.value;
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>'''

new = '''                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-700">Fiscal ADM / Conferência</span>
                      <p className="text-[9.5px] text-slate-500">Dados exibidos no bloco CONFERIDO do cabeçalho oficial.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600">Cargo / Função</label>
                      <input
                        type="text"
                        value={currentCardapio.workflow.conferido.cargo}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.workflow.conferido.cargo = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        placeholder="Ex: Chefe Fiscal Adm."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600">Nome do Fiscal ADM</label>
                      <input
                        type="text"
                        value={currentCardapio.workflow.conferido.responsavel}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.workflow.conferido.responsavel = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold"
                        placeholder="Ex: Maj Fulano de Tal"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-700">Diretor(a) HGeSM / Aprovação</span>
                      <p className="text-[9.5px] text-slate-500">Dados exibidos no bloco de aprovação do cabeçalho oficial.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600">Cargo / Função</label>
                      <input
                        type="text"
                        value={currentCardapio.workflow.aprovado.cargo}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.workflow.aprovado.cargo = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        placeholder="Ex: Diretor(a) HGeSM"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600">Nome do(a) Diretor(a) HGeSM</label>
                      <input
                        type="text"
                        value={currentCardapio.workflow.aprovado.responsavel}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.workflow.aprovado.responsavel = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold"
                        placeholder="Ex: Cel Fulana de Tal"
                      />
                    </div>
                  </div>
                </div>'''

count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected signatory block exactly once, found {count}')

path.write_text(text.replace(old, new, 1), encoding='utf-8')
