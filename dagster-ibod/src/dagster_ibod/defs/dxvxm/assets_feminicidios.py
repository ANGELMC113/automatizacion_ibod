# Demo - Dagster - 1

# Dataset fuente 1: Feminicidios en la pareja o expareja

# Dependencias _________________________________________________________________________________________________

import dagster as dg
import pandas as pd

from typing import Generator

from ...config import *
from ...utils import *


# Descarga manual ______________________________________________________________________________________________

""" Instrucciones para generar el dataset:

- Acceder a: https://estadisticasviolenciagenero.igualdad.gob.es/

- Ámbito de análisis: 010 Feminicidios en la pareja o expareja

- Columnas: Año

- Filas: Comunidad autónoma (As), Provincia (As), Denuncia -2-

- Descargar como CSV, ponerlo en /prefect/data y llamarlo d1-feminicidios_raw.csv (PATH_DATASET_1)
"""

PATH_DATASET_1 = PATH_DATA_DXVXD_INPUT / "d1-feminicidios_raw.csv"

dataset_feminicidios = dg.AssetSpec("dataset_feminicidios")
# Esto es un dataset externo. Dagster no lo puede materializar.
    # Es nuestra responsabilidad actualizarlo
    # y luego actualizar el dataset que depende de este
    # (ya que Dagster no detecta cambios que hagamos en el archivo).


# Transformaciones _____________________________________________________________________________________________

@dg.asset(
    deps=[dataset_feminicidios],
    tags={
        "codigo": "d1_s1",
    },
)
def dataset_feminicidios_con_total(context: dg.AssetExecutionContext) -> dg.Output:
    """
    Crear una nueva fila en el dataset fuente y poner la suma de todas las regiones.
    """
    # Cargar datos necesarios
    d1_with_total = pd.read_csv(PATH_DATASET_1)
    
    # Sumar a lo largo de las filas (axis=1) las columnas seleccionadas
    d1_with_total.loc["Total"] = d1_with_total.sum(numeric_only=True)
    d1_with_total.loc["Total", "Comunidad autónoma (As)"] = "Total"

    # Guardar a CSV
    path = get_csv_path(context)
    d1_with_total.to_csv(path)

    return enriched_output(context, d1_with_total)


@dg.asset(
    tags={
        "codigo": "d1_s1_1_v1_1",
        "idioma": "ES",
        "cod_vis": "v1_1"
    },
    metadata={
        "visualizacion": "v1.1 (2003-2025, Esp, (CCAA), -)"
    }
)
def dataset_feminicidios_por_ccaa_anyo(context: dg.AssetExecutionContext, dataset_feminicidios_con_total) -> dg.Output:
    """
    Flourish. Sumar por CCAA y año.
    """
    # Cargar datos necesarios
    d1_with_total = dataset_feminicidios_con_total

    # Primero nos guardamos la lista de columnas con valores
    year_cols = [col for col in d1_with_total.columns if col.isdigit() and len(col) == 4]

    # Eliminar todas las columnas excepto CCAA y los años
    d1_by_ccaa = d1_with_total[["Comunidad autónoma (As)"] + year_cols]

    # Agrupar (sumar) cada columna por CCAA
    d1_by_ccaa = d1_by_ccaa.groupby("Comunidad autónoma (As)").sum()

    # Trasponer el dataframe
    d1_by_ccaa = d1_by_ccaa.T

    # Cambiar nombre del índice de columnas
    d1_by_ccaa.columns.name = "Año"

    # Poner columna "Total" en segunda posición
    col = d1_by_ccaa.pop("Total")
    d1_by_ccaa.insert(0, "Total", col)

    # Exportar a CSV
    path = get_csv_path(context)
    d1_by_ccaa.to_csv(path, index=True, header=True, index_label="Año")

    print(f"Dataset exportado en {path}")
    print("Este csv se puede subir directamente a la v1.1 ESP de DxVxM")

    return enriched_output(context, d1_by_ccaa)


@dg.asset(
    tags={
        "codigo": "d1_s1_1_v1_1",
        "idioma": "CAT",
        "cod_vis": "v1_1"
    },
    metadata={
        "visualizacion": "v1.1 (2008-2025, Cat, -)"
    }
)
def feminicidios_por_anyo_CAT(context: dg.AssetExecutionContext, dataset_feminicidios_por_ccaa_anyo) -> dg.Output:
    """
    Flourish. Coger columna "Cataluña" y filtrar año >= 2008.
    """
    # Cargar datos necesarios
    d1_by_ccaa = dataset_feminicidios_por_ccaa_anyo

    # Coger columna para Cataluña y años >= 2008
    d1_cat = d1_by_ccaa.loc[d1_by_ccaa.index.astype(int) >= 2008, ['Cataluña']]

    # Exportar a csv
    path = get_csv_path(context)
    d1_cat.to_csv(path, index=True, header=True, index_label="Año")

    return enriched_output(context, d1_cat)


@dg.multi_asset(
    group_name="feminicidios_lleida",
    outs={
        "es": dg.AssetOut(
            key="feminicidios_lleida_ES",
            tags={
                "codigo": "d1_s1_2_v1_2",
                "idioma": "ES",
                "cod_vis": "v1_2",
            },
            metadata={
                "visualizacion": "v1.2 (2003-2025, Lleida, -) (ES)"
            }
        ),
        "cat": dg.AssetOut(
            key="feminicidios_lleida_CAT",
            tags={
                "codigo": "d1_s1_2_v1_2",
                "idioma": "CAT",
                "cod_vis": "v1_2"
            },
            metadata={
                "visualizacion": "v1.2 (2003-2025, Lleida, -) (CAT)"
            }
        ),
    },
)
def feminicidios_lleida_vs_cat_es(
    context: dg.AssetExecutionContext,
    dataset_feminicidios_con_total,
    dataset_feminicidios_por_ccaa_anyo
) -> Generator[dg.Output, None, None]:
    """
    Flourish. Coger columna de la provincia de Lleida, agrupar por CCAA y año y coger columna "Cataluña" y total para España.
    """
    # Cargar datos necesarios
    d1_with_total = dataset_feminicidios_con_total
    d1_by_ccaa = dataset_feminicidios_por_ccaa_anyo

    # Primero nos guardamos la lista de columnas con valores
    year_cols = [col for col in d1_with_total.columns if col.isdigit() and len(col) == 4]

    # Eliminar todas las columnas excepto provincia y los años
    d1_1_by_provincia = d1_with_total[["Provincia (As)"] + year_cols]

    # Agrupar (sumar) cada columna por provincia
    d1_1_by_provincia = d1_1_by_provincia.groupby("Provincia (As)").sum()

    # Trasponer el dataframe
    d1_1_by_provincia_t = d1_1_by_provincia.T

    # Coger columnas
        # Lleida de d1_1_by_provincia_t
        # Cataluña, Total de d1_1_by_ccaa_flourish
    d1_1_lleida = pd.concat([d1_1_by_provincia_t["Lleida"], d1_by_ccaa["Cataluña"], d1_by_ccaa["Total"]], axis=1)

    # Exportar a csv

    # 1. ES
    d1_lleida_es = d1_1_lleida.rename(columns={'Lleida': 'Provincia de Lleida', 'Total': 'España'})   
    path_es = get_csv_path(context, output_name="es")
    d1_lleida_es.to_csv(path_es, index=True, header=True, index_label="Año")

    # 2. CAT
    d1_lleida_cat = d1_1_lleida.rename(columns={'Lleida': 'Província de Lleida', 'Cataluña' : 'Catalunya', 'Total' : 'Espanya'})   
    path_cat = get_csv_path(context, output_name="cat")
    d1_lleida_cat.to_csv(path_cat, index=True, header=True, index_label="Año")

    print(f"Datasets exportados en {path_es} y {path_cat}")
    print("Cada CSV se puede subir a la v1.2 de Lleida en su idioma correspondiente.")

    yield from enriched_output_generator(context, {
        "es": d1_lleida_es,
        "cat": d1_lleida_cat,
    })
