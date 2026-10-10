import { useEffect, useRef, useState } from "react";

const createId = () => crypto.randomUUID();
const GRID_COLUMNS = 13;
const GRID_ROWS = 15;

const normalizePosition = (position = {}) => ({
  x: Math.min(GRID_COLUMNS - 1, Math.max(0, Math.round(position.x ?? 6))),
  y: Math.min(GRID_ROWS - 1, Math.max(0, Math.round(position.y ?? 0))),
});

const normalizeNodes = (nodes = [], circuit) =>
  nodes.map((node) => ({
    ...node,
    x:
      circuit?.gridColumns === GRID_COLUMNS
        ? Math.min(GRID_COLUMNS - 1, Math.max(0, Math.round(node.x)))
        : Math.min(
            GRID_COLUMNS - 1,
            Math.max(0, Math.floor((node.x / 100) * GRID_COLUMNS)),
          ),
    y:
      circuit?.gridRows === GRID_ROWS
        ? Math.min(GRID_ROWS - 1, Math.max(0, Math.round(node.y)))
        : Math.min(
            GRID_ROWS - 1,
            Math.max(0, Math.floor((node.y / 100) * GRID_ROWS)),
          ),
  }));

const isTurnNode = (node) =>
  node.kind === "turn" || (!node.kind && !node.exerciseId);

export default function CircuitDesigner({
  exercises,
  savedCircuits,
  circuit,
  onSave,
  onCancel,
}) {
  const boardRef = useRef(null);
  const exercisePanelRef = useRef(null);
  const canvasActionsRef = useRef(null);
  const draggingRef = useRef(null);
  const skipNextCanvasClickRef = useRef(false);
  const [name, setName] = useState(circuit?.name ?? "");
  const [nodes, setNodes] = useState(() => normalizeNodes(circuit?.nodes, circuit));
  const [startPosition, setStartPosition] = useState(() =>
    circuit?.gridColumns === GRID_COLUMNS && circuit?.startPosition
      ? normalizePosition(circuit.startPosition)
      : { x: 6, y: 0 },
  );
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [finishAtStart, setFinishAtStart] = useState(
    Boolean(circuit?.finishAtStart),
  );
  const [comments, setComments] = useState(() =>
    Array.isArray(circuit?.comments) ? circuit.comments : [],
  );
  const [commentText, setCommentText] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [editingExercise, setEditingExercise] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(circuit?.name ?? "");
    setNodes(normalizeNodes(circuit?.nodes, circuit));
    setStartPosition(
      circuit?.gridColumns === GRID_COLUMNS && circuit?.startPosition
        ? normalizePosition(circuit.startPosition)
        : { x: 6, y: 0 },
    );
    setSelectedNodeId("");
    setFinishAtStart(Boolean(circuit?.finishAtStart));
    setComments(Array.isArray(circuit?.comments) ? circuit.comments : []);
    setCommentText("");
    setError("");
  }, [circuit]);

  useEffect(() => {
    if (!selectedNodeId) return undefined;
    const handleOutsideInteraction = (event) => {
      if (event.type === "keydown") {
        if (event.key === "Escape") setSelectedNodeId("");
        return;
      }
      if (
        boardRef.current?.contains(event.target) ||
        exercisePanelRef.current?.contains(event.target) ||
        canvasActionsRef.current?.contains(event.target) ||
        event.target.closest?.(".circuit-canvas-actions")
      ) {
        return;
      }
      setSelectedNodeId("");
    };

    document.addEventListener("pointerdown", handleOutsideInteraction);
    document.addEventListener("keydown", handleOutsideInteraction);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideInteraction);
      document.removeEventListener("keydown", handleOutsideInteraction);
    };
  }, [selectedNodeId]);

  const snappedPosition = (event) => {
    if (!boardRef.current) return null;
    const bounds = boardRef.current.getBoundingClientRect();
    const x = event.clientX - bounds.left - boardRef.current.clientLeft;
    const y = event.clientY - bounds.top - boardRef.current.clientTop;
    return {
      x: Math.min(
        GRID_COLUMNS - 1,
        Math.max(
          0,
          Math.floor((x / boardRef.current.clientWidth) * GRID_COLUMNS),
        ),
      ),
      y: Math.min(
        GRID_ROWS - 1,
        Math.max(
          0,
          Math.floor((y / boardRef.current.clientHeight) * GRID_ROWS),
        ),
      ),
    };
  };

  const addNode = (event) => {
    event.preventDefault();
    if (skipNextCanvasClickRef.current) {
      skipNextCanvasClickRef.current = false;
      return;
    }
    if (event.target !== boardRef.current) return;
    const bounds = boardRef.current.getBoundingClientRect();
    const localX = event.clientX - bounds.left - boardRef.current.clientLeft;
    const localY = event.clientY - bounds.top - boardRef.current.clientTop;
    if (
      localX < 0 ||
      localY < 0 ||
      localX >= boardRef.current.clientWidth ||
      localY >= boardRef.current.clientHeight
    ) {
      return;
    }
    const position = snappedPosition(event);
    if (!position) return;
    const node = {
      id: createId(),
      ...position,
      exerciseId: "",
      kind: "exercise",
    };
    setNodes((current) => [...current, node]);
    setSelectedNodeId(node.id);
    setFinishAtStart(false);
    setError("");
  };

  const startDragging = (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    draggingRef.current = id;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (id !== "start") setSelectedNodeId(id);
  };

  const moveDragging = (event) => {
    const id = draggingRef.current;
    if (!id) return;
    const position = snappedPosition(event);
    if (!position) return;
    skipNextCanvasClickRef.current = true;
    if (id === "start") {
      setStartPosition(position);
      return;
    }
    setNodes((current) =>
      current.map((node) => (node.id === id ? { ...node, ...position } : node)),
    );
  };

  const stopDragging = () => {
    draggingRef.current = null;
    setTimeout(() => {
      skipNextCanvasClickRef.current = false;
    }, 0);
  };

  const assignExercise = (exercise) => {
    if (!selectedNodeId) return;
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNodeId
          ? { ...node, kind: "exercise", exerciseId: exercise.id }
          : node,
      ),
    );
    setError("");
  };

  const deleteNode = () => {
    if (!selectedNodeId) return;
    setNodes((current) =>
      current.filter((node) => node.id !== selectedNodeId),
    );
    setSelectedNodeId("");
  };

  const saveExercise = (event) => {
    event.preventDefault();
    const label = exerciseName.trim();
    if (!label) return;
    const exercise = editingExercise
      ? { ...editingExercise, name: label }
      : { id: createId(), name: label };
    onSave({ type: "exercise", value: exercise });
    if (editingExercise) {
      setNodes((current) =>
        current.map((node) =>
          node.exerciseId === editingExercise.id
            ? { ...node, exerciseId: exercise.id }
            : node,
        ),
      );
    }
    setExerciseName("");
    setEditingExercise(null);
  };

  const saveCircuit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Escribe un nombre para guardar el circuito.");
      return;
    }
    if (!nodes.length) {
      setError("Agrega al menos un nodo al recorrido.");
      return;
    }
    if (
      nodes.some(
        (node, index) =>
          (finishAtStart || index !== nodes.length - 1) &&
          !isTurnNode(node) &&
          !node.exerciseId,
      )
    ) {
      setError("Asigna un ejercicio a cada nodo antes de guardar.");
      return;
    }
    onSave({
      type: "circuit",
      value: {
        id: circuit?.id ?? createId(),
        name: name.trim(),
        nodes,
        startPosition,
        finishAtStart,
        comments,
        gridColumns: GRID_COLUMNS,
        gridRows: GRID_ROWS,
      },
    });
  };

  const addComment = (event) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setComments((current) => [...current, { id: createId(), text }]);
    setCommentText("");
  };

  const exerciseLabel = (id) =>
    exercises.find((exercise) => exercise.id === id)?.name ?? "Sin ejercicio";
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedNodeIsGoal =
    !finishAtStart && nodes[nodes.length - 1]?.id === selectedNodeId;
  const selectedNodeIsLast =
    nodes[nodes.length - 1]?.id === selectedNodeId;
  const toggleInitialGoal = () => {
    const enablingInitialGoal = !finishAtStart;
    setNodes((current) =>
      current.map((node, index) =>
        index === current.length - 1
          ? {
              ...node,
              kind: enablingInitialGoal ? "exercise" : "goal",
              exerciseId: "",
            }
          : node,
      ),
    );
    setFinishAtStart(enablingInitialGoal);
  };
  const usedExerciseIds = new Set([
    ...savedCircuits.flatMap((saved) =>
      saved.nodes.map((node) => node.exerciseId),
    ),
    ...nodes.map((node) => node.exerciseId),
  ]);

  return (
    <div className="circuit-designer">
      <form className="circuit-designer-heading" onSubmit={saveCircuit}>
        <label className="circuit-name-field">
          <span>Nombre del circuito</span>
          <input
            autoFocus
            className="form-control"
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej.: Agilidad y coordinación"
          />
        </label>
        <div className="circuit-heading-actions">
          {onCancel && (
            <button
              type="button"
              className="circuit-secondary-button"
              onClick={onCancel}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className="circuit-primary-button">
            Guardar circuito
          </button>
        </div>
      </form>

      {error && <p className="circuit-error" role="alert">{error}</p>}

      <div className="circuit-workspace">
        <section className="circuit-canvas-section">
          <div className="circuit-section-heading">
            <div>
              <h3>Recorrido</h3>
              <p>Haz clic derecho en el patio para agregar cada nodo.</p>
            </div>
            <span className="circuit-node-count">{nodes.length} nodos</span>
          </div>
          <div
            ref={boardRef}
            className="circuit-canvas"
            onContextMenu={addNode}
            onClick={() => setSelectedNodeId("")}
            onPointerMove={moveDragging}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            role="application"
            aria-label="Patio de dibujo con 13 columnas y 15 filas; haz clic derecho para agregar un nodo y arrástralo para moverlo"
          >
            <button
              type="button"
              className="circuit-start-marker"
              style={{
                left: `${((startPosition.x + 0.5) / GRID_COLUMNS) * 100}%`,
                top: `${((startPosition.y + 0.5) / GRID_ROWS) * 100}%`,
              }}
              onPointerDown={(event) => startDragging(event, "start")}
              onClick={(event) => {
                if (skipNextCanvasClickRef.current) {
                  skipNextCanvasClickRef.current = false;
                }
                event.stopPropagation();
              }}
              title={finishAtStart ? "Inicio y meta; arrastra para mover" : "Inicio; arrastra para mover"}
              aria-label={finishAtStart ? "Inicio y meta; arrastra para mover" : "Punto de partida; arrastra para mover"}
            >
              <span className="circuit-start-icon" aria-hidden="true">▶</span>
              {finishAtStart && (
                <small className="circuit-start-label">Inicio/Meta</small>
              )}
            </button>
            <svg
              className="circuit-path-layer"
              viewBox={`0 0 ${GRID_COLUMNS} ${GRID_ROWS}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {nodes.slice(1).map((node, index) => {
                const previous = nodes[index];
                return (
                  <line
                    key={`${previous.id}-${node.id}`}
                    x1={previous.x + 0.5}
                    y1={previous.y + 0.5}
                    x2={node.x + 0.5}
                    y2={node.y + 0.5}
                  />
                );
              })}
              {nodes.length > 0 && (
                <line
                  x1={startPosition.x + 0.5}
                  y1={startPosition.y + 0.5}
                  x2={nodes[0].x + 0.5}
                  y2={nodes[0].y + 0.5}
                />
              )}
              {finishAtStart && nodes.length > 0 && (
                <line
                  className="circuit-path-return"
                  x1={nodes[nodes.length - 1].x + 0.5}
                  y1={nodes[nodes.length - 1].y + 0.5}
                  x2={startPosition.x + 0.5}
                  y2={startPosition.y + 0.5}
                />
              )}
            </svg>
            {nodes.map((node, index) => {
              const isLastNode = index === nodes.length - 1;
              const isGoalNode = isLastNode && !finishAtStart;
              const isTurn = isTurnNode(node) && !isGoalNode;
              const exerciseNumber = nodes
                .slice(0, index + 1)
                .filter((item) => !isTurnNode(item)).length;

              return (
              <button
                key={node.id}
                type="button"
                className={[
                  "circuit-node",
                  selectedNodeId === node.id ? "is-selected" : "",
                  isTurn ? "is-turn" : "",
                  isGoalNode ? "is-goal" : "",
                ].filter(Boolean).join(" ")}
                style={{
                  left: `${((node.x + 0.5) / GRID_COLUMNS) * 100}%`,
                  top: `${((node.y + 0.5) / GRID_ROWS) * 100}%`,
                }}
                onPointerDown={(event) => startDragging(event, node.id)}
                onClick={(event) => {
                  if (skipNextCanvasClickRef.current) {
                    skipNextCanvasClickRef.current = false;
                  }
                  event.stopPropagation();
                  setSelectedNodeId(node.id);
                }}
                aria-label={
                  isGoalNode
                    ? isTurn
                      ? "Meta"
                      : `Meta: ${exerciseLabel(node.exerciseId)}`
                    : isTurn
                      ? "Punto de giro"
                      : `Nodo ${exerciseNumber}: ${exerciseLabel(node.exerciseId)}`
                }
                aria-pressed={selectedNodeId === node.id}
                title="Arrastra para mover"
              >
                <span
                  className={isTurn ? "is-turn" : ""}
                >
                  {isGoalNode
                    ? "⚑"
                    : isTurn
                      ? "–"
                      : exerciseNumber}
                </span>
                <small>
                  {isGoalNode
                    ? "Meta"
                    : isTurn
                      ? "Esquina"
                      : exerciseLabel(node.exerciseId)}
                </small>
              </button>
              );
            })}
            {!nodes.length && (
              <span className="circuit-canvas-hint">
                Haz clic derecho aquí para crear el primer nodo
              </span>
            )}
          </div>
          <div
            ref={canvasActionsRef}
            className="circuit-canvas-actions"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span>
              {selectedNode
                ? selectedNodeIsGoal
                  ? "Seleccionada: meta"
                  : isTurnNode(selectedNode)
                    ? "Seleccionada: esquina"
                    : `Nodo seleccionado: ${nodes
                        .slice(0, nodes.findIndex((node) => node.id === selectedNodeId) + 1)
                        .filter((node) => !isTurnNode(node)).length}`
                  : "Arrastra inicio o nodos para reubicarlos"}
            </span>
            <div className="circuit-canvas-action-buttons">
              <button
                type="button"
                className={`circuit-secondary-button circuit-turn-toggle${selectedNode && isTurnNode(selectedNode) ? " is-active" : ""}`}
                onClick={() =>
                setNodes((current) =>
                  current.map((node) =>
                    node.id === selectedNodeId
                      ? {
                          ...node,
                          kind: isTurnNode(node) ? "exercise" : "turn",
                          exerciseId: "",
                        }
                      : node,
                  ),
                )
                }
                disabled={!selectedNode || selectedNodeIsGoal}
                aria-hidden={!selectedNode || selectedNodeIsGoal}
                tabIndex={selectedNode && !selectedNodeIsGoal ? 0 : -1}
              >
                {selectedNode && isTurnNode(selectedNode)
                ? "Convertir en ejercicio"
                : "Convertir en esquina"}
              </button>
              <button
                type="button"
                className={`circuit-secondary-button circuit-use-initial-goal${finishAtStart ? " is-active" : ""}`}
                onClick={toggleInitialGoal}
                disabled={!selectedNodeIsLast}
                aria-hidden={!selectedNodeIsLast}
                aria-pressed={finishAtStart}
                tabIndex={selectedNodeIsLast ? 0 : -1}
                title={
                finishAtStart
                  ? "Desactivar el regreso a la meta inicial"
                  : "Conectar el último nodo con la salida"
                }
              >
                {finishAtStart ? "META INICIAL ACTIVADA" : "USAR META INICIAL"}
              </button>
              <button
                type="button"
                className="circuit-secondary-button"
                onClick={deleteNode}
                disabled={!selectedNode}
                aria-hidden={!selectedNode}
                tabIndex={selectedNode ? 0 : -1}
              >
                Eliminar nodo
              </button>
            </div>
          </div>
        </section>

        <aside ref={exercisePanelRef} className="circuit-exercise-panel">
          <div className="circuit-section-heading">
            <div>
              <h3>Ejercicios</h3>
              <p>
                {selectedNode
                  ? "Elige uno para asignarlo al nodo seleccionado."
                  : "Crea y administra los ejercicios del patio."}
              </p>
            </div>
          </div>
          <form className="circuit-exercise-form" onSubmit={saveExercise}>
            <input
              className="form-control"
              maxLength={50}
              value={exerciseName}
              onChange={(event) => setExerciseName(event.target.value)}
              placeholder={editingExercise ? "Cambiar nombre" : "Nuevo ejercicio"}
              aria-label="Nombre del ejercicio"
            />
            <button
              className="circuit-icon-action"
              type="submit"
              disabled={!exerciseName.trim()}
              aria-label={editingExercise ? "Guardar nombre del ejercicio" : "Agregar ejercicio"}
              title={editingExercise ? "Guardar" : "Agregar"}
            >
              {editingExercise ? "✓" : "+"}
            </button>
            {editingExercise && (
              <button
                type="button"
                className="circuit-icon-action is-muted"
                aria-label="Cancelar edición de ejercicio"
                onClick={() => {
                  setEditingExercise(null);
                  setExerciseName("");
                }}
              >
                ×
              </button>
            )}
          </form>
          <div className="circuit-exercise-list">
            {exercises.map((exercise) => {
              const used = usedExerciseIds.has(exercise.id);
              return (
                <div className="circuit-exercise-item" key={exercise.id}>
                  <button
                    type="button"
                    className={`circuit-exercise-assign${selectedNode?.exerciseId === exercise.id ? " is-assigned" : ""}`}
                    disabled={!selectedNode}
                    onClick={() => assignExercise(exercise)}
                    title={selectedNode ? "Asignar al nodo seleccionado" : "Selecciona un nodo primero"}
                  >
                    <span>{exercise.name}</span>
                    {selectedNode?.exerciseId === exercise.id && <b>Asignado</b>}
                  </button>
                  <button
                    type="button"
                    className="circuit-mini-action"
                    aria-label={`Editar ${exercise.name}`}
                    title="Cambiar nombre"
                    onClick={() => {
                      setEditingExercise(exercise);
                      setExerciseName(exercise.name);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="circuit-mini-action is-danger"
                    aria-label={`Eliminar ${exercise.name}`}
                    title={used ? "No se puede eliminar mientras este circuito lo use" : "Eliminar ejercicio"}
                    disabled={used}
                    onClick={() => onSave({ type: "deleteExercise", value: exercise.id })}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {!exercises.length && (
              <p className="circuit-list-empty">
                Aún no hay ejercicios. Agrega uno para comenzar.
              </p>
            )}
          </div>
          <p className="circuit-panel-hint">
            {selectedNode
              ? "Selecciona un ejercicio para asignarlo. Puedes cambiarlo cuando quieras."
              : "Después de dibujar un nodo, selecciónalo para asignarle un ejercicio."}
          </p>
          <section className="circuit-comments" aria-labelledby="circuit-comments-title">
            <h4 id="circuit-comments-title">Comentarios del circuito</h4>
            <form className="circuit-comment-form" onSubmit={addComment}>
              <textarea
                className="form-control"
                maxLength={250}
                rows={2}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Escribe una observación..."
                aria-label="Comentario del circuito"
              />
              <button
                type="submit"
                className="circuit-secondary-button"
                disabled={!commentText.trim()}
              >
                Agregar
              </button>
            </form>
            <div className="circuit-comment-list" aria-live="polite">
              {comments.length ? (
                comments.map((comment) => (
                  <div className="circuit-comment-item" key={comment.id}>
                    <p>{comment.text}</p>
                    <button
                      type="button"
                      className="circuit-comment-remove"
                      onClick={() =>
                        setComments((current) =>
                          current.filter((item) => item.id !== comment.id),
                        )
                      }
                      aria-label="Eliminar comentario"
                      title="Eliminar comentario"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <p className="circuit-comment-empty">Aún no hay comentarios.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
