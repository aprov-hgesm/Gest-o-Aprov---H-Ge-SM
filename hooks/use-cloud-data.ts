'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { db } from '@/lib/firebase';
import { SyncController } from '@/lib/persistence/controller';
import { firestorePort, type CollectionName } from '@/lib/persistence/firestore';
import type { Identified } from '@/lib/persistence/core';

interface CloudOptions<T extends Identified> {
  name: CollectionName;
  initial: T[];
  validate: (value: unknown) => boolean;
  legacy: () => T[] | null;
}
const controllers = new Map<CollectionName, unknown>();
const startedControllers = new WeakSet<object>();

export function useCloudData<T extends Identified>({ name, initial, validate, legacy }: CloudOptions<T>) {
  const controller = useMemo(() => {
    const existing = typeof window !== 'undefined' ? controllers.get(name) as SyncController<T> | undefined : undefined;
    if (existing) return existing;
    const created = new SyncController({
      initial, validate, legacy, storage: () => window.localStorage,
      storageKey: 'gestao-aprov:firestore:v1:' + name,
      legacyKeys: name === 'roster' ? ['dr_military', 'dr_absences', 'dr_roster', 'dr_logs', 'dr_holidays'] : ['dr_cardapios'],
      port: firestorePort<T>(db, name, validate)
    });
    if (typeof window !== 'undefined') controllers.set(name, created);
    return created;
  }, [name, initial, validate, legacy]);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  useEffect(() => {
    if (startedControllers.has(controller)) return;
    startedControllers.add(controller);
    controller.start();
    const online = () => controller.retry();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (controller.getSnapshot().pending) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('online', online);
    window.addEventListener('beforeunload', beforeUnload);
    // These shared services belong to the browser page, not to a visible tab.
    // Keep pending saves, reconnects and the unload warning alive after a tab unmounts.
    // Window listeners disappear with the page; the WeakSet prevents duplicate registration.
  }, [controller]);
  return { state, controller };
}
