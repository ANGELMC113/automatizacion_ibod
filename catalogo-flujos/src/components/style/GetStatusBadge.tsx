import IconIndicator from './IconIndicator';

export const getStatusBadge = (estado) => {
  switch (estado) {
    case 'Actualizado':
      return {
        label: 'Actualizado',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: <IconIndicator type="status" value="Actualizado" />,
      };

    case 'Desactualizado':
      return {
        label: 'Desactualizado',
        color: 'text-rose-400',
        bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: <IconIndicator type="status" value="Desactualizado" />,
      };

    case 'Permanente':
      return {
        label: 'Permanente',
        color: 'text-sky-400',
        bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        icon: <IconIndicator type="status" value="Permanente" />,
      };

    case 'Provisional':
      return {
        label: 'Provisional',
        color: 'text-purple-400',
        bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        icon: <IconIndicator type="status" value="Provisional" />,
      };

    case 'Pendiente de acción manual':
      return {
        label: 'Pendiente de acción manual',
        color: 'text-amber-400',
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: (
          <IconIndicator
            type="status"
            value="Pendiente de acción manual"
          />
        ),
      };

    default:
      return {
        label: 'No definido',
        color: 'text-slate-400',
        bg: 'bg-slate-800 text-slate-400 border-slate-700',
        icon: <IconIndicator type="status" value={null} />,
      };
  }
};