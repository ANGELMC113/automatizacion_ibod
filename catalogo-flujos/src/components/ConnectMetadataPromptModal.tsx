import React, { useState } from 'react';
import { Elemento, DefaultMetadataSchema } from '../types/lineage';
import { X, ArrowRight, Link, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  sourceNode: Elemento | null;
  targetNode: Elemento | null;
  metadataSchema: DefaultMetadataSchema;
  onConfirm: (selectedKeys: string[]) => void;
  onSkip: () => void;
}

export const ConnectMetadataPromptModal: React.FC<Props> = ({
  isOpen,
  sourceNode,
  targetNode,
  metadataSchema,
  onConfirm,
  onSkip
}) => {
  
  // Only allow connections between source and logic datasets
  const isDatasetConnection =
  (sourceNode.tipo === 'Dataset fuente' ||
    sourceNode.tipo === 'Dataset lógico - transformación') &&
    targetNode.tipo === 'Dataset lógico - transformación';

  if (!isOpen || !sourceNode || !targetNode || !isDatasetConnection) return null;

  // Ww will throw a warning in case of overwrite
  const [showOverwriteConfirmation, setShowOverwriteConfirmation] =
  useState(false);

  // Determine standard keys relevant for the target node
  const relevantKeys = new Set<string>();
  metadataSchema.comunes.forEach((c) => relevantKeys.add(c.key));
  metadataSchema.datasets.forEach((d) => relevantKeys.add(d.key));

  const keyList = Array.from(relevantKeys).filter((k) => k !== 'codigo');

  // By default, select keys where target is empty and source has a value
  const initialSelected = keyList.filter((k) => {
    const targetVal = targetNode.metadatos_json[k] || '';
    const sourceVal = sourceNode.metadatos_json[k] || '';
    return !targetVal.trim() && Boolean(sourceVal.trim());
  });

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(initialSelected));

  const keysToOverwrite = keyList.filter((key) => {
    if (!selectedKeys.has(key)) return false;

    const sourceValue = sourceNode.metadatos_json[key] ?? '';
    const targetValue = targetNode.metadatos_json[key] ?? '';

    return sourceValue.trim() !== '' && targetValue.trim() !== ''; // WHY IS SOURCE USED?
  });

  const hasOverwrites = keysToOverwrite.length > 0;

  const handleConfirmClick = () => {
    if (hasOverwrites) {
      setShowOverwriteConfirmation(true);
      return;
    }

    onConfirm(Array.from(selectedKeys));
  };

  const toggleKey = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const toggleAll = () => {
    if (selectedKeys.size === keyList.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(keyList));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-blue-500/40 rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-blue-950/20">
          <div className="flex items-center gap-2 text-blue-400">
            <Link className="w-5 h-5 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-100">
                ¿Vincular metadatos JSON?
              </h2>
              <p className="text-sm text-slate-300">
                Has establecido la primera aconexión desde <strong>{sourceNode.nombre}</strong> a <strong>{targetNode.nombre}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs text-slate-200">
          <div className="flex items-center justify-between text-slate-300">
            <span>
              Los metadatos vinculados solo se podrán modificar desde el origen.
            </span>
            <button
              onClick={toggleAll}
              className="text-cyan-400 hover:underline font-medium"
            >
              {selectedKeys.size === keyList.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950">
            <table className="w-full text-left text-[11px] divide-y divide-slate-800 font-mono">
              <thead className="bg-slate-900/90 text-slate-300">
                <tr>
                  <th className="px-3 py-2 w-10 text-center">Link</th>
                  <th className="px-3 py-2 text-slate-400">Metadato</th>
                  <th className="px-3 py-2 text-blue-400">Valor en origen</th>
                  <th className="px-3 py-2 text-slate-400">Valor actual en destino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {keyList.map((k) => {
                  const srcVal = sourceNode.metadatos_json[k] || '';
                  const tgtVal = targetNode.metadatos_json[k] || '';
                  const isChecked = selectedKeys.has(k);

                  return (
                    <tr
                      key={k}
                      onClick={() => toggleKey(k)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-950/20 hover:bg-blue-950/30' : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleKey(k)}
                          className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-200 whitespace-nowrap">
                        {k}
                      </td>
                      <td className="px-3 py-2 font-mono text-blue-300 max-w-[200px] truncate">
                        {srcVal || <span className="text-slate-600 italic">(Vacío en origen)</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-400 max-w-[200px] truncate">
                        {isChecked && srcVal ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-cyan-400 inline" />
                            <span>{srcVal}</span>
                          </span>
                        ) : (
                          tgtVal || <span className="text-slate-600 italic">(Vacío)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={onSkip}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-xs transition-colors"
          >
            Omitir (linkear más tarde)
          </button>
          <button
            onClick={handleConfirmClick}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Link className="w-3.5 h-3.5" />
            <span>
              Linkear metadatos seleccionados ({selectedKeys.size})
            </span>

            {hasOverwrites && (
              <AlertTriangle
                className="w-4 h-4 text-red-600 ml-1"
                aria-label="Se sobrescribirán metadatos existentes"
              />
            )}
          </button>
        </div>
        {showOverwriteConfirmation && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-slate-950/95 z-10 flex items-center justify-center p-4 rounded-xl"
          >
            <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-slate-100">
                  ¿Sobrescribir metadatos existentes?
                </h3>
              </div>

              <div className="text-sm text-slate-300 leading-relaxed space-y-3">
                <p>
                  Algunos metadatos seleccionados ya tienen valores en el destino.
                </p>

                <div className="bg-rose-950/30 border border-rose-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-slate-100 font-medium">
                    {sourceNode.nombre}
                    <ArrowRight className="w-4 h-4 inline mx-2 text-rose-400" />
                    {targetNode.nombre}
                  </p>

                  <p className="text-rose-300 text-xs font-medium">
                    Metadatos que se sobrescribirán: {keysToOverwrite.length}
                  </p>

                  <ul className="list-disc pl-5 text-xs text-slate-300 space-y-1">
                    {keysToOverwrite.map((key) => (
                      <li key={key}>{key}</li>
                    ))}
                  </ul>
                </div>

                <p className="text-rose-300">
                  Esta acción reemplazará los valores actuales de destino y vinculará
                  los metadatos seleccionados.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowOverwriteConfirmation(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Volver
                </button>

                <button
                  onClick={() => {
                    setShowOverwriteConfirmation(false);
                    onConfirm(Array.from(selectedKeys));
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Sí, sobrescribir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    
  );
};
