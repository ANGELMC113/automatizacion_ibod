import React, { useState } from 'react';
import {
  INITIAL_ELEMENTOS,
  INITIAL_RELACIONES,
  INITIAL_ARCHIVOS,
  INITIAL_METADATOS_LINKEADOS,
  DEFAULT_METADATA_SCHEMA
} from './data/lineageData';
import {
  Elemento,
  Relacion,
  Archivo,
  MetadatoLinkeado,
  DefaultMetadataSchema,
  EstadoElemento
} from './types/lineage';
import { Header } from './components/Header';
import { CanvasGraph } from './components/CanvasGraph';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import { CatalogTable } from './components/CatalogTable';
import { ProductTableView } from './components/ProductTableView';
import { CreateElementModal } from './components/CreateElementModal';
import { DefaultMetadataConfigModal } from './components/DefaultMetadataConfigModal';
import { ConnectMetadataPromptModal } from './components/ConnectMetadataPromptModal';

export default function App() {
  const [elements, setElements] = useState<Elemento[]>(INITIAL_ELEMENTOS);
  const [relaciones, setRelaciones] = useState<Relacion[]>(INITIAL_RELACIONES);
  const [archivos, setArchivos] = useState<Archivo[]>(INITIAL_ARCHIVOS);
  const [metadatosLinkeados, setMetadatosLinkeados] = useState<MetadatoLinkeado[]>(
    INITIAL_METADATOS_LINKEADOS
  );
  const [metadataSchema, setMetadataSchema] = useState<DefaultMetadataSchema>(
    DEFAULT_METADATA_SCHEMA
  );

  // Two Selection Layers
  // Layer 1: Focused Project / Product
  const [layer1ProjectId, setLayer1ProjectId] = useState<string | null>(null);
  // Layer 2: Selected active node for lateral inspector drawer & direct connection highlights
  const [layer2NodeId, setLayer2NodeId] = useState<string | null>(null);

  // Newly created element highlight in white
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);

  // Search & Filter state
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<EstadoElemento | null>(null);
  const [currentView, setCurrentView] = useState<'graph' | 'catalog' | 'product_table'>('graph');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMetadataConfigModalOpen, setIsMetadataConfigModalOpen] = useState(false);

  // Prompt modal for linking metadata on first incoming connection
  const [promptMetadataModalData, setPromptMetadataModalData] = useState<{
    isOpen: boolean;
    sourceNode: Elemento | null;
    targetNode: Elemento | null;
    newRelId: number;
  } | null>(null);

  // Layer 1 selection handler
  const handleSelectLayer1Project = (projectId: number | null) => {
    setLayer1ProjectId(projectId);
    if (projectId) {
      setLayer2NodeId(projectId);
      setIsDrawerOpen(true);
    }
  };

  // Layer 2 selection handler (Toggles off if clicked again)
  const handleSelectLayer2Node = (nodeId: number | null) => {
    if (nodeId === null || nodeId === layer2NodeId) {
      setLayer2NodeId(null);
      setIsDrawerOpen(false);
    } else {
      setLayer2NodeId(nodeId);
      setIsDrawerOpen(true);
      const targetElem = elements.find((e) => e.id_elemento === nodeId);
      if (targetElem?.tipo === 'Producto final') {
        setLayer1ProjectId(nodeId);
      }
    }
  };

  // Center on node from drawer or catalog
  const handleCenterNode = (nodeId: number) => {
    setCurrentView('graph');
    setLayer2NodeId(nodeId);
    const targetElem = elements.find((e) => e.id_elemento === nodeId);
    if (targetElem?.tipo === 'Producto final') {
      setLayer1ProjectId(nodeId);
    }
    window.dispatchEvent(new CustomEvent('lineage:center-node', { detail: { nodeId } }));
  };

  type ElementUpdate = Partial<Elemento> & Pick<Elemento, 'id_elemento'>;
  // Update element & propagate linked metadata changes downstream
  const handleUpdateElement = (update: ElementUpdate) => {
    setElements((prev) => {
      const currentElem = prev.find(
        (e) => e.id_elemento === update.id_elemento
      );
      if (!currentElem) return prev;

      const updatedElem: Elemento = {
        ...currentElem,
        ...update
      };

      const nextElements = prev.map((e) =>
        e.id_elemento === update.id_elemento ? updatedElem : e
      );

      // Check if any downstream elements have linked metadata pointing to updatedElem
      const outgoingRels = relaciones.filter((r) => r.id_origen === updatedElem.id_elemento);
      outgoingRels.forEach((rel) => {
        const links = metadatosLinkeados.filter((m) => m.id_relacion === rel.id_relacion);
        if (links.length > 0) {
          const targetIndex = nextElements.findIndex((e) => e.id_elemento === rel.id_destino);
          if (targetIndex !== -1) {
            const targetElem = { ...nextElements[targetIndex] };
            const newTargetJson = { ...targetElem.metadatos_json };
            links.forEach((l) => {
              if (updatedElem.metadatos_json[l.metadato] !== undefined) {
                newTargetJson[l.metadato] = updatedElem.metadatos_json[l.metadato];
              }
            });
            nextElements[targetIndex] = {
              ...targetElem,
              metadatos_json: newTargetJson
            };
          }
        }
      });

      return nextElements;
    });
  };

  // Delete element and remove its relationships, links & files
  const handleDeleteElement = (id: number) => {
    setElements((prev) => prev.filter((e) => e.id_elemento !== id));

    const relsToRemove = relaciones.filter((r) => r.id_origen === id || r.id_destino === id);
    const relIdsToRemove = new Set(relsToRemove.map((r) => r.id_relacion));
    setRelaciones((prev) => prev.filter((r) => !relIdsToRemove.has(r.id_relacion)));

    setMetadatosLinkeados((prev) => prev.filter((m) => !relIdsToRemove.has(m.id_relacion)));
    setArchivos((prev) => prev.filter((a) => a.id_elemento !== id));

    if (layer2NodeId === id) {
      setLayer2NodeId(null);
      setIsDrawerOpen(false);
    }
    if (layer1ProjectId === id) {
      setLayer1ProjectId(null);
    }
    if (newlyCreatedId === id) {
      setNewlyCreatedId(null);
    }
  };

  // Delete specific connection / relationship
  const handleDeleteRelation = (sourceId: number, targetId: number) => {
    const rel = relaciones.find((r) => r.id_origen === sourceId && r.id_destino === targetId);
    if (!rel) return;

    setRelaciones((prev) => prev.filter((r) => r.id_relacion !== rel.id_relacion));
    setMetadatosLinkeados((prev) => prev.filter((m) => m.id_relacion !== rel.id_relacion));
  };

  // Connect arrow (Obsidian Canvas style)
  const handleConnectArrow = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return;

    const exists = relaciones.some((r) => r.id_origen === sourceId && r.id_destino === targetId);
    if (exists) return;

    const hadNoIncoming = !relaciones.some((r) => r.id_destino === targetId);

    const newRelId = `rel-${Date.now()}`;
    const newRel: Relacion = {
      id_relacion: newRelId,
      id_origen: sourceId,
      id_destino: targetId
    };

    setRelaciones((prev) => [...prev, newRel]);

    const sourceNode = elements.find((e) => e.id_elemento === sourceId);
    const targetNode = elements.find((e) => e.id_elemento === targetId);

    if (hadNoIncoming && sourceNode && targetNode) {
      setPromptMetadataModalData({
        isOpen: true,
        sourceNode,
        targetNode,
        newRelId
      });
    }
  };

  // Confirm metadata linking from prompt modal
  const handleConfirmMetadataLinking = (selectedKeys: string[]) => {
    if (!promptMetadataModalData) return;
    const { sourceNode, targetNode, newRelId } = promptMetadataModalData;
    if (!sourceNode || !targetNode) {
      setPromptMetadataModalData(null);
      return;
    }

    const newLinks: MetadatoLinkeado[] = [];
    const updatedTargetJson = { ...targetNode.metadatos_json };

    selectedKeys.forEach((key) => {
      newLinks.push({
        id_link: Date.now(), // Replace with proper ID gen
        id_relacion: newRelId,
        metadato: key
      });
      if (sourceNode.metadatos_json[key] !== undefined) {
        updatedTargetJson[key] = sourceNode.metadatos_json[key];
      }
    });

    setMetadatosLinkeados((prev) => [...prev, ...newLinks]);
    handleUpdateElement({
      ...targetNode,
      metadatos_json: updatedTargetJson
    });

    setPromptMetadataModalData(null);
  };

  // File management
  const handleDeleteArchivo = (idArchivo: number) => {
    setArchivos((prev) => prev.filter((a) => a.id_archivo !== idArchivo));
  };

  const handleAddArchivo = (newArchivo: Archivo) => {
    setArchivos((prev) => [newArchivo, ...prev]);
  };

  const handleSetPreviewArchivo = (idArchivo: number) => {
    const target = archivos.find((a) => a.id_archivo === idArchivo);
    if (!target) return;
    setArchivos((prev) =>
      prev.map((a) => {
        if (a.id_elemento !== target.id_elemento) return a;
        return {
          ...a,
          es_preview: a.id_archivo === idArchivo
        };
      })
    );
  };


  // Link or unlink individual metadata key in NodeDetailDrawer
  const handleUpdateLinkedMetadata = (
    elementoId: number,
    key: string,
    linkedRelId: number | null
  ) => {
    const incomingRelIds = new Set(
      relaciones
        .filter((r) => r.id_destino === elementoId)
        .map((r) => r.id_relacion)
    );

    if (linkedRelId === null) {
      // Unlink the metadata key without modifying its stored JSON value.
      setMetadatosLinkeados((prev) =>
        prev.filter(
          (m) =>
            !(incomingRelIds.has(m.id_relacion) && m.metadato === key)
        )
      );
      return;
    }

    const rel = relaciones.find(
      (r) =>
        r.id_relacion === linkedRelId &&
        r.id_destino === elementoId
    );

    if (!rel) return;

    const newLink: MetadatoLinkeado = {
      id_link: Date.now(),
      id_relacion: linkedRelId,
      metadato: key
    };

    // Keep only one link for this metadata key on this element.
    setMetadatosLinkeados((prev) => [
      ...prev.filter(
        (m) =>
          !(incomingRelIds.has(m.id_relacion) && m.metadato === key)
      ),
      newLink
    ]);

    // IMPORTANT:
    // Do not copy the ancestor's value into the child's JSON.
    // The value will be resolved dynamically when displayed.
  };


  const selectedNode = elements.find((n) => n.id_elemento === layer2NodeId) || null;

  // Filter elements for catalog if status filter is active
  const displayedElements = selectedStatusFilter
    ? elements.filter((e) => e.estado === selectedStatusFilter)
    : elements;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Bar Header with Search & Filters */}
      <Header
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatusFilter={selectedStatusFilter}
        onSelectStatusFilter={setSelectedStatusFilter}
        layer1ProjectId={layer1ProjectId}
        onSelectLayer1Project={handleSelectLayer1Project}
        elements={elements}
        onOpenCreateElement={() => setIsCreateModalOpen(true)}
        onOpenMetadataConfig={() => setIsMetadataConfigModalOpen(true)}
      />

      {/* Main Workspace View */}
      <main className="flex-1 relative overflow-hidden flex">
        {currentView === 'graph' ? (
          <CanvasGraph
            elements={elements}
            relaciones={relaciones}
            archivos={archivos}
            layer1ProjectId={layer1ProjectId}
            layer2NodeId={layer2NodeId}
            newlyCreatedId={newlyCreatedId}
            onSelectLayer1Project={handleSelectLayer1Project}
            onSelectLayer2Node={handleSelectLayer2Node}
            searchQuery={searchQuery}
            onConnectArrow={handleConnectArrow}
            onDeleteRelation={handleDeleteRelation}
          />
        ) : currentView === 'catalog' ? (
          <CatalogTable
            elements={displayedElements}
            archivos={archivos}
            selectedNodeId={layer2NodeId}
            onSelectNode={handleSelectLayer2Node}
            onSwitchToGraph={() => setCurrentView('graph')}
          />
        ) : (
          <ProductTableView
            elements={elements}
            relaciones={relaciones}
            metadataSchema={metadataSchema}
            metadatosLinkeados={metadatosLinkeados}
            layer1ProjectId={layer1ProjectId}
            onSelectLayer1Project={handleSelectLayer1Project}
            onSelectNode={handleSelectLayer2Node}
            onSwitchToGraph={() => setCurrentView('graph')}
            onUpdateElement={handleUpdateElement}
          />
        )}

        {/* Slide-out Inspector Drawer for Layer 2 */}
        {isDrawerOpen && selectedNode && (
          <NodeDetailDrawer
            node={selectedNode}
            allElements={elements}
            relaciones={relaciones}
            archivos={archivos}
            metadatosLinkeados={metadatosLinkeados}
            metadataSchema={metadataSchema}
            onClose={() => {
              setIsDrawerOpen(false);
              setLayer2NodeId(null);
            }}
            onSelectNode={(id) => handleSelectLayer2Node(id)}
            onCenterNode={handleCenterNode}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onDeleteArchivo={handleDeleteArchivo}
            onAddArchivo={handleAddArchivo}
            onSetPreviewArchivo={handleSetPreviewArchivo}
            onUpdateLinkedMetadata={handleUpdateLinkedMetadata}
            onDeleteRelation={handleDeleteRelation}
          />
        )}
      </main>

      {/* Modals */}
      <CreateElementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        metadataSchema={metadataSchema}
        onCreate={(newElem) => {
          setNewlyCreatedId(newElem.id_elemento);
          setElements((prev) => [...prev, newElem]);
          handleSelectLayer2Node(newElem.id_elemento);
          setCurrentView('graph');
        }}
      />

      <DefaultMetadataConfigModal
        isOpen={isMetadataConfigModalOpen}
        onClose={() => setIsMetadataConfigModalOpen(false)}
        schema={metadataSchema}
        onSaveSchema={(newSchema) => setMetadataSchema(newSchema)}
      />

      {/* First Arrow Metadata Linking Modal */}
      {promptMetadataModalData && (
        <ConnectMetadataPromptModal
          isOpen={promptMetadataModalData.isOpen}
          sourceNode={promptMetadataModalData.sourceNode}
          targetNode={promptMetadataModalData.targetNode}
          metadataSchema={metadataSchema}
          onConfirm={handleConfirmMetadataLinking}
          onSkip={() => setPromptMetadataModalData(null)}
        />
      )}
    </div>
  );
}
