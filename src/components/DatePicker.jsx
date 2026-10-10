import { useState } from "react";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const parseISODate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toISODate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatDate = (date) =>
  date
    ? date.toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" />
  </svg>
);

export default function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("days");
  const selectedDate = parseISODate(value);
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () =>
      new Date(
        (selectedDate ?? today).getFullYear(),
        (selectedDate ?? today).getMonth(),
        1,
      ),
  );

  const openCalendar = () => {
    const current = parseISODate(value) ?? new Date();
    setVisibleMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    setView("days");
    setOpen(true);
  };

  const shiftMonth = (offset) => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const shiftDecade = (offset) => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear() + offset * 10, current.getMonth(), 1),
    );
  };

  const selectYear = (year) => {
    setVisibleMonth(
      (current) => new Date(year, current.getMonth(), 1),
    );
    setView("days");
  };

  const selectDate = (date) => {
    onChange(toISODate(date));
    setOpen(false);
  };

  const monthName = visibleMonth.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });
  const monthLabel = visibleMonth.toLocaleDateString("es-CL", {
    month: "long",
  });
  const firstWeekday = (visibleMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const year = visibleMonth.getFullYear();
  const decadeStart = Math.floor(year / 10) * 10;
  const years = Array.from({ length: 12 }, (_, index) => decadeStart - 1 + index);

  return (
    <>
      <button
        id={id}
        type="button"
        className={`form-control date-picker-trigger${className ? ` ${className}` : ""}`}
        onClick={openCalendar}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `Fecha: ${formatDate(selectedDate)}` : placeholder}
      >
        <span className={value ? "date-picker-value" : "date-picker-placeholder"}>
          {value ? formatDate(selectedDate) : placeholder}
        </span>
        <CalendarIcon />
      </button>

      {open && (
        <div
          className="date-picker-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <section
            className="date-picker-modal date-picker-calendar-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Seleccionar fecha"
            tabIndex={-1}
          >
            <header className="date-picker-header">
              <div>
                <span className="date-picker-eyebrow"></span>
                <h2>{view === "years" ? "Selecciona un año" : "Selecciona un día"}</h2>
              </div>
              <button
                type="button"
                className="date-picker-close"
                onClick={() => setOpen(false)}
                aria-label="Cerrar calendario"
              >
                ×
              </button>
            </header>

            <div className="date-picker-body">
              <div className="date-picker-month-nav">
                <button
                  type="button"
                  onClick={() =>
                    view === "years" ? shiftDecade(-1) : shiftMonth(-1)
                  }
                  aria-label={view === "years" ? "Década anterior" : "Mes anterior"}
                >
                  ‹
                </button>
                {view === "years" ? (
                  <h3>{`${decadeStart}–${decadeStart + 9}`}</h3>
                ) : (
                  <h3>
                    <span>{monthLabel} </span>
                    <button
                      type="button"
                      className="date-picker-year-button"
                      onClick={() => setView("years")}
                      aria-label={`Seleccionar año ${year}`}
                    >
                      {year}
                    </button>
                  </h3>
                )}
                <button
                  type="button"
                  onClick={() =>
                    view === "years" ? shiftDecade(1) : shiftMonth(1)
                  }
                  aria-label={view === "years" ? "Década siguiente" : "Mes siguiente"}
                >
                  ›
                </button>
              </div>

              {view === "years" ? (
                <div className="date-picker-years" aria-label="Seleccionar año">
                  {years.map((yearOption) => (
                    <button
                      type="button"
                      key={yearOption}
                      className={[
                        "date-picker-year",
                        yearOption === year ? "is-selected" : "",
                        yearOption === today.getFullYear() ? "is-today" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-pressed={yearOption === year}
                      onClick={() => selectYear(yearOption)}
                    >
                      {yearOption}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="date-picker-calendar" aria-label={monthName}>
                  {WEEKDAYS.map((weekday, index) => (
                    <span
                      className="date-picker-weekday"
                      key={`${weekday}-${index}`}
                    >
                      {weekday}
                    </span>
                  ))}
                  {calendarCells.map((day, index) => {
                    if (!day) {
                      return (
                        <span
                          className="date-picker-empty-day"
                          key={`empty-${index}`}
                        />
                      );
                    }
                    const date = new Date(
                      visibleMonth.getFullYear(),
                      visibleMonth.getMonth(),
                      day,
                    );
                    const isSelected =
                      selectedDate?.getFullYear() === date.getFullYear() &&
                      selectedDate?.getMonth() === date.getMonth() &&
                      selectedDate?.getDate() === day;
                    const isToday =
                      today.getFullYear() === date.getFullYear() &&
                      today.getMonth() === date.getMonth() &&
                      today.getDate() === day;

                    return (
                      <button
                        type="button"
                        key={day}
                        className={[
                          "date-picker-day",
                          isSelected ? "is-selected" : "",
                          isToday ? "is-today" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        aria-pressed={isSelected}
                        aria-label={date.toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        onClick={() => selectDate(date)}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              )}

              <footer className="date-picker-footer">
                <button
                  type="button"
                  className="date-picker-today"
                  onClick={() => selectDate(today)}
                >
                  Ir a hoy
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
