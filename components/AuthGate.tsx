'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  AUTHORIZED_EMAIL,
  auth,
  isAuthorizedUser,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
} from '@/lib/firebase';

type SessionState = 'checking' | 'signed-out' | 'authorized';

const bypassAuth =
  process.env.NODE_ENV !== 'production' &&
  !!process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;

export default function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(bypassAuth ? 'authorized' : 'checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bypassAuth) return;

    return onAuthStateChanged(auth, currentUser => {
      if (!currentUser) {
        setState('signed-out');
        return;
      }

      if (isAuthorizedUser(currentUser)) {
        setError('');
        setState('authorized');
        return;
      }

      setError('Acesso não autorizado. Utilize a conta institucional do Aprovisionamento.');
      setState('signed-out');
      void signOutUser().catch(() => undefined);
    });
  }, []);

  const handleLogin = async () => {
    setBusy(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      if (user && isAuthorizedUser(user)) setState('authorized');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível entrar com o Google.';
      if (!message.includes('popup-closed-by-user') && !message.includes('cancelled-popup-request')) {
        setError(message);
      }
      setState('signed-out');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'authorized') return <>{children}</>;

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="bg-slate-950 px-8 py-8 text-white">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-bold tracking-wide">
            HGeSM
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão Aprov</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Acesso restrito ao Aprovisionamento do Hospital Geral de Santa Maria.
          </p>
        </div>

        <div className="px-8 py-8">
          {state === 'checking' ? (
            <div className="flex items-center gap-3 text-sm text-slate-600" role="status">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
              Verificando sessão segura…
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Conta autorizada</p>
                <p className="mt-1 break-all text-sm font-medium text-slate-900">{AUTHORIZED_EMAIL}</p>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900" role="alert">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleLogin}
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {busy ? 'Entrando…' : 'Entrar com Google'}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Os dados operacionais são sincronizados pelo Firebase entre os navegadores autorizados.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
