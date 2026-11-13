# Dataset fuente: Feminicidios en la pareja o expareja

# Dependencias _________________________________________________________________________________________________

import dagster as dg
import pandas as pd

from typing import Generator

from ....config import *
from ....utils import *


# Descarga manual ______________________________________________________________________________________________

PATH_DATASET_1 = PATH_DATA_DXVXD_INPUT / "f_1_1-feminicidios_raw.csv"

dataset_feminicidios_raw = dg.AssetSpec(
    "dataset_feminicidios_raw",
    description=PATH_DATASET_1.stem
)
# Esto es un dataset externo. Dagster no lo puede materializar.
    # Es nuestra responsabilidad actualizarlo
    # y luego actualizar el dataset que depende de este
    # (ya que Dagster no detecta cambios que hagamos en el archivo).


# Transformaciones _____________________________________________________________________________________________

# Limpieza -----------------------------------------------------------------------------------------------------

@dg.asset(
    deps=[dataset_feminicidios_raw],
    tags={
        "proyecto": "espanya",
        "codigo": "f_1_1_d_1",
        "idioma": "esp",
    },
    metadata={ # Hay que especificar las visualizaciones si son mas de una
        "visualizaciones": "dxvxm-espanya-v_1_1-esp, dxvxm-espanya-v_6_3_1-esp"
    }
)
def dataset_feminicidios(context: dg.AssetExecutionContext) -> dg.Output:
    """
    Limpieza y normalización del dataset de feminicidios.
    """
    # Cargar datos
    df = pd.read_csv(PATH_DATASET_1)

    # Cambiar el nombre de las columnas estándar
    df_standard = df.copy().rename(columns={
        "Comunidad autónoma (As)": CCAA,
        "Provincia (As)": PROVINCIA,
        "Año": ANYO
    })

    # TODO: estandarizar valores de las columnas estándar

    # Comprobar que todos los números son enteros
    columnas_numericas = df_standard.select_dtypes(include='number').columns
    assert (df_standard[columnas_numericas] % 1 == 0).all().all(), "Error de formato. Un valor que debía ser un entero no se ha podido convertir a entero. Todos los valores numéricos de este dataset deben ser enteros."

    # Pasar los valores de las columnas numéricas a enteros
    columnas_numericas = df_standard.select_dtypes(include='number').columns

    df_standard[columnas_numericas] = df_standard[columnas_numericas].astype(int)

    # Limitar el año al año objetivo
    df_standard[ANYO].unique()
    df_clean = df_standard[df_standard[ANYO] <= int(ANYO_OBJETIVO)]

    # Guardar a CSV
    path = get_csv_path(context)
    df_standard.to_csv(path)

    return enriched_output(context, df_standard)


# Feminicidios -------------------------------------------------------------------------------------------------

@dg.asset(
    tags={
        "proyecto": "espanya",
        "codigo": "v_2_1_1",
        "idioma": "esp",
    },
)
def dataset_feminicidios_pie_chart(context: dg.AssetExecutionContext, dataset_feminicidios) -> dg.Output:
    """
    Feminicidios con vs sin denuncia prev. por año.
    """
    # Filtrar filas
    df_clean_2008 = dataset_feminicidios[dataset_feminicidios[ANYO] >= 2008]

    # Seleccionar columnas
    df_pie = df_clean_2008[["Denuncia -2-", "Feminicidios pareja o expareja"]]

    # Agrupar por denuncia
    df_pie = df_pie.groupby("Denuncia -2-").sum().reset_index()

    # Renombrar columna
    df_pie.rename(columns={
        "Feminicidios pareja o expareja": f"2008-{ANYO_OBJETIVO}"
    }, inplace=True)

    # Renombrar "filas"
    df_pie["Denuncia -2-"] = df_pie["Denuncia -2-"].replace({
        "No": "No había denuncia",
        "Sí": "Había denuncia"
    })

    # Guardar a CSV
    path = get_csv_path(context)
    df_pie.to_csv(path)

    return enriched_output(context, df_pie)


@dg.asset(
    tags={
        "proyecto": "espanya",
        "codigo": "v_2_1_2",
        "idioma": "esp",
    },
)
def dataset_feminicidios_denuncias_vs_total(context: dg.AssetExecutionContext, dataset_feminicidios) -> dg.Output:
    """
    Feminicidios totales vs con denuncia prev. por año.
    """
    # Seleccionar columnas
    df_combo = dataset_feminicidios[[ANYO, "Denuncia -2-", "Feminicidios pareja o expareja"]]

    # Filtrar filas
    df_combo = df_combo[df_combo[ANYO] >= 2008]

    # Agrupar por año y denuncia
    df_combo = df_combo.groupby([ANYO, "Denuncia -2-"]).sum().reset_index()

    # Por un lado, buscar los totales
    df_totales = df_combo.drop(columns="Denuncia -2-").groupby([ANYO]).sum().reset_index() \
        .rename(columns={"Feminicidios pareja o expareja": "Total víctimas"})

    # Por otro, buscar los casos con denuncia
    df_denuncia = df_combo[df_combo["Denuncia -2-"] == "Sí"] \
        .drop(columns="Denuncia -2-").groupby([ANYO]).sum().reset_index() \
        .rename(columns={"Feminicidios pareja o expareja": "Había denuncia"})

    # Hacer el join con los años
    df_combo = df_totales.merge(df_denuncia, on=ANYO)

    # Guardar a CSV
    path = get_csv_path(context)
    df_combo.to_csv(path)

    return enriched_output(context, df_combo)


# Huérfanos ----------------------------------------------------------------------------------------------------

@dg.asset(
    tags={
        "proyecto": "espanya",
        "codigo": "v_6_3_2",
        "idioma": "esp",
    },
)
def dataset_huerfanos_line_chart(context: dg.AssetExecutionContext, dataset_feminicidios) -> dg.Output:
    """
    Huérfanos por CCAA y año.
    """
    # Seleccionar columnas
    df_huerfanos_anyo_ccaa = dataset_feminicidios[[ANYO, CCAA, "Huérfanas y huérfanos menores de edad -1-"]]

    # Filtrar filas
    df_huerfanos_anyo_ccaa = df_huerfanos_anyo_ccaa[df_huerfanos_anyo_ccaa[ANYO] >= 2013]

    # Agrupar por año y CCAA
    df_huerfanos_anyo_ccaa = df_huerfanos_anyo_ccaa.groupby([ANYO, CCAA]).sum().reset_index()

    # Pivotar  año, CCAA y el indicador
    df_huerfanos_anyo_ccaa_wide = df_huerfanos_anyo_ccaa.pivot(
        index="Año",
        columns="CCAA",
        values="Huérfanas y huérfanos menores de edad -1-"
    ).reset_index().rename_axis(None, axis=1).fillna(0)

    # Pasar todas las columnas a enteros
    df_huerfanos_anyo_ccaa_wide = df_huerfanos_anyo_ccaa_wide.astype({
        col: int
        for col in df_huerfanos_anyo_ccaa_wide.columns
    })

    # Añadir la media de todas las columnas excepto año
    df_huerfanos_anyo_ccaa_wide["Media España"] = df_huerfanos_anyo_ccaa_wide.drop(columns=["Año"]).mean(axis=1)

    # Guardar a CSV
    path = get_csv_path(context)
    df_huerfanos_anyo_ccaa_wide.to_csv(path)

    return enriched_output(context, df_huerfanos_anyo_ccaa_wide)


# Lleida -------------------------------------------------------------------------------------------------------

@dg.multi_asset(
    #group_name="feminicidios_lleida",
    outs={
        "esp": dg.AssetOut(
            key="feminicidios_lleida_esp",
            tags={
                "proyecto": "lleida",
                "codigo": "v_1_2",
                "idioma": "esp",
            },
        ),
        "cat": dg.AssetOut(
            key="feminicidios_lleida_cat",
            tags={
                "proyecto": "lleida",            
                "codigo": "v_1_2",
                "idioma": "cat",
            },
        ),
    },
)
def feminicidios_lleida_vs_cat_es(
    context: dg.AssetExecutionContext,
    dataset_feminicidios,
) -> Generator[dg.Output, None, None]:
    """
    Feminicidios en Lleida vs Cat vs Esp por año.
    """
    indicador = "Feminicidios pareja o expareja"

    # Seleccionar columnas
    df = dataset_feminicidios[[CCAA, PROVINCIA, ANYO, indicador]]

    # 3 selecciones + filtros + agrupaciones:

        # 1. Agrupar por año para tener el total de España
    df_es = df[[ANYO, indicador]] \
        .groupby(ANYO).sum().reset_index() \
        .rename(columns={indicador: "España"})

        # 2. Filtrar CCAA y agrupar por año para tener el total de la CCAA
    df_cat = df[[ANYO, CCAA, indicador]] \
        [df[CCAA] == "Cataluña"].drop(columns=[CCAA]) \
        .groupby(ANYO).sum().reset_index() \
        .rename(columns={indicador: "Cataluña"})

        # 3. Filtrar por provincia y agrupar por año para tener el total de la provincia
    df_lleida = df[[ANYO, PROVINCIA, indicador]] \
        [df[PROVINCIA] == "Lleida"].drop(columns=[PROVINCIA]) \
        .groupby(ANYO).sum().reset_index() \
        .rename(columns={indicador: "Provincia de Lleida"})

    # Juntar los tres datasets a partir del año, llenando los NaNs con ceros
    df_final = (
        df_lleida
        .merge(df_cat, on=ANYO, how="outer")
        .merge(df_es, on=ANYO, how="outer")
        .fillna(0)
    )

    # Pasar todas las columnas a enteros
    df_final = df_final.astype({
        col: int
        for col in df_final.columns
    })

    # Ordenar por año
    df_lleida = df_final.sort_values(ANYO)

    # Exportar a csv

        # 1. esp
    path_esp = get_csv_path(context, output_name="esp")
    df_lleida.to_csv(path_esp, index=False)

        # 2. cat
    df_lleida_cat = df_lleida.rename(columns={
        'Provincia de Lleida': 'Província de Lleida',
        'Cataluña' : 'Catalunya',
        'España' : 'Espanya'
    })   
    path_cat = get_csv_path(context, output_name="cat")
    df_lleida.to_csv(path_cat, index=False)

    yield from enriched_output_generator(context, {
        "esp": df_lleida,
        "cat": df_lleida_cat,
    })
