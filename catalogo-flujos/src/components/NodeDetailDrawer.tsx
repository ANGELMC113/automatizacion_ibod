import React, { useState } from 'react';
import {
  Elemento,
  Relacion,
  Archivo,
  MetadatoLinkeado,
  DefaultMetadataSchema,
  EstadoElemento
} from '../types/lineage';
import {
  X,
  AlertTriangle,
  FileText,
  Eye,
  Settings2,
  Trash2,
  Link2,
  Download,
  Upload,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Play,
  Crosshair
} from 'lucide-react';
import { EditableMetadataCell } from './utils/EditableMetadataCell';
import DeleteRelationModal from './modals/DeleteRelationModal';
import IconIndicator from './style/IconIndicator';
import { getStatusBadge } from './style/GetStatusBadge';
import StatusPicker from './utils/StatusPicker';
import {
  getLatestVisualizationImage,
  getVisualizationImageUrl
} from '../utils/visualizationImages';

interface Props {
  node: Elemento | null;
  allElements: Elemento[];
  relaciones: Relacion[];
  archivos: Archivo[];
  metadatosLinkeados: MetadatoLinkeado[];
  metadataSchema: DefaultMetadataSchema;
  onClose: () => void;
  onSelectNode: (id: number) => void;
  onCenterNode: (id: number) => void;
  onUpdateElement: (updated: Elemento) => void;
  onDeleteElement: (id: number) => void;
  onDeleteArchivo: (idArchivo: number) => void;
  onAddArchivo: (archivo: Archivo) => void;
  onSetPreviewArchivo: (idArchivo: number) => void;
  onUpdateLinkedMetadata: (
    elementoId: number,
    key: string,
    linkedRelId: number | null,
    manualVal?: string
  ) => void;
  onDeleteRelation: (sourceId: number, targetId: number) => void;
}

export const NodeDetailDrawer: React.FC<Props> = ({
  node,
  allElements,
  relaciones,
  archivos,
  metadatosLinkeados,
  metadataSchema,
  onClose,
  onSelectNode,
  onCenterNode,
  onUpdateElement,
  onDeleteElement,
  onDeleteArchivo,
  onAddArchivo,
  onSetPreviewArchivo,
  onUpdateLinkedMetadata,
  onDeleteRelation
}) => {
  const [activeTab, setActiveTab] = useState<'metadata' | 'preview' | 'files' | 'automation'>('metadata');
  //const [isEditingBasicMetadata, setIsEditingBasicMetadata] = useState(false);
  const [isEditingJsonMetadata, setIsEditingJsonMetadata] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  // Relation delete confirmation
  const [relationToDelete, setRelationToDelete] = useState<{
    sourceId: string;
    targetId: string;
    sourceName: string;
    targetName: string;
  } | null>(null);

  // File upload state in drawer
  const [uploadFileComments, setUploadFileComments] = useState('');
  const [uploadFileAsPreview, setUploadFileAsPreview] = useState(true);
  const [openAncestorPickerKey, setOpenAncestorPickerKey] = useState<string | null>(null);

  if (!node) return null;

  const nodeArchivos = archivos.filter((a) => a.id_elemento === node.id_elemento);
  const previewArchivo = nodeArchivos.find((a) => a.es_preview) || nodeArchivos[0];

  const latestVisualizationImage =
    node.tipo === 'Visualización'
      ? getLatestVisualizationImage(node.id_elemento, nodeArchivos)
      : undefined;

  const visualizationImageUrl =
    getVisualizationImageUrl(latestVisualizationImage);

  // Upstream Ancestors & Downstream Descendants
  const incomingRels = relaciones.filter((r) => r.id_destino === node.id_elemento);
  const outgoingRels = relaciones.filter((r) => r.id_origen === node.id_elemento);

  const ancestorElements = incomingRels
    .map((r) => allElements.find((e) => e.id_elemento === r.id_origen))
    .filter(Boolean) as Elemento[];

  const descendantElements = outgoingRels
    .map((r) => allElements.find((e) => e.id_elemento === r.id_destino))
    .filter(Boolean) as Elemento[];

  // Compile default schema keys for this element type
  const defaultKeysForType = new Set<string>();
  metadataSchema.comunes.forEach((f) => defaultKeysForType.add(f.key));
  if (node.tipo === 'Dataset lógico - transformación') {
    metadataSchema.datasets.forEach((f) => defaultKeysForType.add(f.key));
  } else if (node.tipo === 'Dataset fuente') {
    metadataSchema.datasets.forEach((f) => defaultKeysForType.add(f.key));
    metadataSchema.datasets_fuente.forEach((f) => defaultKeysForType.add(f.key));
  } else if (node.tipo === 'Visualización') {
    metadataSchema.visualizaciones.forEach((f) => defaultKeysForType.add(f.key));
  } else if (node.tipo === 'Producto final') {
    metadataSchema.productos.forEach((f) => defaultKeysForType.add(f.key));
  }

  // Ensure all standard metadata keys are displayed,
  // including keys added to the schema after element creation.
  const displayMetadata = {
    ...Object.fromEntries(
      Array.from(defaultKeysForType).map((key) => [key, ''])
    ),
    ...node.metadatos_json
  };

  // Linked metadata map: key -> { linkId, relId, ancestorNode }
  const linkedKeyMap = new Map<number, { relId: number; ancestorNode: Elemento }>();
  incomingRels.forEach((rel) => {
    const ancestor = allElements.find((e) => e.id_elemento === rel.id_origen);
    if (!ancestor) return;
    const linksForRel = metadatosLinkeados.filter((m) => m.id_relacion === rel.id_relacion);
    linksForRel.forEach((link) => {
      linkedKeyMap.set(link.metadato, { relId: rel.id_relacion, ancestorNode: ancestor });
    });
  });

  const handleAddCustomKey = () => {
    const cleanKey = newKeyName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanKey) return;
    const updatedJson = { ...node.metadatos_json, [cleanKey]: newKeyValue.trim() };
    onUpdateElement({ ...node, metadatos_json: updatedJson });
    setNewKeyName('');
    setNewKeyValue('');
  };

  const handleDeleteCustomKey = (key: string) => {
    const updatedJson = { ...node.metadatos_json };
    delete updatedJson[key];

    onUpdateElement({
      ...node,
      metadatos_json: updatedJson
    });
  };

  const handleRunManualExecution = () => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp,
      tipo: 'manual' as const,
      estado: 'exito' as const,
      mensaje: `Pipeline ejecutado correctamente por el usuario. Registros normalizados.`
    };
    const updatedLogs = [newLog, ...(node.logsActualizacion || [])];
    onUpdateElement({
      ...node,
      estado: 'Actualizado',
      fecha_act: timestamp.split(' ')[0],
      logsActualizacion: updatedLogs
    });
  };

  // Handle direct file upload from drawer
  const handleUploadFileToElement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const today = new Date().toISOString().split('T')[0];
    const extension = file.name.split('.').pop()?.toLowerCase() || 'csv';
    const isCsv = extension === 'csv';

    // Auto-generated path: user does NOT choose path
    const autoPath = `/storage/datasets/${node.id_elemento}/${file.name}`;

    const sizeFormatted = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    // Mock initial 5 rows x 5 columns table preview for CSV
    const previewTable = isCsv
      ? {
          columns: ['id', 'municipio', 'poblacion_total', 'variacion_pct', 'fecha_censo'],
          rows: [
            ['1', 'Barcelona', 1636193, '+0.8%', '2025-01-01'],
            ['2', 'L’Hospitalet de Llobregat', 265444, '+0.4%', '2025-01-01'],
            ['3', 'Badalona', 223506, '-0.1%', '2025-01-01'],
            ['4', 'Terrassa', 224114, '+1.2%', '2025-01-01'],
            ['5', 'Sabadell', 216520, '+0.5%', '2025-01-01']
          ],
          totalRows: 12500
        }
      : undefined;

    const newArchivo: Archivo = {
      id_archivo: Date.now(), // Replace with proper ID gen
      id_elemento: node.id_elemento,
      path: autoPath,
      fecha: today,
      up_to_date: true,
      comentarios: uploadFileComments.trim() || 'Subido desde menú lateral',
      es_preview: uploadFileAsPreview,
      tamano: sizeFormatted,
      formato: extension as any,
      previewTable
    };

    onAddArchivo(newArchivo);
    setUploadFileComments('');
    e.target.value = '';
    alert(`Archivo vinculado con éxito: ${file.name}`);
  };

  // URL / Mail link helper
  const renderValueWithLinks = (val: string) => {
    if (!val) return <span className="text-slate-500 italic font-mono text-[11px]">(vacío)</span>;
    if (val.startsWith('http://') || val.startsWith('https://')) {
      return (
        <a
          href={val}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-400 hover:underline break-all inline-flex items-center gap-1 font-mono text-[11px]"
        >
          <span>{val}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      );
    }
    if (val.includes('@') && !val.includes(' ')) {
      return (
        <a
          href={`mailto:${val}`}
          className="text-cyan-400 hover:underline font-mono text-[11px]"
        >
          {val}
        </a>
      );
    }
    return <span className="text-slate-200 font-mono text-[11px] break-words">{val}</span>;
  };

  return (
    <aside className="w-96 md:w-[480px] bg-slate-900 border-l border-slate-800 h-full flex flex-col z-30 shadow-2xl relative select-none">
      {/* Top Header: ID on far left in large format, title & status icon next to status text */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Large ID on the far left */}
          <div className="shrink-0 px-3 py-1.5 rounded-xl bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 font-mono text-base font-extrabold shadow-inner tracking-tight">
            #{node.id_elemento.toString()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <EditableMetadataCell
                value={node.nombre}
                className="text-sm font-bold"
                onSave={(newValue) => {
                  onUpdateElement({
                    ...node,
                    nombre: newValue,
                  });
                }}
              />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusPicker
                node={node}
                onUpdateElement={onUpdateElement}
                getStatusBadge={getStatusBadge}
                disabled={false}
              />

              {/* Date */}
              <div
                className="text-sm text-slate-400 truncate max-w-[150px]"
                title={`Última actualización: ${node.fecha_act || 'Sin fecha'}`}
              >
                <EditableMetadataCell
                  value={node.fecha_act || ''}
                  className="text-slate-400"
                  onSave={(newValue) => {
                    onUpdateElement({
                      ...node,
                      fecha_act: newValue,
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          title="Cerrar inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900/40 px-2 text-xs">
        <button
          onClick={() => setActiveTab('metadata')}
          className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'metadata'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Metadatos</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'preview'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Previsualización</span>
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'files'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Archivos ({nodeArchivos.length})</span>
        </button>

        {node.tipo.includes('Dataset') && (node.metodo_act !== 'Manual') && (
          <button
            onClick={() => setActiveTab('automation')}
            className={`py-2.5 px-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'automation'
                ? 'border-cyan-400 text-cyan-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automatización</span>
          </button>
        )}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-200">
        {/* ================= TAB 1: METADATOS ================= */}
        {activeTab === 'metadata' && (
          <div className="space-y-5">
            {/* SQL Metadata Section */}
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Metadatos Estructurados (SQL)
              </h3>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">

                {node.id_CKAN && (
                  <div className="flex justify-between py-1 border-b border-slate-850">
                    <span className="text-slate-400">ID Paquete CKAN:</span>
                    <span className="font-mono text-cyan-400 text-right">{node.id_CKAN}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-slate-850">
                  <span className="text-slate-300">Método de actualización:</span>
                  <span className="font-medium text-slate-200 text-right font-mono flex items-center gap-1.5">
                    <IconIndicator type="method" value={node.metodo_act} />
                    <span>{node.metodo_act || 'Manual'}</span>
                  </span>
                </div>

                <div className="pt-1">
                  <span className="text-slate-400 block mb-1">
                    Indicaciones:
                  </span>

                  <div className="bg-slate-900 border border-slate-800 rounded p-2">
                    <EditableMetadataCell
                      value={node.indicaciones || ''}
                      className="text-slate-100 font-mono text-[11px]"
                      onSave={(newValue) => {
                        onUpdateElement({
                          ...node,
                          indicaciones: newValue,
                        });
                      }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* JSON Metadata Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Metadatos JSON
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditingJsonMetadata(!isEditingJsonMetadata)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 font-medium transition-colors"
                >
                  {isEditingJsonMetadata ? 'Salir del modo edición' : 'Editar y vincular'}
                </button>
              </div>
              <span className="text-[11px] text-slate-300 italic">
                {isEditingJsonMetadata ? 'Solo se pueden vincular metadatos para datasts lógicos. El valor debe estar vacío.' : ''}
              </span>

              {/* Render key-value pairs */}
              <div className="border border-slate-800 rounded-xl bg-slate-950/70 overflow-hidden divide-y divide-slate-800 mt-2">
                {Object.entries(displayMetadata).map(([key, val]) => {
                  const isDefault = defaultKeysForType.has(key);
                  const linkedInfo = linkedKeyMap.get(key);
                  const isLinked = Boolean(linkedInfo);

                  // Read the current value directly from the linked ancestor.
                  const displayedValue = linkedInfo
                    ? String(
                        linkedInfo.ancestorNode.metadatos_json[key] ?? ''
                      )
                    : val;

                  const isEmpty = !displayedValue || displayedValue.trim() === '';

                  let keyBadgeStyle = 'bg-slate-800 border-slate-700 text-slate-400';
                  if (isLinked) {
                    keyBadgeStyle = 'bg-blue-900/30 border-blue-800 text-blue-300';
                  } else if (isEmpty && isDefault) {
                    keyBadgeStyle = 'bg-slate-900 border-slate-800 text-slate-500';
                  } else if (isDefault) {
                    keyBadgeStyle = 'bg-emerald-900/30 border-emerald-800 text-emerald-300';
                  } else {
                    keyBadgeStyle = 'bg-rose-900/30 border-rose-800 text-rose-300';
                  }

                  const linkedTooltip = isLinked
                    ? `Linkeado de ancestro: ${linkedInfo?.ancestorNode.nombre} (#${linkedInfo?.ancestorNode.id_elemento.toString()})`
                    : undefined;

                  return (
                    <div
                      key={key}
                      className="px-3 py-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Left: Key with clip icon and hover tooltip for ancestor */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`font-mono font-semibold text-[11px] px-2 py-0.5 rounded border cursor-help ${keyBadgeStyle}`}
                          title={linkedTooltip}
                        >
                          {key}
                        </span>

                        {isLinked && (
                          <span
                            className="text-blue-400 p-0.5 rounded hover:bg-blue-950 cursor-help"
                            title={linkedTooltip}
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </span>
                        )}

                        {!isDefault && (
                          <>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Extra
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar el metadato "${key}"?`)) {
                                  handleDeleteCustomKey(key);
                                }
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 transition-colors"
                              title={`Eliminar metadato ${key}`}
                              aria-label={`Eliminar metadato ${key}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Right: Value */}
                      <div className="min-w-0 flex-1 sm:text-right pl-2">
                        {isEditingJsonMetadata && !isLinked ? (
                          <input
                            type="text"
                            value={displayedValue}
                            onChange={(e) => {
                              const updated = {
                                ...node.metadatos_json,
                                [key]: e.target.value
                              };
                              onUpdateElement({ ...node, metadatos_json: updated });
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 text-left sm:text-right"
                          />
                        ) : (
                          renderValueWithLinks(displayedValue)
                        )}
                      </div>

                      {/* Link/unlink action in edit mode */}
                      {isEditingJsonMetadata && incomingRels.length > 0 && node.tipo === 'Dataset lógico - transformación' && isEmpty && (
                        <div className="shrink-0 pt-1 sm:pt-0 relative">
                          {isLinked ? (
                            <button
                              onClick={() => {
                                onUpdateLinkedMetadata(node.id_elemento, key, null);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors"
                            >
                              Desvincular
                            </button>
                          ) : incomingRels.length === 1 ? (
                            <button
                              onClick={() => {
                                onUpdateLinkedMetadata(
                                  node.id_elemento,
                                  key,
                                  incomingRels[0].id_relacion
                                );
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors"
                            >
                              Vincular
                            </button>
                          ) : (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenAncestorPickerKey(
                                    openAncestorPickerKey === key ? null : key
                                  )
                                }
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors inline-flex items-center gap-1"
                              >
                                <span>Vincular</span>
                                <ChevronDown className="w-3 h-3" />
                              </button>

                              {openAncestorPickerKey === key && (
                                <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-1">
                                  <div className="text-[10px] text-slate-400 font-semibold px-2 py-1 uppercase tracking-wider border-b border-slate-800">
                                    Vincular con ancestro:
                                  </div>
                                  <div className="max-h-40 overflow-y-auto space-y-0.5 pr-0.5">
                                    {incomingRels.map((rel) => {
                                      const anc = allElements.find(
                                        (e) => e.id_elemento === rel.id_origen
                                      );
                                      if (!anc) return null;
                                      return (
                                        <button
                                          key={rel.id_relacion}
                                          type="button"
                                          onClick={() => {
                                            onUpdateLinkedMetadata(
                                              node.id_elemento,
                                              key,
                                              rel.id_relacion
                                            );
                                            setOpenAncestorPickerKey(null);
                                          }}
                                          className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 group text-[11px] transition-colors"
                                        >
                                          <div className="truncate mr-1">
                                            <span className="font-semibold block truncate">
                                              {anc.nombre}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono block">
                                              #{anc.id_elemento.toString()} · {anc.tipo}
                                            </span>
                                          </div>
                                          <Link2 className="w-3.5 h-3.5 text-blue-400 shrink-0 opacity-60 group-hover:opacity-100" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Custom JSON Key */}
              {isEditingJsonMetadata && (
                <div className="mt-3 p-3 border border-slate-800 bg-slate-950/60 rounded-xl space-y-2">
                  <span className="font-semibold text-slate-300 block">Añadir Nuevo Metadato</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="clave (e.g. licencia)"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="valor"
                      value={newKeyValue}
                      onChange={(e) => setNewKeyValue(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                    />
                  </div>
                  <button
                    onClick={handleAddCustomKey}
                    className="w-full py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded font-medium transition-colors"
                  >
                    + Agregar Clave
                  </button>
                </div>
              )}
            </div>

            {/* Ancestors List with Delete Relation Button */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div>
                <span className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold block mb-2">
                  Ancestros Directos ({ancestorElements.length})
                </span>
                {ancestorElements.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">No tiene orígenes previos.</p>
                ) : (
                  <div className="space-y-1.5">
                    {ancestorElements.map((anc) => (
                      <div
                        key={anc.id_elemento}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors"
                      >
                        <button
                          onClick={() => {
                            onSelectNode(anc.id_elemento);
                            onCenterNode(anc.id_elemento);
                          }}
                          className="flex items-center gap-2 truncate text-left flex-1"
                        >
                          <span className="font-mono text-cyan-400 font-semibold text-[10px]">
                            #{anc.id_elemento.toString()}
                          </span>
                          <span className="text-slate-200 text-xs font-medium truncate group-hover:text-cyan-300">
                            {anc.nombre}
                          </span>
                        </button>

                        {/* Delete connection with this ancestor */}
                        <button
                          onClick={() => {
                            setRelationToDelete({
                              sourceId: anc.id_elemento,
                              targetId: node.id_elemento,
                              sourceName: anc.nombre,
                              targetName: node.nombre
                            });
                          }}
                          className="p-1 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded transition-colors ml-2 shrink-0"
                          title="Eliminar conexión con este ancestro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Descendants List */}
              <div>
                <span className="text-slate-400 uppercase tracking-wider text-[11px] font-semibold block mb-2">
                  Descendientes Directos ({descendantElements.length})
                </span>
                {descendantElements.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">No tiene elementos derivados.</p>
                ) : (
                  <div className="space-y-1.5">
                    {descendantElements.map((desc) => (
                      <div
                        key={desc.id_elemento}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors"
                      >
                        <button
                          onClick={() => {
                            onSelectNode(desc.id_elemento);
                            onCenterNode(desc.id_elemento);
                          }}
                          className="flex items-center gap-2 truncate text-left flex-1"
                        >
                          <span className="font-mono text-emerald-400 font-semibold text-[10px]">
                            #{desc.id_elemento.toString()}
                          </span>
                          <span className="text-slate-200 text-xs font-medium truncate group-hover:text-emerald-300">
                            {desc.nombre}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setRelationToDelete({
                              sourceId: node.id_elemento,
                              targetId: desc.id_elemento,
                              sourceName: node.nombre,
                              targetName: desc.nombre
                            });
                          }}
                          className="p-1 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded transition-colors ml-2 shrink-0"
                          title="Eliminar conexión con este descendiente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PREVISUALIZACIÓN ================= */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            {/* Visualization image */}
            {node.tipo === 'Visualización' ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-200">
                  Vista previa de la visualización
                </h3>

                {visualizationImageUrl ? (
                  <div className="w-full rounded-xl overflow-hidden border border-purple-500/30 bg-slate-950">
                    <img
                      src={visualizationImageUrl}
                      alt={`Vista previa: ${node.nombre}`}
                      loading="lazy"
                      draggable={false}
                      className="w-full max-h-[400px] object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center rounded-xl border border-dashed border-slate-800 text-slate-400">
                    No hay imagen disponible.
                  </div>
                )}
              </div>
            ) : previewArchivo?.previewTable ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-slate-200">
                    Primeras 5 Filas y Columnas (CSV Muestra)
                  </span>
                  <span className="font-mono text-[11px]">
                    Total: {previewArchivo.previewTable.totalRows.toLocaleString()} registros
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950 shadow-inner">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-300">
                      <tr>
                        {previewArchivo.previewTable.columns.slice(0, 20).map((col) => (
                          <th key={col} className="px-3 py-2 font-semibold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {previewArchivo.previewTable.rows.slice(0, 20).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-900/40">
                          {row.slice(0, 5).map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap text-slate-300">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : previewArchivo?.previewSvgSnippet ? (
              <div className="space-y-2">
                <span className="font-semibold text-slate-300 block">Renderizado Gráfico</span>
                <div
                  className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 shadow-inner"
                  dangerouslySetInnerHTML={{ __html: previewArchivo.previewSvgSnippet }}
                />
              </div>
            ) : node.metadatos_json.iframe_es ? (
              <div className="space-y-2">
                <span className="font-semibold text-slate-300 block">Iframe Embebido</span>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-cyan-300 break-all">
                  {node.metadatos_json.iframe_es}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 space-y-2">
                <Eye className="w-8 h-8 mx-auto text-slate-600" />
                <p>No hay un archivo de previsualización fijado.</p>
                <p className="text-[11px] text-slate-500">
                  Sube un archivo CSV en la pestaña Archivos para ver sus 5 primeras filas y columnas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: ARCHIVOS ================= */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            {/* Direct Upload Form inside lateral drawer */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">Subir Archivo a este Elemento</span>
                <Upload className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                La ruta se genera automáticamente en <code className="text-cyan-400 font-mono">/storage/datasets/{node.id_elemento}/...</code>
              </p>

              <div>
                <input
                  type="text"
                  placeholder="Comentario sobre el archivo..."
                  value={uploadFileComments}
                  onChange={(e) => setUploadFileComments(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs mb-2"
                />
                <label className="flex items-center gap-2 cursor-pointer mb-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={uploadFileAsPreview}
                    onChange={(e) => setUploadFileAsPreview(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500"
                  />
                  <span>Fijar como previsualización activa</span>
                </label>

                <label className="w-full py-2 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg flex items-center justify-center gap-2 font-semibold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Seleccionar Archivo del Disco</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleUploadFileToElement}
                  />
                </label>
              </div>
            </div>

            {/* List of Files */}
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                Archivos Registrados ({nodeArchivos.length})
              </h4>
              {nodeArchivos.length === 0 ? (
                <p className="text-slate-500 italic text-[11px]">No hay archivos asociados.</p>
              ) : (
                nodeArchivos.map((file) => (
                  <div
                    key={file.id_archivo}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className="font-mono text-cyan-300 font-semibold block truncate cursor-help"
                          title={file.path}
                        >
                          {file.path.split('/').pop() || file.path}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                          <span>{file.fecha}</span>
                          <span>·</span>
                          <span className="uppercase">{file.formato}</span>
                          {file.tamano && (
                            <>
                              <span>·</span>
                              <span>{file.tamano}</span>
                            </>
                          )}
                          <span>·</span>
                          <span
                            className={
                              file.up_to_date ? 'text-emerald-400 flex items-center gap-0.5' : 'text-rose-400 flex items-center gap-0.5'
                            }
                          >
                            {file.up_to_date ? '✓ Al día' : '✕ Desactualizado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onSetPreviewArchivo(file.id_archivo)}
                          className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                            file.es_preview
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                          title="Fijar como previsualización por defecto"
                        >
                          {file.es_preview ? 'Preview' : 'Fijar'}
                        </button>

                        <button
                          onClick={() => {
                            const element = document.createElement('a');
                            const fileContent = file.previewTable
                              ? file.previewTable.columns.join(',') +
                                '\n' +
                                file.previewTable.rows.map((r) => r.join(',')).join('\n')
                              : 'Contenido del archivo';
                            const blob = new Blob([fileContent], { type: 'text/plain' });
                            element.href = URL.createObjectURL(blob);
                            element.download = file.path.split('/').pop() || 'archivo.csv';
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                          title="Descargar archivo"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar ${file.path}?`)) {
                              onDeleteArchivo(file.id_archivo);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded"
                          title="Eliminar archivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {file.comentarios && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-1.5 rounded border border-slate-850">
                        {file.comentarios}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: AUTOMATIZACIÓN ================= */}
        {activeTab === 'automation' && (
          <div className="space-y-5">
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Ejecución del Pipeline</span>
                  <span className="text-[11px] text-slate-400">
                    Tipo: {node.metodo_act} (dbt / ETL job)
                  </span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleRunManualExecution}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Ejecutar Nueva Actualización</span>
                </button>
              </div>
            </div>

            {/* Execution Logs */}
            <div className="space-y-2">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] block">
                Historial de Ejecuciones
              </span>
              {node.logsActualizacion && node.logsActualizacion.length > 0 ? (
                <div className="space-y-2">
                  {node.logsActualizacion.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1 font-mono text-[11px]"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span>{log.timestamp}</span>
                        <span
                          className={
                            log.estado === 'exito' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'
                          }
                        >
                          {log.estado.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-300">{log.mensaje}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No hay registros de actualización previos.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer: Delete Action + Ver en Grafo + Close */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium text-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Eliminar Elemento</span>
        </button>

        {/* Ver en Grafo button right between Delete and Close */}
        <button
          onClick={() => onCenterNode(node.id_elemento)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors border border-slate-700 hover:border-cyan-500/50"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Ver en el grafo</span>
        </button>

        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-xs transition-colors"
        >
          Cerrar
        </button>
      </div>

      {/* Delete Element Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-100">
                ¿Eliminar este elemento?
              </h3>
            </div>
            <p className="text-slate-100 font-medium">
              <strong>{node.nombre}</strong> (#{node.id_elemento.toString()}).
            </p>
            <p className="pt-2">
              Se eliminará el elemento, sus metadatos y conexiones asociadas.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteElement(node.id_elemento);
                  setShowDeleteConfirm(false);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Sí, eliminar elemento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Relation Confirmation Modal */}
      {relationToDelete && (
        <DeleteRelationModal
          sourceName={relationToDelete.sourceName}
          targetName={relationToDelete.targetName}
          sourceId={relationToDelete.sourceId}
          targetId={relationToDelete.targetId}
          onConfirm={onDeleteRelation}
          onCancel={() => setRelationToDelete(null)}
        />
      )}
    </aside>
  );
};
