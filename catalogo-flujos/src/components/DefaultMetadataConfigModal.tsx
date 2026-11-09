import React, { useState } from 'react';
import { DefaultMetadataSchema, MetadataFieldDefinition } from '../types/lineage';
import { Settings, X, Plus, Trash2, ArrowUp, ArrowDown, Check, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schema: DefaultMetadataSchema;
  onSaveSchema: (newSchema: DefaultMetadataSchema) => void;
}

type TabType = 'comunes' | 'datasets' | 'datasets_fuente' | 'visualizaciones' | 'productos';

export const DefaultMetadataConfigModal: React.FC<Props> = ({
  isOpen,
  onClose,
  schema,
  onSaveSchema
}) => {
  if (!isOpen) return null;

  const [currentTab, setCurrentTab] = useState<TabType>('comunes');
  const [localSchema, setLocalSchema] = useState<DefaultMetadataSchema>({
    comunes: [...schema.comunes],
    datasets: [...schema.datasets],
    datasets_fuente: [...schema.datasets_fuente],
    visualizaciones: [...schema.visualizaciones],
    productos: [...schema.productos]
  });

  const [newKey, setNewKey] = useState('');
  const [newComment, setNewComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forbid " and \
  const isValidJsonKey = (key: string): boolean => {return !/["\\]/.test(key)};

  const handleAddKey = () => {
    const trimmedKey = newKey.trim();
    if (!trimmedKey) {
      setErrorMessage('La clave no puede estar vacía.');
      return;
    }

    if (!isValidJsonKey(trimmedKey)) {
      setErrorMessage('Formato inválido: la clave JSON no puede contener comillas dobles (") ni barras invertidas (\\).');
      return;
    }

    const currentList = localSchema[currentTab];
    if (currentList.some((f) => f.key.toLowerCase() === trimmedKey.toLowerCase())) {
      setErrorMessage(`La clave '${trimmedKey}' ya existe en esta categoría (mayúsculas ignoradas).`);
      return;
    }

    const newField: MetadataFieldDefinition = {
      key: trimmedKey,
      comentario: newComment.trim()
    };

    setLocalSchema({
      ...localSchema,
      [currentTab]: [...currentList, newField]
    });

    setNewKey('');
    setNewComment('');
    setErrorMessage(null);
  };

  const handleDeleteKey = (index: number) => {
    const updated = localSchema[currentTab].filter((_, i) => i !== index);
    setLocalSchema({ ...localSchema, [currentTab]: updated });
  };

  const handleMoveKey = (index: number, direction: 'up' | 'down') => {
    const list = [...localSchema[currentTab]];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    setLocalSchema({ ...localSchema, [currentTab]: list });
  };

  const handleFieldChange = (
    index: number,
    field: 'display' | 'comentario',
    val: string
  ) => {
    const list = [...localSchema[currentTab]];
    list[index] = { ...list[index], [field]: val };
    setLocalSchema({ ...localSchema, [currentTab]: list });
  };

  const handleSave = () => {
    onSaveSchema(localSchema);
    onClose();
  };

  const tabs: Array<{ id: TabType; label: string; count: number }> = [
    { id: 'comunes', label: '1. Comunes para todos los elementos', count: localSchema.comunes.length },
    { id: 'datasets', label: '2. Datasets (fuente y lógicos)', count: localSchema.datasets.length },
    { id: 'datasets_fuente', label: '3. Extras para datasets fuente', count: localSchema.datasets_fuente.length },
    { id: 'visualizaciones', label: '4. Visualizaciones', count: localSchema.visualizaciones.length },
    { id: 'productos', label: '5. Productos finales', count: localSchema.productos.length }
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-7xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Configuración de metadatos JSON principales
              </h2>
              <p className="text-sm text-slate-300">
                Define las claves estándar recomendadas para documentar elementos. Se podrán linkear y se mostrarán en color verde.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center border-b border-slate-800 text-sm px-4 bg-slate-950/30 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setCurrentTab(tab.id);
                setErrorMessage(null);
              }}
              className={`py-3 px-3.5 font-medium transition-colors border-b-2 whitespace-nowrap ${
                currentTab === tab.id
                  ? 'border-cyan-400 text-cyan-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400 font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-200">
          {/* Add Key Form */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <span className="font-semibold text-slate-200 block">
              + Añadir nuevo metadato a: {tabs.find((t) => t.id === currentTab)?.label}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">Clave JSON (Identificador)</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => {
                    setNewKey(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. tipo_licencia"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">Comentario Explicativo</label>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Descripción del campo..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-rose-400 text-[11px] bg-rose-950/30 p-2 rounded border border-rose-900">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddKey}
                className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded font-semibold transition-colors"
              >
                Agregar metadato la lista
              </button>
            </div>
          </div>

          {/* Formatted Table for Configured Keys */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <table className="w-full text-left text-xs">
              {/* Table Header with thick divider */}
              <thead className="bg-slate-900 border-b-2 border-slate-700 text-slate-300 font-mono uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3 w-48">Clave JSON</th>
                  <th className="px-4 py-3">Comentario</th>
                  <th className="px-4 py-3 w-28 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {localSchema[currentTab].map((field, idx) => (
                  <tr key={field.key} className="hover:bg-slate-900/30 transition-colors">
                    {/* Clave JSON */}
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className="font-mono text-emerald-300 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                        {field.key}
                      </span>
                    </td>

                    {/* Comentario (flexible height textarea) */}
                    <td className="px-4 py-2.5 align-top">
                      <textarea
                        rows={1}
                        value={field.comentario}
                        onChange={(e) => handleFieldChange(idx, 'comentario', e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none resize-y min-h-[30px]"
                      />
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleMoveKey(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300"
                          title="Mover arriba"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveKey(idx, 'down')}
                          disabled={idx === localSchema[currentTab].length - 1}
                          className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300"
                          title="Mover abajo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteKey(idx)}
                          className="p-1 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 rounded ml-1"
                          title="Eliminar de la lista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-lg transition-colors shadow-sm"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};
