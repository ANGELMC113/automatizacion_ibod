import React, { useState, useEffect, useRef } from 'react';
import {
  Elemento,
  Relacion,
  DefaultMetadataSchema,
  MetadatoLinkeado
} from '../types/lineage';
import {
  Package,
  BarChart3,
  Layers,
  ChevronDown,
  Info,
  ExternalLink,
  TableProperties,
  Calendar,
  Check,
  X,
  Link2
} from 'lucide-react';
import { EditableMetadataCell } from './utils/EditableMetadataCell';
import { getStatusBadge } from './style/GetStatusBadge';
import IconIndicator from './style/IconIndicator';
import StatusPicker from './utils/StatusPicker';

interface Props {
  elements: Elemento[];
  relaciones: Relacion[];
  metadataSchema: DefaultMetadataSchema;
  metadatosLinkeados: MetadatoLinkeado[];
  layer1ProjectId: string | null;
  onSelectLayer1Project: (id: string | null) => void;
  onSelectNode: (id: string | null) => void;
  onSwitchToGraph: () => void;
  onUpdateElement: (updated: Elemento) => void;
}

interface ProductIngredientRow {
  visNode: Elemento | null;
  datasetNode: Elemento | null;
}

export const ProductTableView: React.FC<Props> = ({
  elements = [],
  relaciones = [],
  metadataSchema,
  metadatosLinkeados = [],
  layer1ProjectId,
  onSelectLayer1Project,
  onSelectNode,
  onSwitchToGraph,
  onUpdateElement
}) => {
  const finalProducts = elements.filter((e) => e.tipo === 'Producto final');

  // Synchronize with Layer 1 Project if selected
  const [selectedProductId, setSelectedProductId] = useState<number>(
    layer1ProjectId ?? finalProducts[0]?.id_elemento ?? 0
  );

  useEffect(() => {
    if (
      layer1ProjectId !== null &&
      finalProducts.some((p) => p.id_elemento === layer1ProjectId)
    ) {
      setSelectedProductId(layer1ProjectId);
    }
  }, [layer1ProjectId, finalProducts]);

  const [columnDensity, setColumnDensity] = useState<'normal' | 'wide' | 'compact'>('wide');

  const currentProduct = finalProducts.find((p) => String(p.id_elemento) === String(selectedProductId));
  // Compute ingredients for currentProduct:
  const incomingToProduct = relaciones
    .filter((r) => r.id_destino === selectedProductId)
    .map((r) =>
      elements.find((e) => e.id_elemento === r.id_origen)
    )
    .filter(Boolean) as Elemento[];

  const rows: ProductIngredientRow[] = [];

  incomingToProduct.forEach((item) => {
    if (item.tipo === 'Visualización') {
      const incomingToVis = relaciones
        .filter(
          (r) => r.id_destino === item.id_elemento
        )
        .map((r) =>
          elements.find(
            (e) => e.id_elemento === r.id_origen
          )
        )
        .filter(Boolean) as Elemento[];
        
      const logicalDatasets = incomingToVis.filter(
        (e) => e.tipo === 'Dataset lógico - transformación'
      );

      if (logicalDatasets.length === 1) {
        rows.push({
          visNode: item,
          datasetNode: logicalDatasets[0]
        });
      } else {
        rows.push({
          visNode: item,
          datasetNode: null
        });
      }
    } else if (item.tipo === 'Dataset lógico - transformación') {
      rows.push({
        visNode: null,
        datasetNode: item
      });
    }
  });

  // Standard metadata keys for Visualizaciones
  const stdVisKeys = new Set<string>();
  metadataSchema.comunes.forEach((c) => stdVisKeys.add(c.key));
  metadataSchema.visualizaciones.forEach((v) => stdVisKeys.add(v.key));

  const extraVisKeys = new Set<string>();
  rows.forEach((r) => {
    if (r.visNode) {
      Object.keys(r.visNode.metadatos_json).forEach((k) => {
        if (!stdVisKeys.has(k)) extraVisKeys.add(k);
      });
    }
  });

  // Standard metadata keys for Datasets
  const stdDatasetKeys = new Set<string>();
  metadataSchema.comunes.forEach((c) => stdDatasetKeys.add(c.key));
  metadataSchema.datasets.forEach((d) => stdDatasetKeys.add(d.key));

  const extraDatasetKeys = new Set<string>();
  rows.forEach((r) => {
    if (r.datasetNode) {
      Object.keys(r.datasetNode.metadatos_json).forEach((k) => {
        if (!stdDatasetKeys.has(k)) extraDatasetKeys.add(k);
      });
    }
  });

  const stdVisKeyList = Array.from(stdVisKeys);
  const extraVisKeyList = Array.from(extraVisKeys);
  const stdDatasetKeyList = Array.from(stdDatasetKeys);
  const extraDatasetKeyList = Array.from(extraDatasetKeys);

  const colWidthClass =
    columnDensity === 'wide'
      ? 'min-w-[220px]'
      : columnDensity === 'normal'
      ? 'min-w-[170px]'
      : 'min-w-[130px]';

  console.log({
    selectedProductId,
    layer1ProjectId,
    finalProductIds: finalProducts.map((p) => p.id_elemento),
    incomingRelationships: relaciones.filter(
      (r) => r.id_destino === selectedProductId
    ),
    elementCount: elements.length,
    relationshipCount: relaciones.length,
    rowCount: rows.length,
  });

  return (
    <div
      onClick={() => onSelectNode(null)}
      className="flex-1 overflow-y-auto p-6 max-w-[1800px] mx-auto space-y-6"
    >
      {/* Header Selector Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5"
      >
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Vista tabular de visualizaciones y datasets lógicos
          </h2>
        </div>

        {/* Controls: Product selector + Column width switcher */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-slate-500 px-1 text-[11px]">Ancho:</span>
            <button
              onClick={() => setColumnDensity('compact')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                columnDensity === 'compact' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Compacto
            </button>
            <button
              onClick={() => setColumnDensity('normal')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                columnDensity === 'normal' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setColumnDensity('wide')}
              className={`px-2 py-0.5 rounded text-[11px] ${
                columnDensity === 'wide' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-400'
              }`}
            >
              Amplio
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 whitespace-nowrap">Proyecto:</span>
            <select
              value={selectedProductId}
              onChange={(e) => {
                const productId = Number(e.target.value);

                setSelectedProductId(productId);
                onSelectLayer1Project(productId);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
            >
              {finalProducts.map((p) => (
                <option key={p.id_elemento} value={p.id_elemento}>
                  {p.metadatos_json.codigo || 'PROD'} · {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Selected Product Summary Card with ALL JSON Metadata, status and date */}
      {currentProduct && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-4.5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800">
                    {currentProduct.id_elemento}
                  </span>
                  <div className="min-w-0">
                    <EditableMetadataCell
                      value={currentProduct.nombre}
                      onSave={(newValue) =>
                        onUpdateElement({
                          ...currentProduct,
                          nombre: newValue
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>Actualizado:</span>
                      <EditableMetadataCell
                        value={currentProduct.fecha_act || ''}
                        onSave={(newValue) =>
                          onUpdateElement({
                            ...currentProduct,
                            fecha_act: newValue
                          })
                        }
                      />
                    </span>
                  </span>
                  <StatusPicker
                    node={currentProduct}
                    onUpdateElement={onUpdateElement}
                    getStatusBadge={getStatusBadge}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  onSelectNode(currentProduct.id_elemento);
                  onSwitchToGraph();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-cyan-300 transition-colors border border-slate-700"
              >
                Ver en el grafo
              </button>

              <button
                onClick={() => {
                  onSelectNode(currentProduct.id_elemento);
                }}
                className="px-3 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/60 rounded-lg text-xs font-medium text-emerald-300 transition-colors border border-emerald-800/60"
              >
                Abrir en el menú lateral
              </button>
            </div>
          </div>

          {/* ALL JSON Metadata of the Product Displayed Fully */}
          <div className="border-t border-slate-800 pt-2.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Todos los Metadatos del Producto
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {Object.entries(currentProduct.metadatos_json).map(([k, v]) => (
                <div key={k} className="p-2 bg-slate-950/70 border border-slate-800/80 rounded-lg">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">{k}</span>
                  <div className="mt-0.5">
                    <EditableMetadataCell
                      value={typeof v === 'string' ? v : String(v ?? '')}
                      onSave={(newValue) =>
                        onUpdateElement({
                          ...currentProduct,
                          metadatos_json: {
                            ...currentProduct.metadatos_json,
                            [k]: newValue
                          }
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* High-density Matrix Table with variable row heights */}
      {rows.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 space-y-2">
          <Info className="w-8 h-8 mx-auto text-slate-600" />
          <p className="font-medium text-slate-300">
            No se han conectado visualizaciones ni datasets directos a este producto final.
          </p>
          <p className="text-xs text-slate-500">
            Arrastra una flecha en el grafo para conectar visualizaciones hacia este producto.
          </p>
        </div>
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950 shadow-2xl"
        >
          <table className="w-full text-left text-xs divide-y divide-slate-800">
            <thead>
              {/* Top grouping row */}
              <tr className="bg-slate-900/90 text-slate-300 font-bold border-b border-slate-800">
                <th
                  colSpan={3 + stdVisKeyList.length + extraVisKeyList.length}
                  className="px-4 py-2 bg-purple-950/40 text-purple-300 border-r border-slate-800 uppercase tracking-wider text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    <span>Visualizaciones Conectadas ({rows.filter((r) => r.visNode).length})</span>
                  </div>
                </th>

                <th
                  colSpan={5 + stdDatasetKeyList.length + extraDatasetKeyList.length}
                  className="px-4 py-2 bg-blue-950/40 text-blue-300 uppercase tracking-wider text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Dataset Lógico Emparejado (Transformación Única)</span>
                  </div>
                </th>
              </tr>

              {/* Column labels */}
              <tr className="bg-slate-900 text-[11px] font-mono divide-x divide-slate-800">
                <th className={`px-3 py-2.5 text-slate-300 ${colWidthClass}`}>Visualización</th>
                <th className="px-3 py-2.5 text-slate-300 min-w-[100px]">Fecha act.</th>
                <th className="px-3 py-2.5 text-slate-300 min-w-[100px]">Estado</th>

                {stdVisKeyList.map((k) => (
                  <th
                    key={`std-vis-${k}`}
                    className={`px-3 py-2.5 bg-emerald-950/60 text-emerald-300 border-emerald-800/60 font-semibold ${colWidthClass}`}
                  >
                    {k}
                  </th>
                ))}

                {extraVisKeyList.map((k) => (
                  <th
                    key={`extra-vis-${k}`}
                    className={`px-3 py-2.5 bg-rose-950/80 text-rose-200 border-rose-900 font-bold ${colWidthClass}`}
                  >
                    {k} (Extra)
                  </th>
                ))}

                <th className={`px-3 py-2.5 text-slate-300 bg-blue-950/20 ${colWidthClass}`}>
                  Dataset lógico
                </th>
                <th className="px-3 py-2.5 text-slate-300 min-w-[100px] bg-blue-950/20">
                  Fecha act.
                </th>
                <th className="px-3 py-2.5 text-slate-300 min-w-[100px] bg-blue-950/20">
                  Estado
                </th>
                <th className={`px-3 py-2.5 text-slate-300 bg-blue-950/20 ${colWidthClass}`}>
                  Indicaciones
                </th>

                {stdDatasetKeyList.map((k) => (
                  <th
                    key={`std-ds-${k}`}
                    className={`px-3 py-2.5 bg-emerald-950/60 text-emerald-300 border-emerald-800/60 font-semibold ${colWidthClass}`}
                  >
                    {k}
                  </th>
                ))}

                {extraDatasetKeyList.map((k) => (
                  <th
                    key={`extra-ds-${k}`}
                    className={`px-3 py-2.5 bg-rose-950/80 text-rose-200 border-rose-900 font-bold ${colWidthClass}`}
                  >
                    {k} (Extra)
                  </th>
                ))}
              </tr>
            </thead>

            {/* Variable height rows */}
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {rows.map((row, idx) => {
                const visLinkedMetadata = new Map<string, string>();

                if (row.visNode) {
                  const incomingToVis = relaciones.filter(
                    (rel) => rel.id_destino === row.visNode!.id_elemento
                  );

                  incomingToVis.forEach((rel) => {
                    const ancestor = elements.find(
                      (element) => element.id_elemento === rel.id_origen
                    );

                    if (!ancestor) return;

                    metadatosLinkeados
                      .filter((metadata) => metadata.id_relacion === rel.id_relacion)
                      .forEach((metadata) => {
                        const metadataKey = String(metadata.metadato).trim();
                        visLinkedMetadata.set(metadataKey, ancestor.nombre);
                      });
                  });
                }

                const datasetLinkedMetadata = new Map<string, string>();

                if (row.datasetNode) {
                  const incomingToDataset = relaciones.filter(
                    (rel) => rel.id_destino === row.datasetNode!.id_elemento
                  );

                  incomingToDataset.forEach((rel) => {
                    const ancestor = elements.find(
                      (element) => element.id_elemento === rel.id_origen
                    );

                    if (!ancestor) return;

                    metadatosLinkeados
                      .filter((metadata) => metadata.id_relacion === rel.id_relacion)
                      .forEach((metadata) => {
                        datasetLinkedMetadata.set(
                          String(metadata.metadato),
                          ancestor.nombre
                        );
                      });
                  });
                }

                return (
                  <tr key={idx} className="hover:bg-slate-900/40 divide-x divide-slate-800 h-auto">
                    {/* Vis columns */}
                    <td className="px-3 py-3 align-top font-sans font-semibold text-slate-100 whitespace-normal">
                      {row.visNode ? (
                        <div className="block">
                          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-md bg-purple-500/10 border border-purple-400/30 text-purple-400 font-mono font-bold text-xs mr-1.5 shrink-0">
                            {row.visNode.id_elemento}
                          </span>

                          <EditableMetadataCell
                            value={row.visNode.nombre}
                            onSingleClick={() => onSelectNode(row.visNode!.id_elemento)}
                            onSave={(newValue) => {
                              if (!row.visNode) return;

                              onUpdateElement({
                                ...row.visNode,
                                nombre: newValue,
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">--- (Conexión directa)</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-slate-400 whitespace-nowrap">
                      {row.visNode && (
                        <EditableMetadataCell
                          value={row.visNode.fecha_act || ''}
                          onSave={(newValue) => {
                            if (!row.visNode) return;

                            onUpdateElement({
                              ...row.visNode,
                              fecha_act: newValue,
                            });
                          }}
                        />
                      )}
                    </td>
                    <td className="px-3 py-3 align-top whitespace-nowrap">
                      {row.visNode ? (
                        <div className="flex flex-col items-start gap-2">
                          {/* Method */}
                          <div className="flex items-center gap-2 text-slate-300">
                            <span>{row.visNode.metodo_act || '-'}</span>
                            <IconIndicator
                              type="method"
                              value={row.visNode.metodo_act}
                            />
                          </div>
                          {/* Clickable status badge with floating dropdown */}                          
                          <StatusPicker
                            node={row.visNode}
                            onUpdateElement={onUpdateElement}
                            getStatusBadge={getStatusBadge}
                          />
                                              
                        </div>
                      ) : (
                        <span className="text-slate-600">---</span>
                      )}
                    </td>

                    {stdVisKeyList.map((k) => {
                      const metadataKey = String(k).trim();
                      const isLinked = visLinkedMetadata.has(metadataKey);
                      const ancestorName = visLinkedMetadata.get(metadataKey);

                      const linkedTooltip = isLinked
                        ? `Linkeado de ancestro: ${ancestorName}`
                        : undefined;

                      return (
                        <td key={`val-std-vis-${k}`} className="px-3 py-3 align-top whitespace-normal break-words bg-emerald-950/10">
                          <EditableMetadataCell
                            value={row.visNode?.metadatos_json[k]}
                            onSave={(newValue) => {
                              if (!row.visNode) return;

                              onUpdateElement({
                                ...row.visNode,
                                metadatos_json: {
                                  ...row.visNode.metadatos_json,
                                  [k]: newValue
                                }
                              });
                            }}
                            isLinked={isLinked}
                            linkedTooltip={linkedTooltip}
                          />
                        </td>
                      );
                    })}

                    {extraVisKeyList.map((k) => (
                      <td
                        key={`val-extra-vis-${k}`}
                        className="px-3 py-3 align-top whitespace-normal break-words bg-rose-950/20 text-rose-200"
                      >
                        <EditableMetadataCell
                          value={row.visNode?.metadatos_json[k]}
                          onSave={(newValue) => {
                            if (!row.visNode) return;

                            onUpdateElement({
                              ...row.visNode,
                              metadatos_json: {
                                ...row.visNode.metadatos_json,
                                [k]: newValue
                              }
                            });
                          }}
                        />
                      </td>
                    ))}

                    {/* Dataset Columns */}
                    <td className="px-3 py-3 align-top font-sans font-semibold text-slate-100 whitespace-normal bg-blue-950/10">
                      {row.datasetNode ? (
                        <div className="block">
                          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-md bg-blue-500/10 border border-blue-400/30 text-blue-400 font-mono font-bold text-xs mr-1.5 shrink-0">
                            {row.datasetNode.id_elemento}
                          </span>

                          <EditableMetadataCell
                            value={row.datasetNode.nombre}
                            onSingleClick={() => onSelectNode(row.datasetNode!.id_elemento)}
                            onSave={(newValue) => {
                              if (!row.datasetNode) return;

                              onUpdateElement({
                                ...row.datasetNode,
                                nombre: newValue,
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">---</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-slate-400 whitespace-nowrap bg-blue-950/10">
                      {row.datasetNode && (
                        <EditableMetadataCell
                          value={row.datasetNode.fecha_act || ''}
                          onSave={(newValue) =>
                            onUpdateElement({
                              ...row.datasetNode!,
                              fecha_act: newValue
                            })
                          }
                        />
                      )}
                    </td>
                    <td className="px-3 py-3 align-top whitespace-nowrap bg-blue-950/10">
                      {row.datasetNode ? (
                        <div className="flex flex-col items-start gap-2">
                          {/* Method */}
                          <div className="flex items-center gap-2 text-slate-300">
                            <span>{row.datasetNode.metodo_act || '-'}</span>
                            <IconIndicator
                              type="method"
                              value={row.datasetNode.metodo_act}
                            />
                          </div>
                          {/* Status badge */}
                          <StatusPicker
                            node={row.datasetNode}
                            onUpdateElement={onUpdateElement}
                            getStatusBadge={getStatusBadge}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-600">---</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-slate-300 whitespace-normal break-words bg-blue-950/10">
                      {row.datasetNode && (
                      <EditableMetadataCell
                        value={row.datasetNode.indicaciones || ''}
                        onSave={(newValue) =>
                          onUpdateElement({
                            ...row.datasetNode!,
                            indicaciones: newValue
                          })
                        }
                      />
                    )}
                    </td>

                    {stdDatasetKeyList.map((k) => {
                      const metadataKey = String(k).trim();
                      const isLinked = datasetLinkedMetadata.has(metadataKey);
                      const ancestorName = datasetLinkedMetadata.get(metadataKey);

                      return (
                        <td
                          key={`val-std-ds-${k}`}
                          className="bg-blue-950/5"
                        >
                          <EditableMetadataCell
                            value={row.datasetNode?.metadatos_json[k]}
                            isLinked={isLinked}
                            linkedTooltip={
                              isLinked
                                ? `Linkeado de ancestro: ${ancestorName}`
                                : undefined
                            }
                            onSave={(newValue) => {
                              if (!row.datasetNode) return;

                              onUpdateElement({
                                ...row.datasetNode,
                                metadatos_json: {
                                  ...row.datasetNode.metadatos_json,
                                  [k]: newValue,
                                },
                              });
                            }}
                          />
                        </td>
                      );
                    })}

                    {extraDatasetKeyList.map((k) => (
                      <td
                        key={`val-extra-ds-${k}`}
                        className="px-3 py-3 align-top whitespace-normal break-words bg-rose-950/20 text-rose-200"
                      >
                        <EditableMetadataCell
                          value={row.datasetNode?.metadatos_json[k]}
                          onSave={(newValue) => {
                            if (!row.datasetNode) return;

                            onUpdateElement({
                              ...row.datasetNode,
                              metadatos_json: {
                                ...row.datasetNode.metadatos_json,
                                [k]: newValue
                              }
                            });
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
