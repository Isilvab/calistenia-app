// Factory singleton del adapter de storage.
// Las pages siempre llaman getStorage() — nunca instancian el adapter directamente.
//
// Estrategia de selección:
// Consultamos el estado en memoria del authStore (zustand) de forma síncrona.
// Esto es seguro porque:
// 1. authStore.init() resuelve antes de que RequireAuth renderice las pages.
// 2. getStorage() solo se llama desde pages, que solo renderizan con sesión activa.
// Por lo tanto, cuando getStorage() se ejecuta, el estado de auth ya está resuelto
// y podemos leerlo sincrónicamente sin necesidad de await.

import type { StorageAdapter } from './types'
import { LocalStorageAdapter } from './localAdapter'
import { SupabaseAdapter } from './supabaseAdapter'
import { useAuthStore } from '@/store/authStore'

let _instance: StorageAdapter | null = null

export function getStorage(): StorageAdapter {
  if (_instance) return _instance
  const { session } = useAuthStore.getState()
  _instance = session ? new SupabaseAdapter() : new LocalStorageAdapter()
  return _instance
}

/** Limpiar singleton — llamar en signOut para que el próximo usuario arranque fresco. */
export function resetStorage(): void {
  _instance = null
}

export type { StorageAdapter } from './types'
export { LocalStorageAdapter } from './localAdapter'
export { SupabaseAdapter } from './supabaseAdapter'
