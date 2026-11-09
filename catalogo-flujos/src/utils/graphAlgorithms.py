# Currently it has some classes of linage.ts too

# The typescript version is similar, but includes some changes ChatGPT made.
    # We will integrate them here if convenient

from collections import defaultdict, deque
from dataclasses import dataclass, field, fields
from datetime import date
from enum import Enum, StrEnum
from typing import Optional, Literal

# linage.ts --------------------------------------------------------------------

"""
When using class ...(str, Enum) we can:

tipo = TipoElemento.DATASET_FUENTE

print(tipo)                         # -> TipoElemento.DATASET_FUENTE
print(tipo.value)                   # -> Dataset fuente
print(tipo == "Dataset fuente")     # -> True

"""

class TipoElemento(StrEnum):
    DS_FUENTE = "Dataset fuente"
    DS_LOGICO = "Dataset lógico - transformación"
    DS_CKAN = "Dataset CKAN"
    VIS = "Visualización"
    PROD = "Producto final"


class EstadoElemento(StrEnum):
    ACT = "Actualizado"
    DESACT = "Desactualizado"
    PERMA = "Permanente"
    PROVI = "Provisional"
    PEND = "Pendiente de acción manual"


class MetodoActualizacion(StrEnum):
    AUTO = "Automático"
    SEMI = "Semiautomático"
    MANUAL = "Manual"


@dataclass
class LogActualizacion:
    id: int
    timestamp: str
    tipo: Literal[
        "manual",
        "programada",
        "cascada",
    ]
    estado: Literal[
        "exito",
        "error",
        "en_progreso",
    ]
    mensaje: str
    archivoInvolucrado: Optional[str] = None



@dataclass
class Elemento:
    id_elemento: int
    tipo: TipoElemento
    nombre: str
    fecha_act: str  # YYYY-MM-DD
    estado: Optional[EstadoElemento]

    # Subtype datasets (fuente & lógico)
    es_fuente: Optional[bool] = None
    metodo_act: Optional[MetodoActualizacion] = None
    indicaciones: Optional[str] = None

    # Subtype CKAN
    id_CKAN: Optional[str] = None

    # Metadatos JSON (flat key: value)
    metadatos_json: dict[str, str] = field(default_factory=dict)

    # Automatizaciones
    logsActualizacion: Optional[list[LogActualizacion]] = None


@dataclass
class Relacion:
    id_relacion: int
    id_origen: int
    id_destino: int



# graphAlgorithms.ts -----------------------------------------------------------

DEFAULT_NODE_WIDTH = 220
DEFAULT_NODE_HEIGHT = 155 #75

ROW_GAP = 40

DEFAULT_COL_WIDTH = 300

DEFAULT_COL_GAP = 70
FINAL_COL_GAP = 300


# Some of these types should be standardized and the frontend must obey the defined structure.

@dataclass
class PositionedNode(Elemento):
    x: int
    y: int
    width: int
    height: int
    isDimmed: Optional[bool] = None
    isNewlyCreated: Optional[bool] = None


@dataclass
class ColumnBorder:
    x: float
    width: float
    title: str
    color: str
    colIndex: int


class ColumnNumber(Enum):
    NOT_ASSIGNED = 0 # For logical and CKAN datasets
    DS_FUENTE = -1
    VIS = -2
    PROD = -3


def compute_graph_layout(
    elements: list[Elemento],
    relaciones: list[Relacion],
    layer1_project_id: Optional[int],
    newly_created_id: Optional[int] = None,
    sort_criterion: Literal[
        "default",
    ] = "default",
) -> tuple[
    list[PositionedNode],
    list[ColumnBorder],
    int,                        # Total width
    int                         # Total height
]:
    """
    Compute the graph layout for the supplied elements and relationships.

    Args:
        elements: List of graph elements.
        relaciones: List of relationships between elements.
        layer1_project_id: Project ID for layer 1, or None.
        newly_created_id: ID of a newly created element, or None.
        sort_criterion: Criterion used to sort elements.

    Returns:
        The computed graph layout.
    """

    # Preocumpute element, ancestor and descendant lookups

    position_nodes_by_id = {
        node.id_elemento: node for node in [
            PositionedNode(
                **{f.name: getattr(el, f.name) for f in fields(Elemento)},
                x=0,
                y=0,
                width=DEFAULT_NODE_WIDTH,
                height=DEFAULT_NODE_HEIGHT,
                isDimmed=False
            )
            for el in elements
        ]
    }
    # Rows: as many as we want
    # Columns: as many as we want, but with special cases

    element_ids: set = position_nodes_by_id.keys()

    ancestors_ids: dict[int, list[int]] = defaultdict(list)
    descendants_ids: dict[int, list[int]] = defaultdict(list)

    for rel in relaciones:
        descendants_ids[rel.id_origen].append(rel.id_destino)
        ancestors_ids[rel.id_destino].append(rel.id_origen)


    # Gather all RELATED visualizations and sort them alphabetically

    if layer1_project_id is not None:
        # We first want visualizations used in this project

        # We need the list of related visualizations
        ids_vis_rel_to_selected_prod: list[int] = ancestors_ids[layer1_project_id]

        # We then will use unrelated visualizations
        vis_ids = [
            el.id_elemento for el in sorted(
                (el for el in elements if el.tipo == TipoElemento.VIS),
                key=lambda elemento: (
                    elemento.id_elemento not in ids_vis_rel_to_selected_prod,
                    elemento.nombre.lower()
                )
            )
        ]
    else:
        # If no product is selected, we want all visualizations 
        vis_ids = [
            el.id_elemento for el in sorted(
                (el for el in elements if el.tipo == TipoElemento.VIS),
                key = lambda elemento: elemento.nombre.lower()
            )
        ]
    # vis_ids are the visualization ids properly sorted
            

    # Each visualization starts in its own row

    visited = {id_el: False for id_el in element_ids}
        # To visit means to look at the neighbors

    placed = {id_el: id_el in vis_ids for id_el in element_ids}
        # To place means to give x and y
        # Visualizations are placed, but not visited
   
    #ids_by_row: dict[int, list[int]] = {i: [vis_ids[i]] for i in range(len(vis_ids))}
    for row, vis_id in enumerate(vis_ids):
        position_nodes_by_id[vis_id].x = ColumnNumber.VIS
        position_nodes_by_id[vis_id].y = row
        

    # Products will be placed in the middle of their visualizations Ys ((top - bottom) / 2)
        # So we have to place datasets now (datasets fuente will never be the starting point of the DFS exploration)


    ds_ckan_ids = [
        el.id_elemento for el in sorted(
            (el for el in elements if el.tipo == TipoElemento.DS_CKAN),
            key=lambda el: el.nombre.lower()
        )
    ]

    ds_logico_ids = [
        el.id_elemento for el in sorted(
            (el for el in elements if el.tipo == TipoElemento.DS_LOGICO),
            key=lambda el: el.nombre.lower()
        )
    ]

    ds_fuente_ids = [
        el.id_elemento for el in sorted(
            (el for el in elements if el.tipo == TipoElemento.DS_FUENTE),
            key=lambda el: el.nombre.lower()
        )
    ]

    # We want to connect elements to already placed elements

    id_queue = deque(vis_ids + ds_ckan_ids + ds_logico_ids + ds_fuente_ids)
    # We will perform a DFS from each of these elements

    while id_queue:
        id_el = id_queue.popleft()
        if not visited[id_el]: # We gain nothing by looking at neighbors again
            visited[id_el] = True

            if not placed[id_el]:
                # This element has not been placed.
                    # When we get here, we will have already visited all visualizations and direct 1:1 relationships.

                    # So we can then dim it if a project has been selected
                        # We used to dim elements exclusive to other products, but this is a good simplification
                if layer1_project_id is not None:
                    position_nodes_by_id[id_el].isDimmed = True

                    # But we may still find more 1:1 relationships in unconnected components.
                    # We force the machine to keep working by greedily adding missing elements.

                # We need to put this item at the left of its descendants
                if len([position_nodes_by_id[id_descendant] for id_descendant in descendants_ids[id_el]]) > 0:
                    position_nodes_by_id[id_el].x = min(position_nodes_by_id[id_elem].x for id_elem in descendants_ids[id_el]) + 1
                else:
                    position_nodes_by_id[id_el].x = ColumnNumber.NOT_ASSIGNED

                # We want it close to the rows of its descendants
                    # But for now we will simply use a new row
                position_nodes_by_id[id_el].y = max(position_nodes_by_id[id_elem].y for id_elem in element_ids) + 1

            # We know this element has not been visited, but it has been placed
                # Thus it has a y
            current_row = position_nodes_by_id[id_el].y

            ancestor_id = ancestors_ids[id_el][0]

            # # If the element only has one ancestor
            # if len(ancestors_ids[id_el]) == 1:

            #     # If that ancestor only has one descendant
            #     if len(descendants_ids[ancestor_id]) == 1:

            #         # This is a 1:1 relationship
            #         assert(descendants_ids[ancestor_id][0] == id_el)
            #         assert(not placed[ancestor_id])

            # We can always place one of ancestors in the same row. The rest will placed greedily later.

            if len(ancestors_ids[id_el]) > 0:

                position_nodes_by_id[ancestor_id].y = current_row

                # position_nodes_by_id[ancestor_id].tipo can't be VIS nor PROD
                if position_nodes_by_id[ancestor_id].tipo == TipoElemento.DS_FUENTE:
                    position_nodes_by_id[ancestor_id].x = ColumnNumber.DS_FUENTE
                elif position_nodes_by_id[ancestor_id].tipo in (TipoElemento.DS_CKAN, TipoElemento.DS_LOGICO):
                    position_nodes_by_id[ancestor_id].x = ColumnNumber.NOT_ASSIGNED

                # If we are visiting a logical or CKAN dataset, we have move one column to the left
                if position_nodes_by_id[id_el].tipo in (TipoElemento.DS_CKAN, TipoElemento.DS_LOGICO):
                    position_nodes_by_id[ancestor_id].x = position_nodes_by_id[id_el].x + 1
        
                placed[ancestor_id] = True

                # And we can keep exploring the neighbors of this ancestor. We use appendleft to perform the DFS
                id_queue.appendleft(ancestor_id)


    # Convert columns and rows to true x and y positions
        # We need to take into account the different sizes of the elements accordint to their type

    n_logic_ckan_cols = max(position_nodes_by_id[id_el].x for id_el in element_ids)

    z = 0 # Simple row
    for id_el in position_nodes_by_id.keys():

        if position_nodes_by_id[id_el].tipo == TipoElemento.PROD:
            # Column to x
            position_nodes_by_id[id_el].x = (DEFAULT_COL_WIDTH + DEFAULT_COL_GAP) * (n_logic_ckan_cols + 2)
            # Row to y
            position_nodes_by_id[id_el].y = (DEFAULT_NODE_HEIGHT + ROW_GAP) * (z)
            z += 1

        else:

            # Column to x
            match position_nodes_by_id[id_el].x:
                case ColumnNumber.DS_FUENTE:
                    position_nodes_by_id[id_el].x = 0
                case ColumnNumber.VIS:
                    position_nodes_by_id[id_el].x = (DEFAULT_COL_WIDTH + DEFAULT_COL_GAP) * (n_logic_ckan_cols + 1)
                case _:
                    position_nodes_by_id[id_el].x = (DEFAULT_COL_WIDTH + DEFAULT_COL_GAP) * n_logic_ckan_cols

            # Row to y
            position_nodes_by_id[id_el].y = (DEFAULT_NODE_HEIGHT + ROW_GAP) * (position_nodes_by_id[id_el].y)


    # Do not dim the new element
    if newly_created_id is not None:
        position_nodes_by_id[newly_created_id].isDimmed = False