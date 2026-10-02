import { useState } from "react";
import { useApp } from "../context/AppContext";
import { EmptyState, PageHeader, SegmentedControl } from "../components/UI";
import { ATTENDANCE, BLOCKS } from "../utils/constants";
import { isActive, todayISO } from "../utils/helpers";

const OPTIONS = Object.entries(ATTENDANCE).map(
  ([value, { label, tone, description }]) => ({
    value,
    label,
    tone,
    description,
  }),
);

export default function AttendancePage() {
  const { state, actions } = useApp();
  const [date, setDate] = useState(todayISO());
  const [block, setBlock] = useState("AM");
  const active = state.athletes.filter(isActive);
  const statusOf = (a) =>
    state.sessions.find(
      (s) => s.athleteId === a.id && s.date === date && s.block === block,
    )?.status;

  return (
    <>
      <PageHeader title="Asistencia">
        <input
          type="date"
          className="form-control"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          className="form-select"
          value={block}
          onChange={(e) => setBlock(e.target.value)}
        >
          {BLOCKS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </PageHeader>

      {active.length ? (
        <ul className="list-group">
          {active.map((a) => (
            <li
              key={a.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div>
                {a.name}
                <div className="small text-secondary">
                  Clases restantes: {a.remaining}
                </div>
              </div>
              <SegmentedControl
                options={OPTIONS}
                value={statusOf(a)}
                onChange={(status) =>
                  actions.markAttendance({
                    athleteId: a.id,
                    date,
                    block,
                    status,
                  })
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState>
          No hay atletas activos. Agrégalos en la sección Atletas.
        </EmptyState>
      )}
    </>
  );
}
