// Factory singleton del adapter de storage.
// Las pages siempre llaman getStorage() — nunca instancian el adapter directamente.
// En la Sesión 2, este factory devuelve SupabaseAdapter si el usuario está logueado.

import type { StorageAdapter } from './types'
import { LocalStorageAdapter } from './localAdapter'

let _instance: StorageAdapter | null = null

export function getStorage(): StorageAdapter {
  if (!_instance) {
    _instance = new LocalStorageAdapter()
  }
  return _instance
}

export type { StorageAdapter } from './types'
export { LocalStorageAdapter } from './localAdapter'
