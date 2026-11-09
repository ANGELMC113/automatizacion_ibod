import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Elemento,
  Relacion,
  Archivo,
  EstadoElemento,
  MetodoActualizacion
} from '../types/lineage';
import {
  computeGraphLayout,
  calculateEdgePath,
  validateRelationship,
  getConnectedLineageIds,
  SortCriterion,
  PositionedNode
} from '../utils/graphAlgorithms';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Database,
  Layers,
  BarChart3,
  Package,
  Globe,
  Check,
  X,
  SlidersHorizontal,
  FolderDot,
  Folder,
  AlertCircle,
  Trash2
} from 'lucide-react';
import DeleteRelationModal from './modals/DeleteRelationModal';
import IconIndicator from './style/IconIndicator';
import {
  getLatestVisualizationImage,
  getVisualizationImageUrl
} from '../utils/visualizationImages';

interface Props {
  elements: Elemento[];
  relaciones: Relacion[];
  archivos: Archivo[];
  layer1ProjectId: string | null;
  layer2NodeId: string | null;
  newlyCreatedId: string | null;
  onSelectLayer1Project: (projectId: string | null) => void;
  onSelectLayer2Node: (nodeId: string | null) => void;
  searchQuery: string;
  onConnectArrow: (sourceId: string, targetId: string) => void;
  onDeleteRelation: (sourceId: string, targetId: string) => void;
}

export const CanvasGraph: React.FC<Props> = ({
  elements,
  relaciones,
  archivos,
  layer1ProjectId,
  layer2NodeId,
  newlyCreatedId,
  onSelectLayer1Project,
  onSelectLayer2Node,
  searchQuery,
  onConnectArrow,
  onDeleteRelation
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan and Zoom
  const [transform, setTransform] = useState<{ x: number; y: number; k: number }>({
    x: 40,
    y: 20,
    k: 0.88
  });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('default');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Obsidian-style edge dragging state
  const [draggingSourceId, setDraggingSourceId] = useState<string | null>(null);
  const [dragMousePos, setDragMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [tooltipState, setTooltipState] = useState<{
    message: string;
    isError: boolean;
    x: number;
    y: number;
  } | null>(null);

  // Modal to confirm deletion of existing connection when dragging onto it
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    sourceId: string;
    targetId: string;
    sourceName: string;
    targetName: string;
  } | null>(null);

  // Compute Layout with dynamic Col 1, Layer 1 dimming rule, and newly created highlight
  const layout = computeGraphLayout(
    elements,
    relaciones,
    layer1ProjectId,
    newlyCreatedId,
    sortCriterion,
    searchQuery
  );

  const nodeMap = new Map<string, PositionedNode>(layout.nodes.map((n) => [n.id_elemento, n]));

  // Layer 2: directly connected nodes
  const { connectedNodeIds, connectedEdgeIds } = getConnectedLineageIds(
    layer2NodeId ? Number(layer2NodeId) : null,
    relaciones
  );

  const draggingSourceNode = draggingSourceId ? nodeMap.get(draggingSourceId) : null;

  // Auto-fit to view
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;

    const minX = Math.min(...layout.nodes.map((n) => n.x)) - 60;
    const maxX = Math.max(...layout.nodes.map((n) => n.x + n.width)) + 120;
    const minY = Math.min(...layout.nodes.map((n) => n.y)) - 60;
    const maxY = Math.max(...layout.nodes.map((n) => n.y + n.height)) + 120;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    const scaleX = clientWidth / graphWidth;
    const scaleY = clientHeight / graphHeight;
    const newK = Math.min(Math.max(Math.min(scaleX, scaleY) * 0.9, 0.4), 1.2);

    const newX = (clientWidth - graphWidth * newK) / 2 - minX * newK;
    const newY = (clientHeight - graphHeight * newK) / 2 - minY * newK;

    setTransform({ x: newX, y: newY, k: newK });
  }, [layout.nodes]);

  // Center Graph
  const centerGraph = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const midX = layout.totalWidth / 2;
    const midY = layout.totalHeight / 2;
    const newX = clientWidth / 2 - midX * transform.k;
    const newY = clientHeight / 2 - midY * transform.k;
    setTransform((prev) => ({ ...prev, x: newX, y: newY }));
  }, [layout.totalWidth, layout.totalHeight, transform.k]);

  // Center on node
  const centerOnNode = useCallback(
    (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node || !containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const targetX = clientWidth / 2 - (node.x + node.width / 2) * transform.k;
      const targetY = clientHeight / 2 - (node.y + node.height / 2) * transform.k;
      setTransform((prev) => ({ ...prev, x: targetX, y: targetY }));
    },
    [nodeMap, transform.k]
  );

  useEffect(() => {
    const handleFit = () => fitToView();
    const handleCenter = (e: any) => {
      if (e.detail?.nodeId) centerOnNode(e.detail.nodeId);
      else centerGraph();
    };

    window.addEventListener('lineage:fit-view', handleFit);
    window.addEventListener('lineage:center-node', handleCenter);
    window.addEventListener('lineage:center-graph', centerGraph);

    return () => {
      window.removeEventListener('lineage:fit-view', handleFit);
      window.removeEventListener('lineage:center-node', handleCenter);
      window.removeEventListener('lineage:center-graph', centerGraph);
    };
  }, [fitToView, centerOnNode, centerGraph]);

  // Wheel handling: zoom ONLY when CTRL or META is pressed (absorbs CTRL wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newK = Math.min(Math.max(transform.k * zoomFactor, 0.35), 2.2);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newX = mouseX - (mouseX - transform.x) * (newK / transform.k);
      const newY = mouseY - (mouseY - transform.y) * (newK / transform.k);

      setTransform({ x: newX, y: newY, k: newK });
    } else {
      // Regular pan
      const deltaY = -e.deltaY;
      const deltaX = -e.deltaX;
      setTransform((prev) => ({
        ...prev,
        x: prev.k > 0.8 ? prev.x + deltaX : prev.x,
        y: prev.y + deltaY
      }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (!draggingSourceId) {
      setIsPanning(true);
      setHasMovedDuringDrag(false);
      setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (draggingSourceId) {
      const canvasMouseX = (e.clientX - rect.left - transform.x) / transform.k;
      const canvasMouseY = (e.clientY - rect.top - transform.y) / transform.k;
      setDragMousePos({ x: canvasMouseX, y: canvasMouseY });

      if (hoveredTargetId && draggingSourceNode) {
        const targetNode = nodeMap.get(hoveredTargetId);
        if (targetNode) {
          const val = validateRelationship(draggingSourceNode, targetNode, relaciones);
          const alreadyExists = relaciones.some(
            (r) => r.id_origen === draggingSourceId && r.id_destino === hoveredTargetId
          );

          if (alreadyExists) {
            setTooltipState({
              message: 'Conexión existente. Suelta para eliminar relación.',
              isError: true,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top - 36
            });
          } else if (!val.isValid) {
            setTooltipState({
              message: val.reason || 'Relación no permitida',
              isError: true,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top - 36
            });
          } else {
            setTooltipState(null);
          }
        }
      } else {
        setTooltipState(null);
      }
      return;
    }

    if (isPanning) {
      setHasMovedDuringDrag(true);
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      }));
    }
  };

  const handleMouseUp = () => {
    if (draggingSourceId && hoveredTargetId) {
      const sourceNode = nodeMap.get(draggingSourceId);
      const targetNode = nodeMap.get(hoveredTargetId);

      if (sourceNode && targetNode) {
        const alreadyExists = relaciones.some(
          (r) => r.id_origen === draggingSourceId && r.id_destino === hoveredTargetId
        );

        if (alreadyExists) {
          // Open confirmation to delete existing connection
          setDeleteConfirmData({
            sourceId: draggingSourceId,
            targetId: hoveredTargetId,
            sourceName: sourceNode.nombre,
            targetName: targetNode.nombre
          });
        } else {
          const val = validateRelationship(sourceNode, targetNode, relaciones);
          if (val.isValid) {
            onConnectArrow(draggingSourceId, hoveredTargetId);
          }
        }
      }
    }

    setDraggingSourceId(null);
    setHoveredTargetId(null);
    setTooltipState(null);
    setIsPanning(false);
  };

  // Canvas background click cancels Layer 2
  const handleCanvasClick = () => {
    if (!hasMovedDuringDrag && !draggingSourceId) {
      onSelectLayer2Node(null);
    }
  };

  // Start dragging connection from node handle
  const handleStartDragConnector = (e: React.MouseEvent, node: PositionedNode) => {
    e.stopPropagation();
    // Do not allow dragging from dimmed elements or from final products
    if (node.isDimmed || node.tipo === 'Producto final') return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const canvasMouseX = (e.clientX - rect.left - transform.x) / transform.k;
    const canvasMouseY = (e.clientY - rect.top - transform.y) / transform.k;
    setDraggingSourceId(node.id_elemento);
    setDragMousePos({ x: canvasMouseX, y: canvasMouseY });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.15 : 0.85;
    const newK = Math.min(Math.max(transform.k * factor, 0.35), 2.2);
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;
    const newX = centerX - (centerX - transform.x) * (newK / transform.k);
    const newY = centerY - (centerY - transform.y) * (newK / transform.k);
    setTransform({ x: newX, y: newY, k: newK });
  };

  // Circular icons with full tooltip accessibility
  const renderStatusIcon = (estado: EstadoElemento | null | undefined) => {
    const tooltip = `Estado: ${estado ? estado : 'No definido / Nulo'}`;
    switch (estado) {
      case 'Actualizado':
        return (
          <div
            className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 cursor-help"
            title={tooltip}
          >
            <Check className="w-2 h-2 stroke-[3]" />
          </div>
        );
      case 'Desactualizado':
        return (
          <div
            className="w-3.5 h-3.5 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 cursor-help"
            title={tooltip}
          >
            <X className="w-2 h-2 stroke-[3]" />
          </div>
        );
      case 'Permanente':
        return (
          <div
            className="w-3.5 h-3.5 rounded-full bg-sky-500/20 border border-sky-500/50 flex items-center justify-center text-sky-400 cursor-help"
            title={tooltip}
          >
            <Check className="w-2 h-2 stroke-[3]" />
          </div>
        );
      case 'Pendiente de acción manual':
        return (
          <div
            className="w-3.5 h-3.5 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 cursor-help"
            title={tooltip}
          >
            <span className="text-[9px] font-bold">!</span>
          </div>
        );
      default:
        return (
          <div
            className="w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-[9px] font-bold cursor-help"
            title={tooltip}
          >
            -
          </div>
        );
    }
  };

  const getNodeColorTheme = (elem: Elemento) => {
    if (elem.tipo === 'Dataset fuente') {
      return {
        cardBorder: 'border-amber-400/80 hover:border-amber-300',
        cardBg: 'bg-amber-950/30 hover:bg-amber-950/60',
        idBadgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: <Database className="w-3 h-3 text-amber-400" />
      };
    }
    if (elem.tipo === 'Dataset lógico - transformación') {
      return {
        cardBorder: 'border-blue-400/80 hover:border-blue-300',
        cardBg: 'bg-blue-950/30 hover:bg-blue-950/60',
        idBadgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        icon: <Layers className="w-3 h-3 text-blue-400" />
      };
    }
    if (elem.tipo === 'Dataset CKAN') {
      return {
        cardBorder: 'border-orange-400/80 hover:border-orange-300',
        cardBg: 'bg-orange-950/30 hover:bg-orange-950/60',
        idBadgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        icon: <Globe className="w-3 h-3 text-orange-400" />
      };
    }
    if (elem.tipo === 'Visualización') {
      return {
        cardBorder: 'border-purple-300/60 hover:border-purple-300',
        cardBg: 'bg-purple-950/10 hover:bg-purple-950/60',
        idBadgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        icon: <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
      };
    }
    if (elem.tipo === 'Producto final') {
      return {
        cardBorder: 'border-emerald-400/80 hover:border-emerald-300',
        cardBg: 'bg-emerald-950/30 hover:bg-emerald-950/60',
        idBadgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: <Package className="w-3 h-3 text-emerald-400" />
      };
    }
    return {
      cardBorder: 'border-red-400/80 hover:border-red-300',
      cardBg: 'bg-red-950/40 hover:bg-red-950/60',
      idBadgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
      icon: <Package className="w-3 h-3 text-red-400" />
    };
  };

  // Find Layer 1 project
  const layer1Project = layer1ProjectId ? elements.find((e) => e.id_elemento === layer1ProjectId) : null;

  // Determine if dynamic arrow is hovering an existing relation (will turn RED)
  const isTargetAlreadyConnected =
    draggingSourceId &&
    hoveredTargetId &&
    relaciones.some((r) => r.id_origen === draggingSourceId && r.id_destino === hoveredTargetId);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full relative overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* Canvas SVG for Edge Lines and Column Enclosures */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
          className="transition-transform duration-75 ease-out"
        >
          {/* Column Background Enclosures */}
          {layout.columnBorders.map((col) => (
            <g key={col.colIndex}>
              <rect
                x={col.x}
                y={20}
                width={col.width}
                height={layout.totalHeight - 40}
                rx={12}
                className="fill-slate-900/30 stroke-slate-800/70"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <text
                x={col.x + 14}
                y={50}
                className="fill-slate-400 text-xs font-semibold uppercase tracking-wider font-mono"
              >
                {col.title}
              </text>
            </g>
          ))}

          <defs>
            <marker id="arrowhead-active" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#38bdf8" />
            </marker>
            <marker id="arrowhead-green" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#10b981" />
            </marker>
            <marker id="arrowhead-orange" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#f97316" />
            </marker>
            <marker id="arrowhead-red" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#ef4444" />
            </marker>
            <marker id="arrowhead-dimmed" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#1e293b" />
            </marker>
          </defs>

          {/* Render Relationships */}
          {relaciones.map((rel) => {
            const sNode = nodeMap.get(rel.id_origen);
            const tNode = nodeMap.get(rel.id_destino);
            if (!sNode || !tNode) return null;

            const pathData = calculateEdgePath(sNode, tNode);
            const isConnectedToLayer2 = connectedEdgeIds.has(rel.id_relacion);

            // "Las flechas que salen desde un elemento resaltado y van a uno oscurecido, también se deben oscurecer."
            const isDimmed = sNode.isDimmed || tNode.isDimmed;

            return (
              <path
                key={rel.id_relacion}
                d={pathData}
                fill="none"
                stroke={
                  isDimmed
                    ? '#1e293b'
                    : isConnectedToLayer2
                    ? '#ff1b1b'
                    : '#475569'
                }
                strokeWidth={isDimmed ? 1 : isConnectedToLayer2 ? 2.5 : 1.5}
                strokeOpacity={isDimmed ? 0.3 : 1}
                markerEnd={
                  isDimmed
                    ? 'url(#arrowhead-dimmed)'
                    : isConnectedToLayer2
                    ? 'url(#arrowhead-red)'
                    : 'url(#arrowhead-active)'
                }
                className="transition-colors duration-200"
              />
            );
          })}

          {/* Dynamic Dragging Arrow (Obsidian style) */}
          {draggingSourceNode && (
            <path
              d={`M ${draggingSourceNode.x + draggingSourceNode.width} ${
                draggingSourceNode.y + draggingSourceNode.height / 2
              } C ${
                draggingSourceNode.x +
                draggingSourceNode.width +
                Math.max(40, (dragMousePos.x - draggingSourceNode.x - draggingSourceNode.width) * 0.5)
              } ${draggingSourceNode.y + draggingSourceNode.height / 2}, ${
                dragMousePos.x - 30
              } ${dragMousePos.y}, ${dragMousePos.x} ${dragMousePos.y}`}
              fill="none"
              stroke={isTargetAlreadyConnected ? '#ef4444' : '#f97316'}
              strokeWidth={3}
              strokeDasharray="4 4"
              markerEnd={isTargetAlreadyConnected ? 'url(#arrowhead-red)' : 'url(#arrowhead-orange)'}
            />
          )}
        </g>
      </svg>

      {/* Render Node Cards HTML Layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          transformOrigin: '0 0'
        }}
      >
        {layout.nodes.map((node) => {
          const isLayer2Selected = node.id_elemento === layer2NodeId;
          const isConnectedToLayer2 =
            connectedNodeIds.has(Number(node.id_elemento)) &&
            Number(node.id_elemento) !== Number(layer2NodeId);
          const isDimmed = node.isDimmed;
          const isNewlyCreated = node.isNewlyCreated;
          const theme = getNodeColorTheme(node);

          // Count files attached to this element
          const fileCount = archivos.filter((a) => a.id_elemento === node.id_elemento).length;

          // When dragging arrow: evaluate if this node is a connectable target or existing target
          let isConnectableTarget = false;
          let isExistingTarget = false;

          if (draggingSourceNode && draggingSourceNode.id_elemento !== node.id_elemento) {
            const alreadyExists = relaciones.some(
              (r) => r.id_origen === draggingSourceNode.id_elemento && r.id_destino === node.id_elemento
            );

            if (alreadyExists) {
              isExistingTarget = true;
            } else {
              const val = validateRelationship(draggingSourceNode, node, relaciones);
              if (val.isValid) {
                isConnectableTarget = true;
              }
            }
          }

          // ID unico para todo elemento
          const idClean = node.id_elemento.toString();

          return (
            <div
              key={node.id_elemento}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: `${node.height}px`
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasMovedDuringDrag && !draggingSourceId) {
                  // Toggle selection: if already selected, clear selection
                  if (layer2NodeId === node.id_elemento) {
                    onSelectLayer2Node(null);
                  } else {
                    onSelectLayer2Node(node.id_elemento);
                    if (node.tipo === 'Producto final') {
                      onSelectLayer1Project(node.id_elemento);
                    }
                  }
                }
              }}
              onMouseEnter={() => {
                setHoveredNodeId(node.id_elemento);
                if (draggingSourceId) setHoveredTargetId(node.id_elemento);
              }}
              onMouseLeave={() => {
                setHoveredNodeId(null);
                if (draggingSourceId) setHoveredTargetId(null);
              }}
              className={`group absolute pointer-events-auto rounded-xl border p-2 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-md backdrop-blur-sm ${
                theme.cardBorder
              } ${theme.cardBg} ${
                isNewlyCreated
                  ? 'ring-2 ring-white border-white text-white shadow-[0_0_16px_rgba(255,255,255,0.85)] z-30'
                  : isLayer2Selected && isDimmed
                  ? 'opacity-85 brightness-110 ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.9)] z-30 scale-[1.03]'
                  : isLayer2Selected
                  ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-[1.03] z-20 shadow-cyan-500/30'
                  : isExistingTarget
                  ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-950/60 scale-[1.02] shadow-rose-500/40 z-20'
                  : isConnectableTarget
                  ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-950/50 scale-[1.02] shadow-orange-500/30 z-20'
                  : isConnectedToLayer2
                  ? 'ring-2 ring-red-500 border-red-500 shadow-red-500/20 z-10'
                  : ''
              } ${
                isDimmed && !isLayer2Selected && !isNewlyCreated
                  ? 'opacity-20 grayscale-[50%]'
                  : 'opacity-100 hover:scale-[1.015]'
              }`}
            >
              {/* Obsidian-style Drag Handle on Right Edge (hidden if dimmed or Producto final) */}
              {!isDimmed && node.tipo !== 'Producto final' && (
                <div
                  onMouseDown={(e) => handleStartDragConnector(e, node)}
                  className={`absolute -right-2 top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full bg-slate-900 border-2 flex items-center justify-center transition-all cursor-crosshair z-30 ${
                    hoveredNodeId === node.id_elemento || draggingSourceId === node.id_elemento
                      ? 'opacity-100 scale-110 border-orange-400 bg-orange-950'
                      : 'opacity-0 group-hover:opacity-100 border-cyan-400 hover:border-orange-400'
                  }`}
                  title="Arrastrar para conectar flecha"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                </div>
              )}

              {/* Target Receiver Handle on Left Edge (visible when connectable or existing) */}
              {(isConnectableTarget || isExistingTarget) && (
                <div
                  className={`absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all animate-pulse z-30 ${
                    isExistingTarget
                      ? 'bg-rose-950 border-rose-400'
                      : 'bg-orange-950 border-orange-400'
                  }`}
                  title={isExistingTarget ? 'Soltar para eliminar conexión' : 'Soltar aquí para conectar'}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isExistingTarget ? 'bg-rose-400' : 'bg-orange-400'
                    }`}
                  />
                </div>
              )}

              {/* Top Row: Unique ID Tag on Left, Folder Count + Date + Status + Method on Right */}
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono leading-none">
                {/* Left: ID Tag */}
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`px-1 py-0.5 rounded border font-bold ${theme.idBadgeBg}`}
                    title={`ID único: ${node.id_elemento}`}
                  >
                    #{idClean}
                  </span>
                  <div className="shrink-0">{theme.icon}</div>
                </div>

                {/* Right: Folder Count + Date + Circular Icons */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Folder Icon with file count */}
                  <div
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 cursor-help"
                    title={`${fileCount} archivo(s) vinculado(s) a este elemento`}
                  >
                    <Folder className="w-2.5 h-2.5 text-cyan-400" />
                    <span className="text-[9px] font-semibold">{fileCount}</span>
                  </div>

                  {/* Date */}
                  <span
                    className="text-slate-400 truncate max-w-[55px] cursor-help"
                    title={`Última actualización: ${node.fecha_act || 'Sin fecha'}`}
                  >
                    {node.fecha_act ? node.fecha_act.substring(5) : '--'}
                  </span>

                  {/* Status circle */}
                  <IconIndicator type="status" value={node.estado} />

                  {/* Method circle */}
                  <IconIndicator type="method" value={node.metodo_act} />
                </div>
              </div>

              {/* Middle Row: Element Name (compact margins) */}
              <div className="my-auto py-0.5">
                <h4
                  className="text-[11px] font-semibold text-slate-100 line-clamp-2 leading-tight"
                  title={node.nombre}
                >
                  {node.nombre}
                </h4>
              </div>

              {/* Local preview */}
              {node.tipo === 'Visualización' && (() => {
                const imageFile = getLatestVisualizationImage(
                  Number(node.id_elemento),
                  archivos
                );

                const imageUrl = getVisualizationImageUrl(imageFile);

                return (
                  <div className="mt-1 pt-1 border-t border-purple-500/20 w-full">
                    {imageUrl ? (
                      <div className="w-full h-[100px] rounded-md overflow-hidden bg-slate-950">
                        <img
                          src={imageUrl}
                          alt={`Vista previa: ${node.nombre}`}
                          loading="lazy"
                          draggable={false}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-[65px] flex flex-col items-center justify-center gap-1 text-purple-300/70">
                        <BarChart3 className="w-5 h-5" />
                        <span className="text-[10px] text-center">
                          No hay imagen disponible
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          );
        })}
      </div>

      {/* Floating Tooltip Follows Mouse */}
      {tooltipState && (
        <div
          className={`fixed pointer-events-none z-50 px-2.5 py-1.5 rounded-lg shadow-2xl flex items-center gap-1.5 backdrop-blur-md text-xs border ${
            tooltipState.isError
              ? 'bg-rose-950/95 border-rose-500 text-rose-200'
              : 'bg-orange-950/95 border-orange-500 text-orange-200'
          }`}
          style={{
            left: `${tooltipState.x}px`,
            top: `${tooltipState.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{tooltipState.message}</span>
        </div>
      )}

      {/* Top Left: Layer 1 Project Indicator Banner (Placed on LEFT so drawer doesn't cover it!) */}
      <div className="absolute top-4 left-6 z-10 flex items-center gap-2">
        {layer1Project ? (
          <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/50 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-xl text-xs">
            <FolderDot className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Proyecto:</span>
              <span className="text-cyan-300 font-bold truncate max-w-[300px]">
                {layer1Project.nombre}
              </span>
            </div>
            <button
              onClick={() => onSelectLayer1Project(null)}
              className="ml-2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium transition-colors"
              title="Salir del proyecto y ver todo el grafo"
            >
              Salir del proyecto
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-1.5 backdrop-blur-sm text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>Ningún proyecto seleccionado</span>
          </div>
        )}
      </div>

      {/* Floating Canvas Controls Toolbar (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 backdrop-blur-md shadow-xl text-xs text-slate-300">
        <button
          onClick={() => handleZoom('in')}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-slate-100"
          title="Acercar (Zoom In)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-slate-100"
          title="Alejar (Zoom Out)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-[1px] bg-slate-800" />
        <button
          onClick={fitToView}
          className="px-2.5 py-1.5 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-slate-300 hover:text-slate-100"
          title="Ajustar grafo a pantalla"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ajustar</span>
        </button>
        <button
          onClick={centerGraph}
          className="px-2.5 py-1.5 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-slate-300 hover:text-slate-100"
          title="Centrar grafo"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Centrar grafo</span>
        </button>
        <div className="h-4 w-[1px] bg-slate-800" />

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-1 px-1.5 text-slate-400">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <select
            value={sortCriterion}
            onChange={(e) => setSortCriterion(e.target.value as SortCriterion)}
            className="bg-transparent border-none text-slate-200 text-xs focus:outline-none cursor-pointer pr-1 font-mono"
            title="Reordenar elementos del grafo"
          >
            <option value="default" className="bg-slate-900 text-slate-200">
              Nombre de la visualización
            </option>

          </select>
        </div>
      </div>

      {/* Confirmation Modal for Deleting Existing Relation by Dropping Arrow */}
      {deleteConfirmData && (
        <DeleteRelationModal
          sourceName={deleteConfirmData.sourceName}
          targetName={deleteConfirmData.targetName}
          sourceId={deleteConfirmData.sourceId}
          targetId={deleteConfirmData.targetId}
          onConfirm={(sourceId, targetId) => {
            onDeleteRelation(sourceId, targetId);
            setDeleteConfirmData(null);
          }}
          onCancel={() => setDeleteConfirmData(null)}
        />
      )}
    </div>
  );
};
