import { Elemento, Relacion } from '../types/lineage';

export interface DirectedLineageResult {
  activeNodeIds: Set<number>;
  activeEdgeIds: Set<number>;
  ancestorNodeIds: Set<number>;
  descendantNodeIds: Set<number>;
  selectedNodeId: number | null;
}

export interface PositionedNode extends Elemento {
  x: number;
  y: number;
  width: number;
  height: number;
  isDimmed?: boolean;
  isInLayer1Project?: boolean;
  isNewlyCreated?: boolean;
}

export type SortCriterion =
  | 'default'

/**
 * Computes directed reachability (strictly forward downstream and backward upstream)
 */
export function computeDirectedLineage(
  selectedNodeId: number | null,
  elements: Elemento[],
  relaciones: Relacion[]
): DirectedLineageResult {
  if (!selectedNodeId) {
    return {
      activeNodeIds: new Set(elements.map((e) => e.id_elemento)),
      activeEdgeIds: new Set(relaciones.map((r) => r.id_relacion)),
      ancestorNodeIds: new Set(),
      descendantNodeIds: new Set(),
      selectedNodeId: null
    };
  }

  const outgoing = new Map<number, Array<{ target: number; relId: number }>>();
  const incoming = new Map<number, Array<{ source: number; relId: number }>>();

  for (const elem of elements) {
    outgoing.set(elem.id_elemento, []);
    incoming.set(elem.id_elemento, []);
  }

  for (const rel of relaciones) {
    outgoing.get(rel.id_origen)?.push({ target: rel.id_destino, relId: rel.id_relacion });
    incoming.get(rel.id_destino)?.push({ source: rel.id_origen, relId: rel.id_relacion });
  }

  // 1. Upstream BFS (ancestors)
  const ancestorNodeIds = new Set<number>();
  const activeEdgeIds = new Set<number>();
  const upQueue: number[] = [selectedNodeId];

  while (upQueue.length > 0) {
    const curr = upQueue.shift()!;
    const inEdges = incoming.get(curr) || [];
    for (const { source, relId } of inEdges) {
      activeEdgeIds.add(relId);
      if (!ancestorNodeIds.has(source) && source !== selectedNodeId) {
        ancestorNodeIds.add(source);
        upQueue.push(source);
      }
    }
  }

  // 2. Downstream BFS (descendants)
  const descendantNodeIds = new Set<number>();
  const downQueue: number[] = [selectedNodeId];

  while (downQueue.length > 0) {
    const curr = downQueue.shift()!;
    const outEdges = outgoing.get(curr) || [];
    for (const { target, relId } of outEdges) {
      activeEdgeIds.add(relId);
      if (!descendantNodeIds.has(target) && target !== selectedNodeId) {
        descendantNodeIds.add(target);
        downQueue.push(target);
      }
    }
  }

  const activeNodeIds = new Set<number>();
  activeNodeIds.add(selectedNodeId);
  ancestorNodeIds.forEach((id) => activeNodeIds.add(id));
  descendantNodeIds.forEach((id) => activeNodeIds.add(id));

  return {
    activeNodeIds,
    activeEdgeIds,
    ancestorNodeIds,
    descendantNodeIds,
    selectedNodeId
  };
}

/**
 * Validates whether a connection between origin and destination is permissible
 */
export function validateRelationship(
  origen: Elemento,
  destino: Elemento,
  relaciones: Relacion[]
): { isValid: boolean; reason?: string } {
  if (origen.id_elemento === destino.id_elemento) {
    return { isValid: false, reason: 'Un elemento no puede conectarse consigo mismo.' };
  }

  // Prohibited: * -> dataset fuente
  if (destino.tipo === 'Dataset fuente') {
    return { isValid: false, reason: 'Un dataset fuente es origen primario y no puede tener ancestros.' };
  }

  // Prohibited: producto final -> *
  if (origen.tipo === 'Producto final') {
    return { isValid: false, reason: 'Un producto final no puede tener elementos derivados.' };
  }

  // Prohibited: visualización -> dataset*
  if (
    origen.tipo === 'Visualización' &&
    (destino.tipo === 'Dataset lógico - transformación' || destino.tipo === 'Dataset CKAN')
  ) {
    return {
      isValid: false,
      reason: 'Una visualización no puede alimentar datasets.'
    };
  }

  // Prohibited: visualización -> visualización
  if (origen.tipo === 'Visualización' && destino.tipo === 'Visualización') {
    return { isValid: false, reason: 'No se permiten conexiones directas entre visualizaciones.' };
  }

  // Prevent cycles:
  // Adding origen -> destino creates a cycle if destino can already
  // reach origen through existing relationships.
  const adjacency = new Map<number, number[]>();

  for (const rel of relaciones) {
    if (!adjacency.has(rel.id_origen)) {
      adjacency.set(rel.id_origen, []);
    }

    adjacency.get(rel.id_origen)!.push(rel.id_destino);
  }

  const visited = new Set<number>();
  const stack = [destino.id_elemento];

  while (stack.length > 0) {
    const currentId = stack.pop()!;

    if (currentId === origen.id_elemento) {
      return {
        isValid: false,
        reason: 'Esta conexión crearía un ciclo en el linaje de datos.'
      };
    }

    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    for (const nextId of adjacency.get(currentId) ?? []) {
      if (!visited.has(nextId)) {
        stack.push(nextId);
      }
    }
  }

  return { isValid: true };
}

/**
 * Compute search relevance rank for ordering
 */
export function computeSearchRelevance(
  elem: Elemento,
  query: string,
): number {
  if (!query.trim()) return 0;
  const q = query.toLowerCase().trim();
  let score = 0;

  if (elem.nombre.toLowerCase().includes(q)) score += 100;
  if (elem.id_elemento.toString().includes(q)) score += 90;
  if ((elem.metadatos_json.codigo || '').toLowerCase().includes(q)) score += 80;

  for (const val of Object.values(elem.metadatos_json)) {
    if (val && typeof val === 'string' && val.toLowerCase().includes(q)) {
      score += 50;
      break;
    }
  }

  if (elem.indicaciones?.toLowerCase().includes(q)) score += 30;
  if (elem.id_CKAN?.toLowerCase().includes(q)) score += 40;

  return score;
}

/**
 * Calculates cubic bezier curve between nodes with backward loop handling
 */
export function calculateEdgePath(sourceNode: PositionedNode, targetNode: PositionedNode): string {
  const sx = sourceNode.x + sourceNode.width;
  const sy = sourceNode.y + sourceNode.height / 2;

  const tx = targetNode.x;
  const ty = targetNode.y + targetNode.height / 2;

  // If target is to the left or almost same horizontal position (backward curving arrow)
  if (tx <= sx + 10) {
    const dx = Math.abs(tx - sx);
    const loopOffset = Math.max(35, dx * 0.45);
    const cp1x = sx + loopOffset;
    const cp1y = sy + (ty - sy) * 0.25;
    const cp2x = tx - loopOffset;
    const cp2y = ty - (ty - sy) * 0.25;
    return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`;
  }

  const deltaX = tx - sx;
  const controlX1 = sx + deltaX * 0.5;
  const controlX2 = tx - deltaX * 0.5;

  return `M ${sx} ${sy} C ${controlX1} ${sy}, ${controlX2} ${ty}, ${tx} ${ty}`;
}


export function getConnectedLineageIds(
  nodeId: number | null,
  relaciones: Relacion[]
): { connectedNodeIds: Set<number>; connectedEdgeIds: Set<number> } {
  const connectedNodeIds = new Set<number>();
  const connectedEdgeIds = new Set<number>();

  if (nodeId === null) {
    return { connectedNodeIds, connectedEdgeIds };
  }

  const outgoing = new Map<number, Array<{ nodeId: number; edgeId: number }>>();
  const incoming = new Map<number, Array<{ nodeId: number; edgeId: number }>>();

  for (const rel of relaciones) {
    if (!outgoing.has(rel.id_origen)) {
      outgoing.set(rel.id_origen, []);
    }

    if (!incoming.has(rel.id_destino)) {
      incoming.set(rel.id_destino, []);
    }

    outgoing.get(rel.id_origen)!.push({
      nodeId: rel.id_destino,
      edgeId: rel.id_relacion
    });

    incoming.get(rel.id_destino)!.push({
      nodeId: rel.id_origen,
      edgeId: rel.id_relacion
    });
  }

  connectedNodeIds.add(nodeId);

  // 1. Upstream BFS: find ancestors by following incoming edges only.
  const upstreamQueue = [nodeId];

  for (let i = 0; i < upstreamQueue.length; i++) {
    const currentId = upstreamQueue[i];

    for (const { nodeId: parentId, edgeId } of incoming.get(currentId) ?? []) {
      connectedEdgeIds.add(edgeId);

      if (!connectedNodeIds.has(parentId)) {
        connectedNodeIds.add(parentId);
        upstreamQueue.push(parentId);
      }
    }
  }

  // 2. Downstream BFS: find descendants by following outgoing edges only.
  const downstreamQueue = [nodeId];

  for (let i = 0; i < downstreamQueue.length; i++) {
    const currentId = downstreamQueue[i];

    for (const { nodeId: childId, edgeId } of outgoing.get(currentId) ?? []) {
      connectedEdgeIds.add(edgeId);

      if (!connectedNodeIds.has(childId)) {
        connectedNodeIds.add(childId);
        downstreamQueue.push(childId);
      }
    }
  }

  return { connectedNodeIds, connectedEdgeIds };
}


const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 155;
const DS_NODE_HEIGHT = 75;

const ROW_GAP = 40;

const DEFAULT_COL_GAP = 70;
const FINAL_COL_GAP = 300;

const LEFT = 50;
const TOP = 85;


export function computeGraphLayout(
  elements: Elemento[],
  relaciones: Relacion[],
  layer1ProjectId: number | null,
  newlyCreatedId: number | null = null,
  sortCriterion: SortCriterion = 'default'
): GraphLayoutResult {
  type GridNode = {
    elem: Elemento;
    col: number;
    row: number | null;
    width: number;
    height: number;
  };

  const byId = new Map(
    elements.map(e => [e.id_elemento, e])
  );

  const outgoing = new Map<number, number[]>();
  const incoming = new Map<number, number[]>();
  const degree = new Map<number, number>();

  for (const e of elements) {
    outgoing.set(e.id_elemento, []);
    incoming.set(e.id_elemento, []);
    degree.set(e.id_elemento, 0);
  }

  // Ignore relationships with missing endpoints.
  for (const rel of relaciones) {
    if (
      !byId.has(rel.id_origen) ||
      !byId.has(rel.id_destino)
    ) {
      continue;
    }

    outgoing.get(rel.id_origen)!.push(rel.id_destino);
    incoming.get(rel.id_destino)!.push(rel.id_origen);

    degree.set(
      rel.id_origen,
      degree.get(rel.id_origen)! + 1
    );
    degree.set(
      rel.id_destino,
      degree.get(rel.id_destino)! + 1
    );
  }

  const isLogical = (e: Elemento) =>
    e.tipo === 'Dataset lógico - transformación' ||
    e.tipo === 'Dataset CKAN';

  const sources = elements
    .filter(e => e.tipo === 'Dataset fuente')
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre) ||
      a.id_elemento - b.id_elemento
    );

  const logicals = elements
    .filter(isLogical)
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre) ||
      a.id_elemento - b.id_elemento
    );

  const visualizations = elements
    .filter(e => e.tipo === 'Visualización')
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre) ||
      a.id_elemento - b.id_elemento
    );

  const products = elements
    .filter(e => e.tipo === 'Producto final')
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre) ||
      a.id_elemento - b.id_elemento
    );

  const others = elements.filter(
    e =>
      e.tipo !== 'Dataset fuente' &&
      !isLogical(e) &&
      e.tipo !== 'Visualización' &&
      e.tipo !== 'Producto final'
  );

  // -------------------------------------------------------
  // 1. Find all ancestors of each product.
  // -------------------------------------------------------

  const getAncestors = (startId: number): Set<number> => {
    const result = new Set<number>();
    const queue = [...(incoming.get(startId) ?? [])];

    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];

      if (id === startId || result.has(id)) continue;

      result.add(id);

      for (const parent of incoming.get(id) ?? []) {
        if (parent !== startId && !result.has(parent)) {
          queue.push(parent);
        }
      }
    }

    return result;
  };

  const projectNodes = new Map<number, Set<number>>();

  for (const product of products) {
    const ancestors = getAncestors(product.id_elemento);
    ancestors.add(product.id_elemento);
    projectNodes.set(product.id_elemento, ancestors);
  }

  const selectedProjectNodes =
    layer1ProjectId === null
      ? null
      : projectNodes.get(layer1ProjectId) ??
        new Set<number>([layer1ProjectId]);

  // Prioritize visualizations related to the selected product.
  // This checks the full ancestor chain, not only direct parents.
  const orderedVisualizations = [...visualizations].sort((a, b) => {
    if (selectedProjectNodes) {
      const aRelated = selectedProjectNodes.has(a.id_elemento);
      const bRelated = selectedProjectNodes.has(b.id_elemento);

      if (aRelated !== bRelated) {
        return aRelated ? -1 : 1;
      }
    }

    return (
      a.nombre.localeCompare(b.nombre) ||
      a.id_elemento - b.id_elemento
    );
  });

  // -------------------------------------------------------
  // 2. Assign semantic columns.
  //
  // Source datasets: column 0.
  // Logical/CKAN datasets: dependency columns 1..N.
  // Visualizations: column N+1.
  // Products: column N+2.
  //
  // Depth is computed by traversing upstream from each logical
  // dataset. A source is always the leftmost element.
  // -------------------------------------------------------

  const logicalIds = new Set(logicals.map(e => e.id_elemento));
  const logicalDepth = new Map<number, number>();
  const calculating = new Set<number>();

  const getDepth = (id: number): number => {
    const cached = logicalDepth.get(id);
    if (cached !== undefined) return cached;

    // Protect against cycles in existing data.
    if (calculating.has(id)) return 1;

    calculating.add(id);

    let depth = 1;

    for (const parentId of incoming.get(id) ?? []) {
      const parent = byId.get(parentId);
      if (!parent) continue;

      if (logicalIds.has(parentId)) {
        depth = Math.max(depth, getDepth(parentId) + 1);
      }
    }

    calculating.delete(id);
    logicalDepth.set(id, depth);

    return depth;
  };

  for (const logical of logicals) {
    getDepth(logical.id_elemento);
  }

  const maxLogicalDepth = Math.max(
    1,
    ...logicalDepth.values()
  );

  const visualizationCol = maxLogicalDepth + 1;
  const productCol = visualizationCol + 1;

  const grid = new Map<number, GridNode>();

  for (const elem of elements) {
    let col = visualizationCol;

    if (elem.tipo === 'Dataset fuente') {
      col = 0;
    } else if (isLogical(elem)) {
      col = logicalDepth.get(elem.id_elemento) ?? 1;
    } else if (elem.tipo === 'Visualización') {
      col = visualizationCol;
    } else if (elem.tipo === 'Producto final') {
      col = productCol;
    }

    grid.set(elem.id_elemento, {
      elem,
      col,
      row: null,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT
    });
  }

  // -------------------------------------------------------
  // 3. Pin visualizations to their own rows.
  // -------------------------------------------------------

  orderedVisualizations.forEach((elem, row) => {
    grid.get(elem.id_elemento)!.row = row;
  });

  // -------------------------------------------------------
  // 4. Propagate preferred rows upstream.
  //
  // Each node inherits a row from a positioned descendant.
  // Already assigned rows are not overwritten.
  // -------------------------------------------------------

  const queue = orderedVisualizations.map(e => e.id_elemento);
  const visited = new Set<number>();

  for (let i = 0; i < queue.length; i++) {
    const currentId = queue[i];

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const current = grid.get(currentId)!;

    for (const parentId of incoming.get(currentId) ?? []) {
      const parent = grid.get(parentId);
      if (!parent) continue;

      if (
        parent.row === null &&
        current.row !== null &&
        parent.elem.tipo !== 'Producto final'
      ) {
        parent.row = current.row;
      }

      queue.push(parentId);
    }
  }

  // -------------------------------------------------------
  // 5. Products use their own rows, matching the Python
  //    implementation's separate product-row placement.
  // -------------------------------------------------------

  products.forEach((product, row) => {
    grid.get(product.id_elemento)!.row = row;
  });

  // -------------------------------------------------------
  // 6. Resolve row collisions and place all remaining nodes.
  //
  // This is important: multiple ancestors may inherit the same
  // row in a shared column. Keep the preferred row if available;
  // otherwise choose the nearest free row.
  // -------------------------------------------------------

  const occupied = new Map<number, Set<number>>();

  const getOccupiedRows = (col: number): Set<number> => {
    let rows = occupied.get(col);

    if (!rows) {
      rows = new Set<number>();
      occupied.set(col, rows);
    }

    return rows;
  };

  // Reserve visualization rows and product rows first.
  for (const node of grid.values()) {
    if (
      node.row !== null &&
      (
        node.elem.tipo === 'Visualización' ||
        node.elem.tipo === 'Producto final'
      )
    ) {
      getOccupiedRows(node.col).add(node.row);
    }
  }

  // Keep pinned nodes untouched. Resolve other assigned rows.
  const assigned = [...grid.values()]
    .filter(
      n =>
        n.row !== null &&
        n.elem.tipo !== 'Visualización' &&
        n.elem.tipo !== 'Producto final'
    )
    .sort((a, b) =>
      a.col - b.col ||
      a.row! - b.row! ||
      a.elem.id_elemento - b.elem.id_elemento
    );

  for (const node of assigned) {
    const rows = getOccupiedRows(node.col);
    const preferred = Math.max(0, Math.round(node.row!));

    let row = preferred;

    if (rows.has(row)) {
      for (let delta = 1; ; delta++) {
        if (!rows.has(preferred + delta)) {
          row = preferred + delta;
          break;
        }

        if (
          preferred - delta >= 0 &&
          !rows.has(preferred - delta)
        ) {
          row = preferred - delta;
          break;
        }
      }
    }

    node.row = row;
    rows.add(row);
  }

  const pending = [...grid.values()]
    .filter(n => n.row === null)
    .sort((a, b) =>
      (degree.get(b.elem.id_elemento) ?? 0) -
        (degree.get(a.elem.id_elemento) ?? 0) ||
      a.col - b.col ||
      a.elem.nombre.localeCompare(b.elem.nombre) ||
      a.elem.id_elemento - b.elem.id_elemento
    );

  for (const node of pending) {
    const id = node.elem.id_elemento;
    const rows = getOccupiedRows(node.col);

    const neighborRows = [
      ...(incoming.get(id) ?? []),
      ...(outgoing.get(id) ?? [])
    ]
      .map(neighborId => grid.get(neighborId)?.row)
      .filter((row): row is number => row !== null && row !== undefined);

    const preferred = neighborRows.length
      ? Math.max(
          0,
          Math.round(
            neighborRows.reduce((sum, row) => sum + row, 0) /
              neighborRows.length
          )
        )
      : 0;

    let bestRow = preferred;
    let bestCost = Number.POSITIVE_INFINITY;

    // Find the closest available row to the node's neighbors.
    for (let delta = 0; delta <= grid.size; delta++) {
      const candidates = delta === 0
        ? [preferred]
        : [preferred + delta, preferred - delta];

      for (const row of candidates) {
        if (row < 0 || rows.has(row)) continue;

        const cost = neighborRows.reduce(
          (sum, neighborRow) => sum + Math.abs(row - neighborRow),
          0
        );

        if (
          cost < bestCost ||
          (cost === bestCost && row < bestRow)
        ) {
          bestCost = cost;
          bestRow = row;
        }
      }

      if (bestCost !== Number.POSITIVE_INFINITY) break;
    }

    node.row = bestRow;
    rows.add(bestRow);
  }

  // -------------------------------------------------------
  // 7. Calculate pixel coordinates from column indices.
  // -------------------------------------------------------

  const maxCol = Math.max(
    0,
    ...[...grid.values()].map(n => n.col)
  );

  const colWidths = new Map<number, number>();

  for (const node of grid.values()) {
    colWidths.set(
      node.col,
      Math.max(
        colWidths.get(node.col) ?? 0,
        node.width
      )
    );
  }

  const colX = new Map<number, number>();
  let x = LEFT;

  for (let col = 0; col <= maxCol; col++) {
    colX.set(col, x);

    x += (colWidths.get(col) ?? DEFAULT_NODE_WIDTH) + DEFAULT_COL_GAP;

    if (col === visualizationCol) {
      x += FINAL_COL_GAP;
    }
  }

  // -------------------------------------------------------
  // 8. Calculate dimming based on directed lineage.
  // -------------------------------------------------------

  // If a product is selected, selectedProjectNodes contains:
  // - The selected product itself.
  // - Every ancestor that can reach the product by following
  //   relationships in their original direction.
  //
  // All other nodes are dimmed, including unrelated visualizations.
  // The newly created node is always kept visible.

  const positionedNodes: PositionedNode[] = [];

  let maxRow = 0;

  for (const node of grid.values()) {
    const id = node.elem.id_elemento;
    const row = node.row ?? 0;

    maxRow = Math.max(maxRow, row);

    const isNewlyCreated = id === newlyCreatedId;

    const isDimmed =
      layer1ProjectId !== null &&
      !isNewlyCreated &&
      !(selectedProjectNodes?.has(id) ?? false);

    const currentNodeHeight =
      node.elem.tipo === 'Dataset fuente' ||
      node.elem.tipo === 'Dataset lógico - transformación' ||
      node.elem.tipo === 'Dataset CKAN'
        ? DS_NODE_HEIGHT
        : DEFAULT_NODE_HEIGHT;

    positionedNodes.push({
      ...node.elem,
      x: colX.get(node.col)!,
      y:
        TOP +
        row * (DEFAULT_NODE_HEIGHT + ROW_GAP) +
        (DEFAULT_NODE_HEIGHT - currentNodeHeight) / 2,
      width: node.width,
      height: currentNodeHeight,
      isDimmed,
      isInLayer1Project: !isDimmed,
      isNewlyCreated
    });
  }

  // -------------------------------------------------------
  // 9. Column borders and canvas dimensions.
  // -------------------------------------------------------

  const columnBorders: ColumnBorder[] = [
    {
      colIndex: 0,
      x: LEFT - 16,
      width: (colWidths.get(0) ?? DEFAULT_NODE_WIDTH) + 32,
      title: 'Datasets Fuente',
      color: 'border-amber-500/30 bg-amber-950/10'
    },
    {
      colIndex: 1,
      x: (colX.get(1) ?? LEFT + DEFAULT_NODE_WIDTH + DEFAULT_COL_GAP) - 16,
      width:
        maxLogicalDepth * (DEFAULT_NODE_WIDTH + DEFAULT_COL_GAP) -
        DEFAULT_COL_GAP +
        32,
      title: 'Datasets Lógicos & CKAN',
      color: 'border-blue-500/30 bg-blue-950/10'
    },
    {
      colIndex: 2,
      x: (colX.get(visualizationCol) ?? x) - 16,
      width: (colWidths.get(visualizationCol) ?? DEFAULT_NODE_WIDTH) + 32,
      title: 'Visualizaciones',
      color: 'border-purple-500/30 bg-purple-950/10'
    },
    {
      colIndex: 3,
      x: (colX.get(productCol) ?? x) - 16,
      width: (colWidths.get(productCol) ?? DEFAULT_NODE_WIDTH) + 32,
      title: 'Productos Finales',
      color: 'border-emerald-500/30 bg-emerald-950/10'
    }
  ];

  const rightEdge = Math.max(
    LEFT,
    ...positionedNodes.map(n => n.x + n.width)
  );

  return {
    nodes: positionedNodes,
    columnBorders,
    totalWidth: rightEdge + 80,
    totalHeight:
      TOP + (maxRow + 1) * (DEFAULT_NODE_HEIGHT + ROW_GAP) + 100
  };
}