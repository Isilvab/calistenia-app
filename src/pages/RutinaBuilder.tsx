import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getStorage } from "@/lib/storage"
import { useRutinaDraftStore } from "@/store/rutinaDraftStore"
import { Card, Button, I, useToast } from "@/components/ui"
import { EjercicioGif } from "@/components/train/EjercicioGif"
import type { Rutina } from "@/types"

export default function RutinaBuilder() {
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id?: string }>()
  const modoEdicion = Boolean(routeId)
  const { toast } = useToast()

  const {
    editId, nombre, descripcion, ejercicios,
    setNombre, setDescripcion,
    removeEjercicio, updateEjercicio,
    clearDraft, loadFromRutina,
  } = useRutinaDraftStore()

  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [gifVisible, setGifVisible] = useState<Set<number>>(new Set())

  useEffect(() => {
    getStorage().getSettings().then(s => setApiKey(s.apiKeys?.exercisedb ?? '')).catch(() => {})
  }, [])

  // Al montar: en modo edición carga la rutina si el draft no tiene ya este id.
  // En modo creación limpia el draft solo si no venimos de /buscar?modo=seleccion
  // con el mismo modo (editId === null ya implica creación; si editId tiene valor
  // pero routeId no existe, limpiar igualmente para no arrastrar).
  useEffect(() => {
    if (modoEdicion && routeId) {
      // Si el draft ya tiene este id (vuelta de /buscar en modo edición) → no recargar
      if (editId === routeId) return
      getStorage().getRutina(routeId).then(rutina => {
        if (!rutina) {
          setLoadError('Rutina no encontrada.')
          return
        }
        loadFromRutina(rutina)
      }).catch(err => setLoadError(String(err)))
    } else {
      // Modo creación: limpiar solo si el draft tiene un editId (viene de editar antes)
      if (editId !== null) clearDraft()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId])

  const builderRetorno = modoEdicion && routeId
    ? `/rutinas/${routeId}/editar`
    : '/rutinas/nueva'

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setValidationError('El nombre de la rutina no puede estar vacío.')
      return
    }
    if (ejercicios.length === 0) {
      setValidationError('Agregá al menos un ejercicio antes de guardar.')
      return
    }
    setValidationError(null)
    setSaving(true)
    try {
      const rutina: Rutina = {
        id: editId ?? '',              // '' → adapter genera uuid (creación); id existente → upsert (edición)
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        ejercicios,
        creada_en: new Date().toISOString(),
      }
      await getStorage().saveRutina(rutina)
      clearDraft()
      toast(modoEdicion ? 'Rutina actualizada' : 'Rutina guardada')
      navigate('/mis-rutinas')
    } catch (err) {
      toast(`Error al guardar: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="px-4 pt-4 pb-28">
        <button onClick={() => navigate(-1)} className="press flex items-center gap-1 text-[var(--muted)] text-[13px] mb-4">
          <I.chevL size={16}/>Volver
        </button>
        <div className="text-red-500 text-sm">{loadError}</div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="press flex items-center gap-1 text-[var(--muted)] text-[13px] mb-3"
      >
        <I.chevL size={16}/>
        Volver
      </button>
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Rutinas</div>
      <div className="text-[26px] font-semibold tracking-tight mb-4">
        {modoEdicion ? 'Editar rutina' : 'Nueva rutina'}
      </div>

      {/* Metadata */}
      <Card className="flex flex-col gap-3 mb-4">
        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 font-medium uppercase tracking-wide block">
            Nombre *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={e => { setNombre(e.target.value); setValidationError(null) }}
            placeholder="ej. Fuerza upper"
            className="w-full h-12 px-4 rounded-xl border border-[var(--line)] bg-[var(--surface-input)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--ink)] transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 font-medium uppercase tracking-wide block">
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Objetivo, notas generales…"
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-[var(--line)] bg-[var(--surface-input)] text-[var(--ink)] text-[14px] outline-none focus:border-[var(--ink)] transition-colors resize-none"
          />
        </div>
      </Card>

      {/* Ejercicios */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[15px] font-semibold">
          Ejercicios{ejercicios.length > 0 ? ` (${ejercicios.length})` : ''}
        </div>
        <button
          onClick={() => navigate(`/buscar?modo=seleccion&retorno=${encodeURIComponent(builderRetorno)}`)}
          className="press flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
        >
          <I.plus size={13}/>
          Agregar ejercicios
        </button>
      </div>

      {ejercicios.length === 0 ? (
        <Card className="py-8 text-center flex flex-col items-center gap-3">
          <div className="text-[var(--muted)] text-sm">Sin ejercicios todavía.</div>
          <button
            onClick={() => navigate(`/buscar?modo=seleccion&retorno=${encodeURIComponent(builderRetorno)}`)}
            className="press flex items-center gap-1.5 text-[13px] px-4 py-2.5 rounded-xl bg-[var(--ink)] text-[var(--bg)]"
          >
            <I.bolt size={14}/>
            Buscar y agregar
          </button>
        </Card>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {ejercicios.map((ej, i) => {
            const modo = ej.modo ?? 'reps'
            return (
              <Card key={i} className="flex flex-col gap-3">
                {/* Nombre + ver GIF + quitar */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold leading-tight">{ej.nombre}</div>
                    {ej.exercisedb_id && (
                      <button
                        onClick={() => setGifVisible(prev => {
                          const next = new Set(prev)
                          next.has(i) ? next.delete(i) : next.add(i)
                          return next
                        })}
                        className="press mt-1 flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border border-[var(--line)] text-[var(--muted)] bg-[var(--surface)]"
                      >
                        <I.play size={9}/>
                        {gifVisible.has(i) ? 'Ocultar GIF' : 'Ver GIF'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => removeEjercicio(i)}
                    className="press flex-shrink-0 w-8 h-8 rounded-lg border border-[var(--line)] flex items-center justify-center text-[var(--muted)]"
                    aria-label="Quitar ejercicio"
                  >
                    <I.x size={14}/>
                  </button>
                </div>
                {ej.exercisedb_id && gifVisible.has(i) && (
                  <EjercicioGif
                    key={ej.exercisedb_id}
                    exercisedbId={ej.exercisedb_id}
                    apiKey={apiKey}
                    autoLoad
                  />
                )}

                {/* Toggle Reps | Tiempo */}
                <div className="flex gap-0.5 p-0.5 bg-[var(--bg)] border border-[var(--line)] rounded-xl">
                  {(['reps', 'tiempo'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => updateEjercicio(i, { modo: m })}
                      className={`press flex-1 h-9 rounded-[10px] text-[12px] font-semibold transition-colors ${
                        modo === m
                          ? 'bg-[var(--ink)] text-[var(--bg)]'
                          : 'text-[var(--muted)]'
                      }`}
                    >
                      {m === 'reps' ? 'Reps' : 'Tiempo'}
                    </button>
                  ))}
                </div>

                {/* Series + campo condicional */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] block mb-1">Series</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={ej.series_objetivo ?? ''}
                      onChange={e => updateEjercicio(i, {
                        series_objetivo: e.target.value ? Number(e.target.value) : undefined,
                      })}
                      placeholder="3"
                      className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--surface-input)] text-[var(--ink)] text-[13px] text-center font-mono outline-none focus:border-[var(--ink)] transition-colors"
                    />
                  </div>
                  {modo === 'reps' ? (
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] block mb-1">Reps / objetivo</label>
                      <input
                        type="text"
                        value={ej.reps_objetivo ?? ''}
                        onChange={e => updateEjercicio(i, { reps_objetivo: e.target.value || undefined })}
                        placeholder="8–12 / AMRAP"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--surface-input)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--ink)] transition-colors"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] block mb-1">Duración (seg)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={ej.duracion_seg ?? ''}
                        onChange={e => updateEjercicio(i, {
                          duracion_seg: e.target.value ? Number(e.target.value) : undefined,
                        })}
                        placeholder="30"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--surface-input)] text-[var(--ink)] text-[13px] text-center font-mono outline-none focus:border-[var(--ink)] transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Descanso */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] block mb-1">Descanso (seg)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={ej.descanso_seg ?? ''}
                    onChange={e => updateEjercicio(i, {
                      descanso_seg: e.target.value ? Number(e.target.value) : undefined,
                    })}
                    placeholder="45"
                    className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--surface-input)] text-[var(--ink)] text-[13px] text-center font-mono outline-none focus:border-[var(--ink)] transition-colors"
                  />
                </div>

                {/* Nota */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[var(--muted)] block mb-1">Nota</label>
                  <input
                    type="text"
                    value={ej.nota ?? ''}
                    onChange={e => updateEjercicio(i, { nota: e.target.value || undefined })}
                    placeholder="Técnica, variante…"
                    className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--surface-input)] text-[var(--ink)] text-[13px] outline-none focus:border-[var(--ink)] transition-colors"
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {validationError && (
        <div className="text-sm text-red-500 mb-3">{validationError}</div>
      )}

      <Button
        size="block"
        variant="primary"
        icon={<I.check size={18}/>}
        onClick={() => { void handleGuardar() }}
        disabled={saving}
      >
        {saving ? 'Guardando…' : modoEdicion ? 'Actualizar rutina' : 'Guardar rutina'}
      </Button>
    </div>
  )
}
