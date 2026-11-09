import React, { useState, useEffect } from 'react';
import {
  Elemento,
  TipoElemento,
  EstadoElemento,
  DefaultMetadataSchema
} from '../types/lineage';
import {
  X,
  Plus,
  Trash2,
  Info
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  metadataSchema: DefaultMetadataSchema;
  onCreate: (newElement: Elemento) => void;
}

export const CreateElementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  metadataSchema,
  onCreate
}) => {
  const [tipo, setTipo] = useState<TipoElemento>('Dataset lógico - transformación');
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState<EstadoElemento>('Actualizado');
  const [indicaciones, setIndicaciones] = useState('');
  const [idCKAN, setIdCKAN] = useState('');

  // JSON metadata form values
  const [jsonMetadata, setJsonMetadata] = useState<Record<string, string>>({});
  // Track custom extra keys added by the user
  const [customKeys, setCustomKeys] = useState<string[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  const getMetadataPlaceholder = (key: string): string => {
    const allFields = [
      ...metadataSchema.comunes,
      ...metadataSchema.datasets,
      ...metadataSchema.datasets_fuente,
      ...metadataSchema.visualizaciones,
      ...metadataSchema.productos,
    ];

    return allFields.find((field) => field.key === key)?.comentario ?? '...';
  };

  useEffect(() => {
    if (isOpen) {
      setNombre('');
      setIndicaciones('');
      setIdCKAN('');
      setCustomKeys([]);
      setNewKeyName('');
      setNewKeyValue('');
    }
  }, [isOpen]);

  // Initialize standard JSON keys for selected type
  useEffect(() => {
    // 1. Common keys
    const commonKeys = metadataSchema.comunes.map((field) => field.key);
    const typeSpecificKeys: string[] = [];

    if (
      tipo === 'Dataset fuente' ||
      tipo === 'Dataset lógico - transformación' ||
      tipo === 'Dataset CKAN'
    ) {
      metadataSchema.datasets.forEach((f) => {
        if (!commonKeys.includes(f.key)) typeSpecificKeys.push(f.key);
      });
    } else if (tipo === 'Visualización') {
      metadataSchema.visualizaciones.forEach((f) => {
        if (!commonKeys.includes(f.key)) typeSpecificKeys.push(f.key);
      });
    } else if (tipo === 'Producto final') {
      metadataSchema.productos.forEach((f) => {
        if (!commonKeys.includes(f.key)) typeSpecificKeys.push(f.key);
      });
    }

    const standardKeys = [...commonKeys, ...typeSpecificKeys];

    setJsonMetadata((prev) => {
      const nextJson: Record<string, string> = {};

      standardKeys.forEach((key) => {
        nextJson[key] = prev[key] ?? '';
      });

      // Preserve user-defined extra keys
      customKeys.forEach((key) => {
        nextJson[key] = prev[key] ?? '';
      });

      return nextJson;
    });
  }, [tipo, metadataSchema, isOpen, customKeys]);

  if (!isOpen) return null;

  const handleAddCustomKey = () => {
    const cleanKey = newKeyName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanKey) return;
    if (jsonMetadata[cleanKey] !== undefined) {
      alert('Esta clave ya existe en los metadatos.');
      return;
    }
    setCustomKeys((prev) => [...prev, cleanKey]);
    setJsonMetadata((prev) => ({ ...prev, [cleanKey]: newKeyValue.trim() }));
    setNewKeyName('');
    setNewKeyValue('');
  };

  const handleRemoveCustomKey = (key: string) => {
    setCustomKeys((prev) => prev.filter((k) => k !== key));
    setJsonMetadata((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Por favor introduce un nombre para el elemento.');
      return;
    }

    const newId = Date.now(); // Needs to be replaced with a proper ID generator
    const today = new Date().toISOString().split('T')[0];

    const finalCodigo = jsonMetadata.codigo?.trim() || `ID-${Math.floor(Math.random() * 900) + 100}`;
    const finalJson = {
      ...jsonMetadata,
      codigo: finalCodigo
    };

    let col = 1;
    if (tipo === 'Dataset fuente') col = 0;
    else if (tipo === 'Dataset lógico - transformación' || tipo === 'Dataset CKAN') col = 1;
    else if (tipo === 'Visualización') col = 2;
    else if (tipo === 'Producto final') col = 3;

    const newElement: Elemento = {
      id_elemento: newId,
      tipo,
      nombre: nombre.trim(),
      fecha_act: today,
      estado,
      metodo_act: 'Manual', // Automatic 'Manual' update method applied silently
      es_fuente: tipo === 'Dataset fuente',
      id_CKAN: tipo === 'Dataset CKAN' ? idCKAN : undefined,
      indicaciones: indicaciones.trim() || undefined,
      metadatos_json: finalJson,
      column: col,
      logsActualizacion: [
        {
          id: Date.now(), // Needs to be replaced with a proper ID generator
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          tipo: 'manual',
          estado: 'exito',
          mensaje: 'Elemento creado manualmente en la interfaz.'
        }
      ]
    };

    onCreate(newElement);
    onClose();
  };

// Common and specific keys derived from the metadata schema
const commonKeyNames = metadataSchema.comunes.map((field) => field.key);

const standardKeyNames = Object.keys(jsonMetadata).filter((key) => !customKeys.includes(key));

const specificKeyNames = standardKeyNames.filter((key) => !commonKeyNames.includes(key));

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-7xl w-full max-h-[98vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2 text-cyan-400">
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <h2 className="text-base font-bold text-slate-100">Crear nuevo elemento</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - 2 Columns Layout Side by Side */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col justify-between">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ================= LEFT COLUMN: INFORMACIÓN PRINCIPAL ================= */}
            <div className="space-y-4">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                1. Información principal
              </span>          
              <div>
                <label className="block text-slate-400 font-medium mb-1.5 text-xs">
                  Tipo de elemento *
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(
                    [
                      'Dataset fuente',
                      'Dataset lógico - transformación',
                      'Dataset CKAN',
                      'Visualización',
                      'Producto final'
                    ] as TipoElemento[]
                  ).map((t) => {
                    const colors: Record<TipoElemento, { active: string; inactive: string }> = {
                      'Dataset fuente': {
                        active: 'border-amber-400 bg-amber-950/40 text-amber-200 shadow-sm',
                        inactive: 'border-amber-900/50 bg-amber-950/10 text-amber-400 hover:border-amber-700'
                      },
                      'Dataset lógico - transformación': {
                        active: 'border-blue-400 bg-blue-950/40 text-blue-200 shadow-sm',
                        inactive: 'border-blue-900/50 bg-blue-950/10 text-blue-400 hover:border-blue-700'
                      },
                      'Dataset CKAN': {
                        active: 'border-orange-400 bg-orange-950/40 text-orange-200 shadow-sm',
                        inactive: 'border-orange-900/50 bg-orange-950/10 text-orange-400 hover:border-orange-700'
                      },
                      'Visualización': {
                        active: 'border-purple-400 bg-purple-950/40 text-purple-200 shadow-sm',
                        inactive: 'border-purple-900/50 bg-purple-950/10 text-purple-400 hover:border-purple-700'
                      },
                      'Producto final': {
                        active: 'border-emerald-400 bg-emerald-950/40 text-emerald-200 shadow-sm',
                        inactive: 'border-emerald-900/50 bg-emerald-950/10 text-emerald-400 hover:border-emerald-700'
                      }
                    };

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipo(t)}
                        className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                          tipo === t
                            ? `${colors[t].active} font-semibold`
                            : `${colors[t].inactive}`
                        }`}
                      >
                        <span className="text-[11px] leading-tight">{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Nombre */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="e.g. Detenciones por VdG en la provincia de Lleida"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>   
              {/* Estado */}             
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Estado *
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as EstadoElemento)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="Actualizado">Actualizado (Al día)</option>
                  <option value="Desactualizado">Desactualizado</option>
                  <option value="Permanente">Permanente</option>
                  <option value="Pendiente de acción manual">Provisional</option>
                </select>
              </div>

              {/* Indicaciones de transformación o descarga */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Indicaciones de Transformación o Descarga
                </label>
                <textarea
                  rows={7}
                  value={indicaciones}
                  onChange={(e) => setIndicaciones(e.target.value)}
                  placeholder="Pasos para acceder y descargar los datos, proceso de transformaicón, URL a un documento guía..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-[11px] leading-relaxed"
                />
              </div>

              {tipo === 'Dataset CKAN' && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <label className="block text-orange-400 font-semibold mb-1 text-xs">
                    ID dataset CKAN *
                  </label>
                  <input
                    type="text"
                    required
                    value={idCKAN}
                    onChange={(e) => setIdCKAN(e.target.value)}
                    placeholder="e.g. presupuesto-por-habitante-igualdad"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200 font-mono text-xs"
                  />
                </div>
              )}

              {tipo === 'Dataset lógico - transformación' && (
                <p className="text-[13px] text-cyan-400/90 flex items-center gap-1.5 bg-cyan-950/20 border border-cyan-800/40 p-2.5 rounded-lg">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Tip: Una vez esté creado, lo podrás conectar con un antecesor y vincular metadatos JSON.
                  </span>
                </p>
              )}
            </div>

            {/* ================= RIGHT COLUMN: METADATOS JSON ================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    2. Metadatos JSON
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Gris: Vacío · Verde: Relleno · Rojo: Extra
                  </p>
                </div>
              </div>

              {/* JSON Metadata Container (Styling mirrors the lateral menu) */}
              <div className="border border-slate-800 rounded-xl bg-slate-950/70 overflow-hidden divide-y divide-slate-800 max-h-[420px] overflow-y-auto">
                {/* 1. Common Metadata: codigo, descripcion, comentarios */}
                <div className="bg-slate-900/60 px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Metadatos comunes
                </div>
                {commonKeyNames.map((key) => {
                  const val = jsonMetadata[key] || '';
                  const isEmpty = !val.trim();
                  const keyBadgeStyle = isEmpty
                    ? 'bg-slate-900 border-slate-800 text-slate-500'
                    : 'bg-emerald-950 border-emerald-500/60 text-emerald-300';

                  return (
                    <div
                      key={key}
                      className="px-3 py-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`font-mono font-semibold text-[11px] px-2 py-0.5 rounded border transition-colors ${keyBadgeStyle}`}
                        >
                          {key}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={val}
                          placeholder={getMetadataPlaceholder(key)}
                          onChange={(e) =>
                            setJsonMetadata((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* 2. Type Specific Metadata */}
                {specificKeyNames.length > 0 && (
                  <>
                    <div className="bg-slate-900/60 px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                      Metadatos Específicos ({tipo})
                    </div>
                    {specificKeyNames.map((key) => {
                      const val = jsonMetadata[key] || '';
                      const isEmpty = !val.trim();
                      const keyBadgeStyle = isEmpty
                        ? 'bg-slate-900 border-slate-800 text-slate-500'
                        : 'bg-emerald-950 border-emerald-500/60 text-emerald-300';

                      return (
                        <div
                          key={key}
                          className="px-3 py-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 hover:bg-slate-900/40 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`font-mono font-semibold text-[11px] px-2 py-0.5 rounded border transition-colors ${keyBadgeStyle}`}
                            >
                              {key}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <input
                              type="text"
                              value={val}
                              placeholder={getMetadataPlaceholder(key)}
                              onChange={(e) =>
                                setJsonMetadata((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* 3. Custom Extra Keys */}
                {customKeys.length > 0 && (
                  <>
                    <div className="bg-slate-900/60 px-3 py-1 text-[10px] font-semibold text-rose-400 uppercase tracking-wider font-mono">
                      Metadatos Extra
                    </div>
                    {customKeys.map((key) => {
                      const val = jsonMetadata[key] || '';
                      return (
                        <div
                          key={key}
                          className="px-3 py-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 hover:bg-slate-900/40 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono font-semibold text-[11px] px-2 py-0.5 rounded border bg-rose-950 border-rose-500/60 text-rose-300">
                              {key}
                            </span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              Extra
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 flex items-center gap-1.5">
                            <input
                              type="text"
                              value={val}
                              placeholder="Valor..."
                              onChange={(e) =>
                                setJsonMetadata((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomKey(key)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded"
                              title="Eliminar este metadato extra"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Add Custom JSON Key Section */}
              <div className="p-2.5 border border-slate-800 bg-slate-950/60 rounded-xl space-y-2">
                <span className="font-semibold text-slate-300 block text-[11px]">
                  + Añadir Metadato Personalizado
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="clave (e.g. licencia)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono flex-1"
                  />
                  <input
                    type="text"
                    placeholder="valor"
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomKey}
                    className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    Añadir
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              Crear Elemento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
