import React, { useState } from 'react';
import { Elemento, Archivo, TipoElemento, EstadoElemento } from '../types/lineage';
import {
  Search,
  Database,
  Layers,
  BarChart3,
  Package,
  Globe,
  FolderArchive,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  FileText
} from 'lucide-react';
import IconIndicator from './style/IconIndicator';
import { getStatusBadge } from './style/GetStatusBadge';

interface Props {
  elements: Elemento[];
  archivos: Archivo[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSwitchToGraph: () => void;
}

type SortField = 'id' | 'nombre' | 'fecha_act' | 'estado' | 'metodo';
type SortOrder = 'asc' | 'desc';

export const CatalogTable: React.FC<Props> = ({
  elements,
  archivos,
  selectedNodeId,
  onSelectNode
}) => {
  const [activeTab, setActiveTab] = useState<TipoElemento | 'all' | 'archivos'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Element lookup map
  const elementMap = new Map<string, Elemento>(elements.map((e) => [e.id_elemento, e]));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredElements = elements.filter((elem) => {
    if (activeTab !== 'all' && activeTab !== 'archivos' && elem.tipo !== activeTab) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = elem.nombre.toLowerCase().includes(q);
      const matchCode = (elem.metadatos_json.codigo || elem.id_CKAN || '').toLowerCase().includes(q);
      const matchId = elem.id_elemento.toString().includes(q);
      const matchDesc = (elem.metadatos_json.descripcion || '').toLowerCase().includes(q);
      const matchAmbito = (elem.metadatos_json.ambito || '').toLowerCase().includes(q);
      return matchName || matchCode || matchId || matchDesc || matchAmbito;
    }
    return true;
  });

  filteredElements.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'nombre') {
      comparison = a.nombre.localeCompare(b.nombre);
    } else if (sortField === 'id') {
      comparison = Number(a.id_elemento) - Number(b.id_elemento);
    } else if (sortField === 'fecha_act') {
      comparison = (a.fecha_act || '').localeCompare(b.fecha_act || '');
    } else if (sortField === 'estado') {
      comparison = (a.estado || '').localeCompare(b.estado || '');
    } else if (sortField === 'metodo') {
      const order = {
        'Automático': 1,
        'Semiautomático': 2,
        'Manual': 3
      };

      const getPriority = (value) =>
        typeof value === 'string' && value in order ? order[value] : 0;

      comparison = getPriority(a.metodo_act) - getPriority(b.metodo_act);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Filtered files for 'archivos' tab
  const filteredArchivos = archivos.filter((arc) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const parentElem = elementMap.get(arc.id_elemento);
      const matchPath = arc.path.toLowerCase().includes(q);
      const matchComms = arc.comentarios.toLowerCase().includes(q);
      const matchParent = parentElem?.nombre.toLowerCase().includes(q) ?? false;
      return matchPath || matchComms || matchParent;
    }
    return true;
  });

  const getTypeBadge = (tipo: TipoElemento) => {
    switch (tipo) {
      case 'Dataset fuente':
        return {
          label: 'Fuente',
          color: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
          icon: <Database className="w-3.5 h-3.5 text-amber-400" />
        };
      case 'Dataset lógico - transformación':
        return {
          label: 'Lógico',
          color: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
          icon: <Layers className="w-3.5 h-3.5 text-blue-400" />
        };
      case 'Dataset CKAN':
        return {
          label: 'CKAN',
          color: 'text-orange-300 bg-orange-500/10 border-orange-500/30',
          icon: <Globe className="w-3.5 h-3.5 text-orange-400" />
        };
      case 'Visualización':
        return {
          label: 'Visualización',
          color: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
          icon: <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
        };
      case 'Producto final':
        return {
          label: 'Producto Final',
          color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
          icon: <Package className="w-3.5 h-3.5 text-emerald-400" />
        };
    }
  };

  // const getStatusBadge = (estado: EstadoElemento | null) => {
  //   switch (estado) {
  //     case 'Actualizado':
  //       return <span className="text-emerald-400 font-medium font-mono text-[11px]">Actualizado</span>;
  //     case 'Desactualizado':
  //       return <span className="text-rose-400 font-medium font-mono text-[11px]">Desactualizado</span>;
  //     case 'Permanente':
  //       return <span className="text-sky-400 font-medium font-mono text-[11px]">Permanente</span>;
  //     case 'Pendiente de acción manual':
  //       return <span className="text-amber-400 font-medium font-mono text-[11px]">Pendiente manual</span>;
  //     default:
  //       return <span className="text-slate-500 font-mono text-[11px]">---</span>;
  //   }
  // };

  const renderSortArrow = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 inline ml-1 opacity-50" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-cyan-400 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400 inline ml-1" />
    );
  };

  const tabTextSize = 'text-sm';

  return (
    <div
      onClick={() => onSelectNode(null)}
      className="flex-1 overflow-y-auto p-6 w-full space-y-5"
    >
      {/* Top Title & Search */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            Catálogo de elementos y archivos
          </h2>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por nombre, ID o ruta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 w-64"
          />
        </div>
      </div>

      {/* Filter Tabs including NEW Archivos tab */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs"
      >
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Elementos ({elements.length})
        </button>

        {(
          [
            { value: 'Dataset fuente', label: 'Datasets fuente' },
            { value: 'Dataset lógico - transformación', label: 'Datasets lógicos / transformaciones' },
            { value: 'Dataset CKAN', label: 'Datasets CKAN' },
            { value: 'Visualización', label: 'Visualizaciones' },
            { value: 'Producto final', label: 'Productos' }
          ] as { value: TipoElemento; label: string }[]
        ).map(({ value, label }) => {
          const count = elements.filter((e) => e.tipo === value).length;

          return (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === value
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label} ({count})
            </button>
          );
        })}

        {/* Dedicated Archivos Tab */}
        <button
          onClick={() => setActiveTab('archivos')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ml-2 ${
            activeTab === 'archivos'
              ? 'bg-yellow-500/20 text-white-300 border border-white-500/40 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5 text-yellow-400" />
          <span>Archivos ({archivos.length})</span>
        </button>
      </div>

      {/* Main Table Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="border border-slate-800 rounded-xl bg-slate-950 shadow-xl overflow-hidden"
      >
        {activeTab === 'archivos' ? (
          /* Archivos Specific Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-800 min-w-[850px]">
              <thead className="bg-slate-900/90 text-slate-300 uppercase font-mono text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Nombre del Archivo</th>
                  <th className="px-4 py-3.5">Elemento Asociado</th>
                  <th className="px-4 py-3.5 w-32">Tipo Elemento</th>
                  <th className="px-4 py-3.5 w-24">Formato</th>
                  <th className="px-4 py-3.5 w-28">Fecha Subida</th>
                  <th className="px-4 py-3.5 w-24">Tamaño</th>
                  <th className="px-4 py-3.5 w-28">Vigencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredArchivos.map((arc) => {
                  const parent = elementMap.get(arc.id_elemento);
                  const isSelected = parent && parent.id_elemento === selectedNodeId;
                  const filename = arc.path.split('/').pop() || arc.path;
                  const badge = parent ? getTypeBadge(parent.tipo) : null;

                  return (
                    <tr
                      key={arc.id_archivo}
                      onClick={() => {
                        if (parent) {
                          // Toggle selection: deselect if already selected
                          if (selectedNodeId === parent.id_elemento) {
                            onSelectNode(null);
                          } else {
                            onSelectNode(parent.id_elemento);
                          }
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-yellow-950/40 border-2 border-yellow-400'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-100 font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div>
                            <span
                              className="font-semibold text-slate-200 hover:text-cyan-300 font-mono"
                              title={`Ruta completa: ${arc.path}`}
                            >
                              {filename}
                            </span>
                            <div
                              className="text-[11px] text-slate-400 truncate max-w-md font-mono cursor-help"
                              title={arc.path}
                            >
                              {arc.path}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-200">
                        <span className="font-medium text-slate-100">
                          {parent?.nombre || 'Elemento no encontrado'}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          #{arc.id_elemento.toString()}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {badge && (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border font-medium ${badge.color}`}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] uppercase text-slate-300">
                        {arc.formato}
                      </td>

                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {arc.fecha}
                      </td>

                      <td className="px-4 py-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {arc.tamano || '---'}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {arc.up_to_date ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Al día</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                            <X className="w-3 h-3 stroke-[3]" />
                            <span>Desactualizado</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Elements Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-800 min-w-[900px]">
              <thead className="bg-slate-900/90 text-slate-300 uppercase font-mono text-[11px]">
                <tr>
                  <th
                    onClick={() => handleSort('id')}
                    className="px-4 py-3.5 cursor-pointer hover:text-cyan-400 transition-colors select-none w-28"
                  >
                    <span>ID</span>
                    {renderSortArrow('id')}
                  </th>
                  <th
                    onClick={() => handleSort('nombre')}
                    className="px-4 py-3.5 cursor-pointer hover:text-cyan-400 transition-colors select-none"
                  >
                    <span>Nombre y descripción</span>
                    {renderSortArrow('nombre')}
                  </th>
                  <th className="px-4 py-3.5 select-none w-44">Tipo</th>
                  <th
                    onClick={() => handleSort('fecha_act')}
                    className="px-4 py-3.5 cursor-pointer hover:text-cyan-400 transition-colors select-none w-32"
                  >
                    <span>Última Act.</span>
                    {renderSortArrow('fecha_act')}
                  </th>
                  <th
                    onClick={() => handleSort('estado')}
                    className="px-4 py-3.5 cursor-pointer hover:text-cyan-400 transition-colors select-none w-36"
                  >
                    <span>Estado</span>
                    {renderSortArrow('estado')}
                  </th>
                                    <th
                    onClick={() => handleSort('metodo')}
                    className="px-4 py-3.5 cursor-pointer hover:text-cyan-400 transition-colors select-none w-36"
                  >
                    <span>Método</span>
                    {renderSortArrow('metodo')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredElements.map((elem) => {
                  const badge = getTypeBadge(elem.tipo);
                  const statusBadge = getStatusBadge(elem.estado);
                  const idClean = elem.id_elemento.toString();
                  const codigo = elem.metadatos_json.codigo || elem.id_CKAN || '';
                  const isSelected = elem.id_elemento === selectedNodeId;

                  return (
                    <tr
                      key={elem.id_elemento}
                      onClick={() => {
                        // Toggle selection: deselect if already selected
                        if (selectedNodeId === elem.id_elemento) {
                          onSelectNode(null);
                        } else {
                          onSelectNode(elem.id_elemento);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-950/40 border-2 border-cyan-400'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono whitespace-nowrap">
                        <span className="text-cyan-300 font-bold block">#{idClean}</span>
                        {codigo && <span className="text-[10px] text-slate-400">{codigo}</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-100">
                        <div className="font-semibold text-slate-100">
                          {elem.nombre}
                        </div>
                        {elem.metadatos_json.descripcion && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5 max-w-xl">
                            {elem.metadatos_json.descripcion}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border font-medium ${badge.color}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap text-[11px]">
                        {elem.fecha_act || '---'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border font-medium ${statusBadge.bg}`}
                        >
                          {statusBadge.icon}
                          <span>{statusBadge.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {elem.metodo_act || '-'}
                          <IconIndicator type="method" value={elem.metodo_act} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
