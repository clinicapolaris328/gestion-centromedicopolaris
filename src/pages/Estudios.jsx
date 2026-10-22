import { useState, useMemo } from 'react'
import { Form } from 'react-bootstrap'
import { PageHeader, Card, Loader, ErrorState } from '../components/ui'
import BuscadorSelect from '../components/ui/BuscadorSelect'
import { CargaEstudio, ListaEstudios } from '../components/estudios'
import { useApi } from '../hooks/useApi'
import { useVista } from '../context/VistaContext'
import { estudiosApi, pacientesApi, profesionalesApi } from '../lib/api'
import { TIPOS_ESTUDIO } from '../lib/estudios'
import { nombreCompleto } from '../data/mock'
import { formatearDni } from '../lib/dni'

const EMPTY = []

export default function Estudios() {
  const { profId } = useVista()
  const [pacSel, setPacSel] = useState('')
  const [fTipo, setFTipo] = useState('')   // filtro por tipo de estudio
  const [fProf, setFProf] = useState('')   // filtro por profesional que lo cargó

  const pacientes = useApi(() => pacientesApi.list(), [])
  const profesionales = useApi(() => profesionalesApi.list(), [])
  // Con paciente elegido → sus estudios; sin elegir → los más recientes.
  const { data, setData, loading, error, reload } = useApi(
    () => estudiosApi.list(pacSel ? { paciente: pacSel } : {}),
    [pacSel],
  )
  const estudios = data ?? EMPTY
  const estudiosFiltrados = useMemo(
    () => estudios.filter((e) => (!fTipo || e.tipo === fTipo) && (!fProf || e.profId === fProf)),
    [estudios, fTipo, fProf],
  )

  return (
    <>
      <PageHeader
        title="Estudios"
        subtitle="Carga y consulta de archivos clínicos por paciente (PDF, imágenes, DICOM, etc.)"
      />

      <div className="row g-4">
        <div className="col-lg-5">
          <Card title="Cargar estudio">
            <Form.Group className="mb-3">
              <Form.Label>Paciente *</Form.Label>
              <BuscadorSelect
                value={pacSel}
                onChange={setPacSel}
                disabled={pacientes.loading}
                className="w-100"
                opciones={(pacientes.data ?? EMPTY).map((p) => ({ value: p.id, label: `${nombreCompleto(p)} — ${formatearDni(p.dni)}` }))}
                placeholder={pacientes.loading ? 'Cargando…' : 'Seleccionar paciente...'}
              />
            </Form.Group>
            <CargaEstudio
              pacienteId={pacSel}
              profId={profId}
              onSubido={(nuevos) => setData((prev) => [...nuevos, ...(prev ?? EMPTY)])}
            />
          </Card>
        </div>

        <div className="col-lg-7">
          <Card title={pacSel ? 'Estudios del paciente' : 'Estudios recientes'} bodyClass="p-0">
            <div style={{ padding: '4px 20px' }}>
              <div className="filter-bar">
                <BuscadorSelect value={fTipo} onChange={setFTipo} opciones={TIPOS_ESTUDIO} placeholder="Todos los tipos" />
                <BuscadorSelect value={fProf} onChange={setFProf}
                  opciones={(profesionales.data ?? EMPTY).map((p) => ({ value: p.id, label: p.nombre }))}
                  placeholder="Todos los profesionales" />
              </div>
              {loading ? <Loader label="Cargando estudios…" />
                : error ? <ErrorState onRetry={reload}>{error}</ErrorState>
                : (
                  <ListaEstudios
                    estudios={estudiosFiltrados}
                    mostrarPaciente={!pacSel}
                    vacio="Elegí el paciente y cargá el primer archivo desde el panel de la izquierda."
                    onEliminado={(id) => setData((prev) => prev.filter((e) => e.id !== id))}
                  />
                )}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
