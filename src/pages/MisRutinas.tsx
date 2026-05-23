import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { getStorage } from "@/lib/storage"
import { useRutinaDraftStore } from "@/store/rutinaDraftStore"
import { Card, Button, I, Modal, useToast, Spinner } from "@/components/ui"
import type { Rutina } from "@/types"

export default function MisRutinas() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const clearDraft = useRutinaDraftStore(s => s.clearDraft)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rutinas, setRutinas] = useState<Rutina[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getStorage().listRutinas()
      setRutinas(list)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    setDeleting(true)
    try {
      await getStorage().deleteRutina(confirmDeleteId)
      setRutinas(prev => prev.filter(r => r.id !== confirmDeleteId))
      toast('Rutina eliminada')
    } catch (e) {
      toast(`Error al borrar: ${String(e)}`)
    } finally {
      setDeleting(false)
      setConfirmDeleteId(null)
    }
  }

  const handleNueva = () => {
    clearDraft()
    navigate('/rutinas/nueva')
  }

  const rutinaABorrar = rutinas.find(r => r.id === confirmDeleteId)

  if (loading) return <div className="flex items-center justify-center p-16"><Spinner size={36}/></div>
  if (error) return <div className="p-4 text-red-500">{error}</div>

  return (
    <div className="px-4 pt-4 pb-28 anim-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] font-medium">Mis rutinas</div>
          <div className="text-[26px] font-semibold tracking-tight">Rutinas custom</div>
        </div>
        <button
          onClick={handleNueva}
          className="press flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-xl bg-[var(--ink)] text-[var(--bg)] mt-1"
        >
          <I.plus size={13}/>
          Nueva
        </button>
      </div>

      {/* Lista vacía */}
      {rutinas.length === 0 ? (
        <Card className="py-10 text-center flex flex-col items-center gap-3">
          <div className="text-[var(--muted)] text-sm">No tenés rutinas guardadas todavía.</div>
          <button
            onClick={handleNueva}
            className="press flex items-center gap-1.5 text-[13px] px-4 py-2.5 rounded-xl bg-[var(--ink)] text-[var(--bg)]"
          >
            <I.plus size={14}/>
            Crear primera rutina
          </button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rutinas.map(rutina => (
            <Card key={rutina.id} className="flex flex-col gap-2">
              {/* Nombre + descripción */}
              <div>
                <div className="text-[16px] font-semibold leading-snug">{rutina.nombre}</div>
                {rutina.descripcion && (
                  <div className="text-[13px] text-[var(--muted)] mt-0.5 line-clamp-2">{rutina.descripcion}</div>
                )}
              </div>

              {/* Metadata */}
              <div className="text-[11px] text-[var(--muted)]">
                {rutina.ejercicios.length} ejercicio{rutina.ejercicios.length !== 1 ? 's' : ''}
                {' · '}
                {new Date(rutina.creada_en).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-1 border-t border-[var(--line)]">
                <button
                  onClick={() => navigate(`/rutinas/${rutina.id}/editar`)}
                  className="press flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] flex-1 justify-center"
                >
                  <I.edit size={13}/>
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDeleteId(rutina.id)}
                  className="press flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-500 flex-1 justify-center"
                >
                  <I.trash size={13}/>
                  Borrar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal confirmación de borrado */}
      <Modal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="¿Borrar rutina?"
      >
        <div className="text-sm text-[var(--ink-soft)] mb-4">
          Se eliminará <span className="font-semibold">"{rutinaABorrar?.nombre ?? ''}"</span> y no se puede deshacer.
        </div>
        <div className="flex gap-2">
          <Button variant="soft" className="flex-1" onClick={() => setConfirmDeleteId(null)}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => { void handleDelete() }} disabled={deleting}>
            {deleting ? 'Borrando…' : 'Sí, borrar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
