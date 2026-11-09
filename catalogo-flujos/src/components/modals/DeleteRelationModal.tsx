import { Trash2 } from 'lucide-react';

interface DeleteRelationModalProps {
  sourceName: string;
  targetName: string;
  sourceId: string;
  targetId: string;
  onConfirm: (sourceId: string, targetId: string) => void;
  onCancel: () => void;
}

export default function DeleteRelationModal({
  sourceName,
  targetName,
  sourceId,
  targetId,
  onConfirm,
  onCancel,
}: DeleteRelationModalProps) {
  return (
    <div
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto"
    >
        <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 text-rose-400">
          <Trash2 className="w-6 h-6 shrink-0" />
          <h3 className="text-lg font-bold text-slate-100">
            ¿Eliminar esta relación?
          </h3>
        </div>

        {/* Message */}
        <div className="text-base text-slate-300 leading-relaxed text-center space-y-2">
        <p className="text-slate-100 font-medium">{sourceName}</p>

        <div className="flex justify-center">
            <span className="text-rose-400 text-xl leading-none">↓</span>
        </div>

        <p className="text-slate-100 font-medium">{targetName}</p>

        <p className="pt-2">
            Se eliminará la conexión y se desvincularán los metadatos.
        </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={() => {
                onCancel();
                onConfirm(sourceId, targetId);
            }}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
            Sí, eliminar relación
            </button>
        </div>
      </div>
    </div>
  );
}