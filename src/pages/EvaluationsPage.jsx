import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useForm } from '../hooks/useForm'
import { EmptyState, PageHeader } from '../components/UI'
import { improvementVsFirst, isActive, todayISO } from '../utils/helpers'

const BLANK = { date: todayISO(), circuit: '', laps: '', longJump: '', highJump: '', speed: '' }
const fmt = (v) => v ?? '-'

export default function EvaluationsPage() {
  const { state, actions } = useApp()
  const [athleteId, setAthleteId] = useState('')
  const { values, bind, reset } = useForm(BLANK)

  // Solo se muestra un atleta a la vez: sin rankings ni comparaciones entre alumnos
  const logs = state.logs.filter((l) => l.athleteId === athleteId).sort((a, b) => a.date.localeCompare(b.date))
  const first = logs.find((l) => l.speed)?.speed
  const rows = logs.map((l) => ({ ...l, delta: improvementVsFirst(first, l.speed) }))

  const submit = (e) => {
    e.preventDefault()
    actions.addEvaluation(athleteId, values)
    reset({ circuit: values.circuit })
  }
  const numField = (label, key) => (
    <div className="col-2"><label className="form-label">{label}</label><input type="number" step="any" className="form-control" {...bind(key)} /></div>
  )

  return (
    <>
      {/* <PageHeader title="Evaluaciones"> 
        <select className="form-select" value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
          <option value="">Selecciona un atleta</option>
          {state.athletes.filter(isActive).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </PageHeader>
      */}

      {athleteId && (
        <>
          <form className="row g-2 align-items-end mb-4" onSubmit={submit}>
            <div className="col-2"><label className="form-label">Fecha</label><input type="date" className="form-control" {...bind('date')} /></div>
            <div className="col-3"><label className="form-label">Circuito</label><input className="form-control" {...bind('circuit')} /></div>
            <div className="col-5"><label className="form-label">Vueltas (seg, separadas por espacio)</label><input className="form-control" placeholder="12,4 11,9 11,7" {...bind('laps')} /></div>
            <div className="col-2" />
            {numField('Salto largo (cm)', 'longJump')}
            {numField('Salto alto (cm)', 'highJump')}
            {numField('Velocidad (seg)', 'speed')}
            <div className="col-2"><button className="btn btn-primary w-100">Guardar evaluación</button></div>
          </form>

          {rows.length ? (
            <table className="table table-sm align-middle">
              <thead><tr><th>Fecha</th><th>Circuito</th><th>Vueltas</th><th>Mejor</th><th>Largo</th><th>Alto</th><th>Velocidad</th><th>Vs. inicial</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td><td>{r.circuit}</td><td>{r.laps.join(' / ')}</td><td>{fmt(r.best)}</td>
                    <td>{fmt(r.longJump)}</td><td>{fmt(r.highJump)}</td><td>{fmt(r.speed)}</td>
                    <td className={r.delta > 0 ? 'text-ok' : r.delta < 0 ? 'text-bad' : ''}>{r.delta === null ? '-' : r.delta.toFixed(1) + '%'}</td>
                    <td className="text-end"><button className="btn btn-sm btn-outline-secondary" onClick={() => actions.removeEvaluation(r.id)}>Borrar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState>Este atleta aún no tiene evaluaciones.</EmptyState>}
        </>
      )}
    </>
  )
}
