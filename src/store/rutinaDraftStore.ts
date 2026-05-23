import { create } from 'zustand'
import type { Rutina, RutinaEjercicio } from '@/types'

interface RutinaDraftState {
  editId: string | null    // null = modo creación; non-null = modo edición (preserva id al ir a /buscar y volver)
  nombre: string
  descripcion: string
  ejercicios: RutinaEjercicio[]
  setNombre: (nombre: string) => void
  setDescripcion: (descripcion: string) => void
  addEjercicio: (ej: RutinaEjercicio) => void
  removeEjercicio: (index: number) => void
  updateEjercicio: (index: number, patch: Partial<RutinaEjercicio>) => void
  clearDraft: () => void
  loadFromRutina: (rutina: Rutina) => void
}

export const useRutinaDraftStore = create<RutinaDraftState>((set) => ({
  editId: null,
  nombre: '',
  descripcion: '',
  ejercicios: [],

  setNombre: (nombre) => set({ nombre }),
  setDescripcion: (descripcion) => set({ descripcion }),

  addEjercicio: (ej) => set((state) => ({
    ejercicios: [...state.ejercicios, ej],
  })),

  removeEjercicio: (index) => set((state) => ({
    ejercicios: state.ejercicios.filter((_, i) => i !== index),
  })),

  updateEjercicio: (index, patch) => set((state) => ({
    ejercicios: state.ejercicios.map((ej, i) => i === index ? { ...ej, ...patch } : ej),
  })),

  clearDraft: () => set({ editId: null, nombre: '', descripcion: '', ejercicios: [] }),

  loadFromRutina: (rutina) => set({
    editId: rutina.id,
    nombre: rutina.nombre,
    descripcion: rutina.descripcion,
    ejercicios: rutina.ejercicios,
  }),
}))
