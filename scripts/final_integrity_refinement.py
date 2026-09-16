from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Anchor not found in {path}: {old[:180]!r}')
    p.write_text(text.replace(old, new, 1))

replace_once(
    'app/page.tsx',
    """    const updatedRoster = clean(roster);\n    Object.keys(updatedRoster).forEach(day => {\n      Object.keys(updatedRoster[day]).forEach(post => {\n        const cell = updatedRoster[day][post];\n        if (cell && cell.militaryId === abs.militaryId && cell.type === 'DISP') updatedRoster[day][post] = null;\n      });\n    });\n\n    const action = nextStatus === 'CANCELADO' ? 'Afastamento agendado cancelado' : 'Retorno de afastamento homologado';\n""",
    """    const updatedRoster = clean(roster);\n    Object.keys(updatedRoster).forEach(day => {\n      const dayISO = ddmmyyyyToIso(day);\n      const wasCoveredByThisAbsence = dayISO >= abs.startDate && (abs.indefinite || dayISO <= abs.endDate);\n      const coveredByAnotherAbsence = isMilitaryAbsentOnDate(\n        updatedAbsences.filter(item => item.id !== id),\n        abs.militaryId,\n        dayISO\n      );\n      Object.keys(updatedRoster[day]).forEach(post => {\n        const cell = updatedRoster[day][post];\n        if (\n          cell && cell.militaryId === abs.militaryId && cell.type === 'DISP' &&\n          dayISO >= today && wasCoveredByThisAbsence && !coveredByAnotherAbsence\n        ) updatedRoster[day][post] = null;\n      });\n    });\n\n    const action = nextStatus === 'CANCELADO' ? 'Afastamento agendado cancelado' : 'Retorno de afastamento homologado';\n"""
)

replace_once(
    'components/CardapioSemanal.tsx',
    """  const updateCurrentCardapio = (updated: WeeklyCardapioDoc) => {\n    const persisted = cardapiosList.find(c => c.id === updated.id);\n    if (persisted?.workflow.status === 'FINALIZADO' && updated.workflow.status !== 'EM_ELABORACAO') {\n      showToast('Cardápio finalizado está bloqueado para edição. Reabra o documento antes de alterar.', 'info');\n      return false;\n    }\n    const updatedList = cardapiosList.some(c => c.id === updated.id)\n      ? cardapiosList.map(c => c.id === updated.id ? updated : c)\n      : [updated, ...cardapiosList];\n    return saveCardapios(updatedList, updated.id);\n  };\n""",
    """  const updateCurrentCardapio = (updated: WeeklyCardapioDoc) => {\n    const persisted = cardapiosList.find(c => c.id === updated.id);\n    if (persisted?.workflow.status === 'FINALIZADO' && updated.workflow.status !== 'EM_ELABORACAO') {\n      showToast('Cardápio finalizado está bloqueado para edição. Reabra o documento antes de alterar.', 'info');\n      return false;\n    }\n\n    let candidate = updated;\n    const editedAfterReview = persisted &&\n      (persisted.workflow.status === 'CONFERIDO' || persisted.workflow.status === 'APROVADO') &&\n      updated.workflow.status === persisted.workflow.status;\n    if (editedAfterReview) {\n      candidate = JSON.parse(JSON.stringify(updated)) as WeeklyCardapioDoc;\n      candidate.workflow.status = 'EM_ELABORACAO';\n      candidate.workflow.conferido.status = 'PENDENTE';\n      candidate.workflow.conferido.data = undefined;\n      candidate.workflow.aprovado.status = 'PENDENTE';\n      candidate.workflow.aprovado.data = undefined;\n      showToast('Alteração no conteúdo reabriu o cardápio para nova conferência.', 'info');\n    }\n\n    const updatedList = cardapiosList.some(c => c.id === candidate.id)\n      ? cardapiosList.map(c => c.id === candidate.id ? candidate : c)\n      : [candidate, ...cardapiosList];\n    return saveCardapios(updatedList, candidate.id);\n  };\n"""
)

print('Final integrity refinements applied.')
