
import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { EstadoElemento } from '../../types/lineage';
import { AlertTriangle } from 'lucide-react';

interface StatusBadge {
  icon: ReactNode;
  label: string;
  bg: string;
}

interface StatusElement {
  id_elemento: string;
  estado: EstadoElemento;
  metodo_act?: string | null;
  [key: string]: unknown;
}

interface StatusPickerProps {
  node: StatusElement;
  onUpdateElement: (node: StatusElement) => void;
  getStatusBadge: (status: EstadoElemento) => StatusBadge;
  options?: EstadoElemento[];
  disabled?: boolean;
}

const DEFAULT_STATUSES: EstadoElemento[] = [
  'Actualizado',
  'Desactualizado',
  'Permanente',
  'Provisional',
];

export default function StatusPicker({
  node,
  onUpdateElement,
  getStatusBadge,
  options = DEFAULT_STATUSES,
  disabled = false,
}: StatusPickerProps) {
  const [open, setOpen] = useState(false);
  const [pendingStatus, setPendingStatus] =
    useState<EstadoElemento | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentBadge = getStatusBadge(node.estado);

  const handleStatusChangeRequest = (newStatus: EstadoElemento) => {
    setOpen(false);

    if (node.metodo_act && node.metodo_act !== 'Manual') {
      alert(
        `Este elemento tiene método '${node.metodo_act}'. ` +
        'Su estado se gestiona mediante pipelines automáticos.'
      );
      return;
    }

    if (node.estado === newStatus) return;

    if (
      node.estado === 'Actualizado' &&
      newStatus === 'Desactualizado'
    ) {
      setPendingStatus(newStatus);
      return;
    }

    onUpdateElement({ ...node, estado: newStatus });
  };

  const confirmStatusChange = () => {
    if (!pendingStatus) return;

    const newStatus = pendingStatus;
    setPendingStatus(null);

    onUpdateElement({ ...node, estado: newStatus });
  };

  // Keep the existing floating-menu positioning and
  // outside-click/Escape handling here.

  return (
    <>
        <div className="relative">
        <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            title={`Cambiar estado (actual: ${currentBadge.label})`}
            aria-haspopup="listbox"
            aria-expanded={open}
        >
            <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${currentBadge.bg}`}
            >
            {currentBadge.icon}
            <span className="ml-1">{currentBadge.label}</span>
            </span>
        </button>

        {open && (
            <div
            ref={menuRef}
            role="listbox"
            aria-label="Seleccionar estado"
            className="absolute left-0 top-full z-50 mt-2 min-w-44 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-2xl"
            >
            {options.map((status) => {
                const badge = getStatusBadge(status);
                const isSelected = node.estado === status;

                return (
                <button
                    key={status}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleStatusChangeRequest(status)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors ${
                    isSelected
                        ? 'bg-slate-800 text-cyan-300'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                >
                    <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 ${badge.bg}`}
                    >
                    {badge.icon}
                    </span>

                    <span className="flex-1">{badge.label}</span>

                    {isSelected && (
                    <span className="text-cyan-400">✓</span>
                    )}
                </button>
                );
            })}
            </div>
        )}
        </div>

        {pendingStatus &&
            createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="status-confirm-title"
                    aria-describedby="status-confirm-description"
                    className="w-full max-w-md space-y-4 rounded-xl border border-amber-500/40 bg-slate-900 p-5 shadow-2xl"
                >
                    <div className="flex items-center gap-3 text-amber-400">
                    <AlertTriangle className="h-6 w-6 shrink-0" />

                    <h2
                        id="status-confirm-title"
                        className="text-sm font-bold text-slate-100"
                    >
                        Advertencia de propagación de desactualización
                    </h2>
                    </div>

                    <p
                    id="status-confirm-description"
                    className="text-xs leading-relaxed text-slate-300"
                    >
                    ¿Quieres cambiar este elemento de{' '}
                    <strong className="font-semibold text-emerald-300">
                        Actualizado
                    </strong>{' '}
                    a{' '}
                    <strong className="font-semibold text-amber-400">
                        Desactualizado
                    </strong>
                    ? Este cambio puede propagarse en cascada a los elementos
                    relacionados que dependan de él [función aún no implementada].
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setPendingStatus(null)}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-700"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={confirmStatusChange}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-500"
                    >
                        Confirmar y propagar
                    </button>
                    </div>
                </div>
                </div>,
                document.body
            )}
    </>
    );
}