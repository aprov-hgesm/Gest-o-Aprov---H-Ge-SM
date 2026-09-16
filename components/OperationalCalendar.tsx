'use client';

import React from 'react';
import { Beef, CalendarDays, ShieldAlert, UserRoundCheck, UserX, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OperationalCalendarDay, OperationalCalendarTab } from '@/lib/domain/operational-calendar';

export default function OperationalCalendar({
  days,
  onNavigate,
}: {
  days: OperationalCalendarDay[];
  onNavigate: (tab: OperationalCalendarTab) => void;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-700" />
            <h4 className="font-bold text-slate-900">Calendário operacional</h4>
          </div>
          <p className="text-xs text-slate-500 mt-1">Próximos 14 dias consolidados entre escala, afastamentos, cardápio e saque de carnes.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
          <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100">Escala</span>
          <span className="px-2 py-1 rounded-full bg-amber-50 border border-amber-100">Afastamentos</span>
          <span className="px-2 py-1 rounded-full bg-sky-50 border border-sky-100">Saque</span>
          <span className="px-2 py-1 rounded-full bg-violet-50 border border-violet-100">Cardápio</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
        {days.map(day => {
          const hasRoster = day.services.length > 0 || day.vacancies.length > 0;
          const hasAbsenceEvent = day.absenceStarts.length > 0 || day.absenceEnds.length > 0;
          return (
            <div
              key={day.iso}
              className={cn(
                'rounded-xl border p-3 min-h-[190px] flex flex-col gap-2',
                day.isToday ? 'border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-200' : 'border-slate-200 bg-white'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">{day.weekday}</p>
                  <p className="text-lg font-bold text-slate-900">{day.dayLabel}</p>
                </div>
                {day.isToday && <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-full bg-emerald-600 text-white">Hoje</span>}
              </div>

              <div className="space-y-1.5 flex-1">
                {hasRoster && (
                  <button onClick={() => onNavigate('dashboard')} className="w-full text-left rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2 hover:bg-emerald-100/70 transition-colors">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-800"><UserRoundCheck className="w-3 h-3" /> Escala</span>
                    <span className="block text-[11px] text-emerald-900 mt-0.5">{day.services.length} designado(s) · {day.vacancies.length} vaga(s)</span>
                  </button>
                )}

                {hasAbsenceEvent && (
                  <button onClick={() => onNavigate('afastamentos')} className="w-full text-left rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 hover:bg-amber-100/70 transition-colors">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-amber-800"><UserX className="w-3 h-3" /> Afastamentos</span>
                    {day.absenceStarts.length > 0 && <span className="block text-[11px] text-amber-900 mt-0.5">Início: {day.absenceStarts.join(', ')}</span>}
                    {day.absenceEnds.length > 0 && <span className="block text-[11px] text-amber-900 mt-0.5">Término: {day.absenceEnds.join(', ')}</span>}
                  </button>
                )}

                {day.meatItems > 0 && (
                  <button onClick={() => onNavigate('cardapio')} className="w-full text-left rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-2 hover:bg-sky-100/70 transition-colors">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-sky-800"><Beef className="w-3 h-3" /> Saque</span>
                    <span className="block text-[11px] text-sky-900 mt-0.5">{day.meatKg.toLocaleString('pt-BR')} kg · {day.meatItems} item(ns)</span>
                  </button>
                )}

                <button onClick={() => onNavigate('cardapio')} className={cn(
                  'w-full text-left rounded-lg border px-2.5 py-2 transition-colors',
                  day.cardapioStatus ? 'border-violet-100 bg-violet-50 hover:bg-violet-100/70' : 'border-rose-100 bg-rose-50 hover:bg-rose-100/70'
                )}>
                  <span className={cn('flex items-center gap-1.5 text-[10px] font-bold uppercase', day.cardapioStatus ? 'text-violet-800' : 'text-rose-800')}>
                    {day.cardapioStatus ? <UtensilsCrossed className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />} Cardápio
                  </span>
                  <span className={cn('block text-[11px] mt-0.5', day.cardapioStatus ? 'text-violet-900' : 'text-rose-900')}>
                    {day.cardapioStatus ? day.cardapioStatus.replaceAll('_', ' ') : 'Sem semana cadastrada'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
