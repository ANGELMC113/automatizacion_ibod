import React, { useState, useRef, useEffect } from 'react';
import {
  GitGraph,
  Layers,
  TableProperties,
  Settings,
  Plus,
  Search,
  Upload,
  X,
  FolderDot,
  Check,
  ChevronDown
} from 'lucide-react';
import { Elemento, EstadoElemento } from '../types/lineage';

interface Props {
  currentView: 'graph' | 'catalog' | 'product_table';
  onViewChange: (view: 'graph' | 'catalog' | 'product_table') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatusFilter: EstadoElemento | null;
  onSelectStatusFilter: (st: EstadoElemento | null) => void;
  layer1ProjectId: string | null;
  onSelectLayer1Project: (id: string | null) => void;
  elements: Elemento[];
  onOpenCreateElement: () => void;
  onOpenMetadataConfig: () => void;
}

export const Header: React.FC<Props> = ({
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  selectedStatusFilter,
  onSelectStatusFilter,
  layer1ProjectId,
  onSelectLayer1Project,
  elements,
  onOpenCreateElement,
  onOpenMetadataConfig
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const projects = elements.filter((e) => e.tipo === 'Producto final');

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statuses: EstadoElemento[] = [
    'Actualizado',
    'Desactualizado',
    'Permanente',
    'Pendiente de acción manual'
  ];

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-20 shrink-0 gap-6">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onViewChange('graph');
        }}
        className="text-base font-bold tracking-tight text-slate-100 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
      >
        Dataset manager
      </a>

      {/* Zone 2: Navigation Links & Search Dropdown */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => onViewChange('graph')}
          className={`transition-colors whitespace-nowrap flex items-center gap-1.5 py-1 ${
            currentView === 'graph'
              ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
              : 'hover:text-slate-200'
          }`}
        >
          <GitGraph className="w-3.5 h-3.5" />
          <span>Grafo</span>
        </button>

        <button
          onClick={() => onViewChange('catalog')}
          className={`transition-colors whitespace-nowrap flex items-center gap-1.5 py-1 ${
            currentView === 'catalog'
              ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
              : 'hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Catálogo</span>
        </button>

        <button
          onClick={() => onViewChange('product_table')}
          className={`transition-colors whitespace-nowrap flex items-center gap-1.5 py-1 ${
            currentView === 'product_table'
              ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
              : 'hover:text-slate-200'
          }`}
        >
          <TableProperties className="w-3.5 h-3.5" />
          <span>Tabla de producto</span>
        </button>

        

      </nav>

      {/* Zone 3: Primary Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenCreateElement}
          className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Documentar elemento</span>
        </button>

        <button
          onClick={onOpenMetadataConfig}
          className="px-3 py-1.5 text-xs text-slate-200 bg-cyan-900 hover:bg-cyan-600 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
          title="Configurar Metadatos JSON por defecto"
        >
          <Settings className="w-3.5 h-3.5 text-slate-200" />
          <span>Metadatos estándar</span>
        </button>
      </div>
    </header>
  );
};
