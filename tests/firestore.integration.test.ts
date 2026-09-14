import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { firestorePort } from '../lib/persistence/firestore.ts';
import { validateCardapio } from '../lib/persistence/validation.ts';
import { SyncConflict, type RecordMap } from '../lib/persistence/core.ts';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const enabled = host === '127.0.0.1:8080' && process.env.GCLOUD_PROJECT === 'demo-aprov';
function sample(id: string) {
  return {
    id, dataInicio: '2026-09-14', dataFim: '2026-09-20', dataEmissao: '2026-09-14',
    cidade: 'Santa Maria', uf: 'RS', regiaoMilitar: '3', organizacaoMilitar: 'Teste', divisao: 'Aprov',
    workflow: { status: 'EM_ELABORACAO', conferido: { cargo: '', responsavel: '', status: 'PENDENTE' },
      aprovado: { cargo: '', responsavel: '', status: 'PENDENTE' } },
    lancheTexto: '', ceiaPacienteTexto: '', observacaoGeral: '', basicoCopaInternados: '',
    responsavelTecnico: { nome: '', postoGraduacao: '', funcao: '' },
    dias: Array.from({ length: 7 }, (_, index) => ({
      date: '2026-09-' + (14 + index), diaSemana: 'Dia', diaSemanaLabel: 'DIA',
      cafeManhaCeia: '', colacaoPaciente: '', ceia: '',
      almoco: { geral: { arroz: '', feijao: '', proteina: '', guarnicao: '', salada: '', bebida: '', sobremesa: '' },
        pacienteProteina: '' }, jantarPaciente: { prato: '' }
    }))
  };
}
function client(name: string, uid?: string) {
  if (!enabled) throw new Error('Integration tests require the local demo-aprov emulator.');
  const app = initializeApp({ projectId: 'demo-aprov', apiKey: 'demo-key', appId: 'demo-app' }, name);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080, uid ? { mockUserToken: { sub: uid } } : undefined);
  return { app, db };
}
test('real Firestore transactions, subscriptions, conflicts, idempotency and security rules', { skip: !enabled, timeout: 45000 }, async () => {
  const seed = await fetch('http://127.0.0.1:8080/v1/projects/demo-aprov/databases/(default)/documents/aprov_members/editor', {
    method: 'PATCH', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { enabled: { booleanValue: true }, role: { stringValue: 'editor' } } })
  });
  assert.equal(seed.ok, true, await seed.text());
  const one = client('editor-one', 'editor'), two = client('editor-two', 'editor');
  const denied = client('anonymous');
  const portOne = firestorePort<ReturnType<typeof sample>>(one.db, 'cardapios', validateCardapio);
  const portTwo = firestorePort<ReturnType<typeof sample>>(two.db, 'cardapios', validateCardapio);
  const id = 'integration-' + Date.now(), data = sample(id);
  try {
    await assert.rejects(getDocs(collection(denied.db, 'aprov_workspaces/hgesm/cardapios')),
      (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied');
    const attempt = { id: 'create-' + id, changes: [{ id, data, deleted: false, expectedRevision: 0 }] };
    const first = await portOne.commit(attempt);
    assert.equal(first[id].revision, 1);
    const replay = await portTwo.commit(attempt);
    assert.equal(replay[id].revision, 1);
    const observed = await new Promise<RecordMap<ReturnType<typeof sample>>>((resolve, reject) => {
      const timeout = setTimeout(() => { unsubscribe(); reject(new Error('Snapshot timeout')); }, 10000);
      const unsubscribe = portTwo.listen(records => {
        if (records[id]) { clearTimeout(timeout); unsubscribe(); resolve(records); }
      }, error => { clearTimeout(timeout); unsubscribe(); reject(error); });
    });
    assert.equal(observed[id].data.dias.length, 7);
    const writes = await Promise.allSettled([
      portOne.commit({ id: 'edit-one', changes: [{ id, data: { ...data, cidade: 'Primeiro' }, deleted: false, expectedRevision: 1 }] }),
      portTwo.commit({ id: 'edit-two', changes: [{ id, data: { ...data, cidade: 'Segundo' }, deleted: false, expectedRevision: 1 }] })
    ]);
    assert.equal(writes.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(writes.filter(result => result.status === 'rejected' && result.reason instanceof SyncConflict).length, 1);
    await assert.rejects(deleteDoc(doc(one.db, 'aprov_workspaces/hgesm/cardapios/' + id)));
    await assert.rejects(setDoc(doc(one.db, 'aprov_members/editor'), { enabled: true, role: 'admin' }));
    await assert.rejects(setDoc(doc(one.db, 'aprov_workspaces/hgesm/cardapios/' + id),
      { data, revision: 999, schemaVersion: 1, deleted: false, mutationId: 'invalid', updatedAt: new Date() }));
  } finally {
    await Promise.all([deleteApp(one.app), deleteApp(two.app), deleteApp(denied.app)]);
  }
});
