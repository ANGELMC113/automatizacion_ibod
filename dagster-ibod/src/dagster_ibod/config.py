# config.py

import dagster as dg

from datetime import timedelta
from os import path as ospath
from pathlib import Path


# Configuración de la automatización ___________________________________________________________________________

"""
Cada año, se debe crear una nueva carpeta dentro de data/input (PATH_DATA_INPUT)
    con los datos de entrada para el año objetivo.

Luego, se debe escribir aquí el nombre de la carpeta.
"""

carpeta_input_objetivo: str = "tests" # "2026"

ANYO_OBJETIVO = "2025"
"""El año objetivo se utiliza de una forma diferente según el dataset.
- Para algunos datasets, cogemos todos los años hasta el año objetivo,
    a partir de un cierto año inicial (distinto en cada dataset).
- Para otros datasets, colo se cogen los datos correspondientes al año objetivo."""


# Metadatos ____________________________________________________________________________________________________

# TODO: pensar en cómo usar las etiquetas correctamente

# ETIQUETAS_DXVXD: dict[str, str] = {
#     "proyecto": "DxVxM / DxVxD"   
# }

# Las políticas de freshness están en desarrollo. No se usan por ahora.

# FRESHNESS_ANUAL = dg.FreshnessPolicy.time_window(
#     warn_window=timedelta(days=365),
#     fail_window=timedelta(days=730),
# )


# Constantes ___________________________________________________________________________________________________

# Paths

PATH_SRC_DAGSTER = Path(ospath.dirname(ospath.abspath(__file__)))
PATH_DAGSTER = PATH_SRC_DAGSTER.parent.parent
PATH_DATA = Path(PATH_DAGSTER / "data")

# Carpetas por proyecto
"""Importante:

Para que se puedan generar archivos, un datset debe tener la etiqueta "proyecto".

En cada carpeta con archivos con assets (por ejemplo src/dagster_ibod/defs/dxvxm) debe haber un
archivo defs.yaml que asigne la etiqueta "proyecto" correcta a todos los assets."""

# dxvxd
PATH_DATA_DXVXD_INPUT = Path(PATH_DATA / "dxvxd" / "input" / carpeta_input_objetivo)


# Otras

NUMERO_MAXIMO_FILAS_MUESTRA: int = 20


# Columnas estándar ____________________________________________________________________________________________
"""
Nos interesa que estas columnas:
- Siempre se llamen igual
- Siempren tengan los mismos valores
"""
ANYO = "Año"
CCAA = "CCAA"
PROVINCIA = "Provincia"


# Debug ________________________________________________________________________________________________________

if __name__ == "__main__":
    PATH_DATA.mkdir(exist_ok=True, parents=False)
    print("Dagster project folder:", PATH_DAGSTER)
    print("Created data folder at:", PATH_DATA)
