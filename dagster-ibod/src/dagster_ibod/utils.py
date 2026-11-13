# utils.py
"""Funciones transversales."""

# Para ejecutar este archivo, hay que usar:
    # python -m dagster_ibod.src.dagster_ibod.utils

import dagster as dg
import hashlib
import pandas as pd

from collections.abc import Generator, Mapping
from datetime import datetime
from pathlib import Path

from .config import *


# Formato ______________________________________________________________________________________________________

"""
Todo dataset del Dagster tiene que poder identificarse unívocamente con su key.
    Por defecto, esa key es el nombre de la función, puesto en el código.

Todo dataset a exportar en CSV tiene que tener un path:
- Único
- Fácilmente identificable
- Con un timestamp

________________________________________________________________________________________________________________

Se define la siguiente convención:

- Todo dataset debe tener:
    - 3 keys de metadatos obligatorias, que se asignan en el @dg.asset:
        - proyecto (usualmente "generico", "espanya", "caatlunya", "santa_coloma_g", "lleida"...)
        - codigo: corto, no único en general (pero si en conjunto con el ámbito y el proyecto)
        - idioma (usualmente "esp" o "cat")

    - Un nombre único, asignado en el código.
        Por ahora, es "invisible", pero se puede añadir al nombre del archivo.

    - Un ámbito, asignado en defs.yaml dentro de cada ámbito.

- Además, cualquier dataset puede tener más metadatos. Se recomienda poner:
    - "visualizaciones", en caso de que el dataset se pueda subir a Flourish para múltiples visualizaciones.

Más abajo se determina el formato que pueden tener los metadatos y las posibles claves y valores.

De esta forma, un dataset se almacena en:
- Una carpeta de output por ámbito:
    dagster-ibod/data/ambito/output/
- Una subcarpeta por dataset y un archivo por versión:
    identificador/identificador-timestamp.csv

Siendo el identificador ambito-proyecto-codigo-idioma

Se recomienda mirar el archivo assets_feminicidios para ver cómo se definen los assets y los metadatos.

"""

# Funciones auxiliares _________________________________________________________________________________________

def timestamp_YYYYMMDD_hhmmss() -> str:
    """
    Genera un timestamp en formato YYYYMMDD_hhmmss.
    Ejemplo: "20231027_143055"
    """
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def dataframe_hash(df: pd.DataFrame) -> str:
    """
    Genera un hash para un DataFrame.
    Se puede usar como versión, pero hay riesgo de colisión
    (2 DataFrames diferentes pueden llegar a tener el mismo hash).
    """
    # Lo importante de este hash es que si se da el mismo DataFrame, se de el mismo hash, para
        # no marcar como desincronizados DataFrames que en realidad no han cambiado.
    # Se asume el riesgo de que se marquen como no sincronizados y en realidad haya habido un cambio.

    # Include column names, index and values
    hashed = pd.util.hash_pandas_object(
        df,
        index=True
    ).values.tobytes()

    # Include column metadata
    metadata = str((list(df.columns), list(df.dtypes)))

    return hashlib.sha256(metadata.encode() + hashed).hexdigest()


def _get_asset_key(
    context: dg.AssetExecutionContext,
    output_name: str | None = None,
) -> dg.AssetKey:
    """Identifica el asset correspondiente.
    Funciona tanto con @dg.asset como con @dg.multi_asset.
    """
    return (
        context.asset_key_for_output(output_name)
        if output_name is not None
        else context.asset_key
    )


def enriched_output(
    context: dg.AssetExecutionContext,
    df: pd.DataFrame, 
    output_name: str | None = None,
    **kwargs
) -> dg.Output:
    """Devuelve un dg.Output con:
    - El DataFrame proporcionado
    - Su hash como data_version
    - Los tags como metadata
    - Una muestra del DataFrame en metadata
    """

    asset_key = _get_asset_key(context, output_name)

    # Obtener tags definidos en AssetOut o en el asset
    tags = context.assets_def.tags_by_key[asset_key]

    metadata = {
        "muestra": dg.MetadataValue.md(df.head(NUMERO_MAXIMO_FILAS_MUESTRA).to_markdown()),
        "tags": dg.MetadataValue.json(tags),
    }

    output_kwargs = {
        "value": df,
        "data_version": dg.DataVersion(dataframe_hash(df)),
        "metadata": metadata,
        **kwargs,
    }

    if output_name is not None:
        output_kwargs["output_name"] = output_name

    return dg.Output(**output_kwargs)


def enriched_output_generator(
    context: dg.AssetExecutionContext,
    dfs: Mapping[str, pd.DataFrame]
) -> Generator[dg.Output, None, None]:
    """
    Genera outputs enriquecidos para un multi_asset.
    """
    for output_name, df in dfs.items():
        yield enriched_output(
            context=context,
            df=df,
            output_name=output_name,
        )


# Generación de paths para datasets ____________________________________________________________________________

def get_csv_path(
    context: dg.AssetExecutionContext,
    output_name: str | None = None,
) -> Path:
    """Genera un path CSV a partir del código y nombre del asset.

    Funciona tanto con @dg.asset como con @dg.multi_asset.

    Es necesario que el asset tenga las tags "codigo" y "proyecto".
    
    Args:
        context: Contexto de ejecución del asset.
        output_name: Nombre del output en caso de utilizar multi_asset.
    """

    asset_key = _get_asset_key(context, output_name)

    # Obtener tags definidos en AssetOut o en el asset
    tags = context.assets_def.tags_by_key[asset_key]

    # Obtener tags del dataset
    ambito = tags.get("ambito")         # Definida en defs.yaml dentro de cada ambito
    proyecto = tags.get("proyecto")     # Definida en el asset
    codigo = tags.get("codigo")         # Definida en el asset
    idioma = tags.get("idioma")         # Definida en el asset
    
    if not isinstance(proyecto, str):
        raise ValueError(
            f"Tag de ámbito no asignada para el asset {asset_key}. "
            'La tag "ambito" es obligatoria. Se debe definir a partir de un archivo defs.yaml.'
        )
    if not isinstance(proyecto, str):
        raise ValueError(
            f"Tag de proyecto inexistente para el asset {asset_key}. "
            'La tag "proyecto" es obligatoria. Se debe definir en el archivo .py.'
        )
    if not isinstance(codigo, str):
        raise ValueError(
            f"Tag de código inexistente para el asset {asset_key}. "
            'La tag "codigo" es obligatoria. Se debe definir en el archivo .py.'
        )
    if not isinstance(idioma, str):
        raise ValueError(
            f"Tag de idioma inexistente para el asset {asset_key}. "
            'La tag "idioma" es obligatoria. Se debe definir en el archivo .py.'
        )

    # Generar nombre del dataset a partir del AssetKey
    nombre = "-".join(asset_key.path)
        # Esto permite que una key sea una lista en lugar de un str

    # Construir identificador
    identificador = f"{ambito}-{proyecto}-{codigo}-{idioma}"
        # TODO: decidir si añadimos "nombre" (el nombre de la función en Python)

    # Crear directorio
        # TODO: decidir cómo organizar las salidas
    folder = PATH_DATA / ambito / "output" / identificador
    folder.mkdir(exist_ok=True, parents=True)

    # Generar nombre de archivo
    filename = (
        f"{identificador}-"
        f"{timestamp_YYYYMMDD_hhmmss()}.csv"
    )

    return folder / filename
