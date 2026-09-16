'use client';

import React from 'react';
import { ChevronRight, Compass } from 'lucide-react';
import { getOperationalNavigationContext, type OperationalTab, type ProfessionalSection } from '@/lib/domain/operational-navigation';

export default function OperationalContextBar({
  activeTab,
  onNavigate,
  onOpenProfessional,
}: {
  activeTab: OperationalTab;
  onNavigate: (tab: OperationalTab) => void;
  onOpenProfessional: (section: ProfessionalSection) => void;
}) {
  const context = getOperationalNavigationContext(activeTab);

  return (
    <div className="px-6 py-2.5 bg-slate-50/95 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-2 no-print">
      <div className="min-w-0 flex items-center gap-2 text-xs">
        <Compass className="w-4 h-4 text-emerald-700 shrink-0" />
        {activeTab !== 'inicio' && (
          <>
            <button onClick={() => onNavigate('inicio')} className="font-semibold text-slate-500 hover:text-emerald-800 transition-colors">Central Operacional</button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          </>
        )}
        <div className="min-w-0">
          <span className="font-bold text-slate-800">{context.label}</span>
          <span className="hidden xl:inline text-slate-400 ml-2">{context.description}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:pb-0">
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mr-1 shrink-0">Atalhos</span>
        {context.actions.map(action => (
          <button
            key={action.id}
            type="button"
            onClick={() => action.professionalSection ? onOpenProfessional(action.professionalSection) : action.tab && onNavigate(action.tab)}
            className="shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:text-emerald-900 hover:border-emerald-200 hover:bg-emerald-50 transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
