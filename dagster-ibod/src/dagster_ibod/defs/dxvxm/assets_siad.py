# Demo - Dagster - 2

# Dataset B: Atenciones del SIAD

# Dependencias _________________________________________________________________________________________________

import dagster as dg
import hashlib
import pandas as pd
import requests

from ...config import *
from ...utils import *


# Descarga por API _____________________________________________________________________________________________

""" 
Los enlaces, en teoría, no se deben regenerar.

En caso de que sea necesario, en los Notebooks
están las instrucciones para generar enlaces a la API.
"""

URL_D3_S1 = "https://analisi.transparenciacatalunya.cat/resource/imk8-b6zj.json?$query=SELECT%20count(*)%2C%20%60any%60%0AWHERE%0A%20%20caseless_one_of(%60sexe%60%2C%20%22Dones%22)%0A%20%20AND%20caseless_one_of(%60atencionsodones%60%2C%20%22Primera%20atenci%C3%B3%22)%0A%20%20AND%20caseless_one_of(%60deteccioviolenciamasclista%60%2C%20%22S%C3%AD%22)%0AGROUP%20BY%20%60any%60"

def check_data(data: list) -> None:
    """
    Checks data is in the proper format. Raise error otherwise.
    """
    if not isinstance(data, list) or not data:
        raise ValueError("Expected a non-empty JSON list.")

    for row in data:
        if not isinstance(row, dict) or set(row) != {"count", "any"}:
            raise ValueError("Each row must contain exactly 'count' and 'any'.")

        if not isinstance(row["count"], str) or not row["count"].isdigit():
            raise ValueError("'count' must be a string of digits.")

        if not isinstance(row["any"], str) or not (
            row["any"].isdigit() or
            (row["any"][:4].isdigit() and row["any"][4:] == "_1S")
        ):
            raise ValueError("'any' must be a year or a year with '_1S'.")

    years = [row["any"] for row in data]
    if len(years) != len(set(years)):
        raise ValueError("'any' values must be unique.")


def filter_data(data: list) -> list:
    """
    Erases years not in format YYYY.
    """
    return [row for row in data if
            isinstance(row, dict)
            and isinstance(row.get("any"), str)
            and len(row["any"]) == 4
            and row["any"].isdigit()
            ]


@dg.observable_source_asset
def dataset_atenciones_siad_source() -> dg.DataVersion:
    """Detect changes in the SIAD source dataset."""

    # Esto es un dataset externo. Dagster no lo puede materializar.
        # En este caso, calculamos un hash que nos chiva si ha habido cambios en la fuente.

    response = requests.get(URL_D3_S1, timeout=30)
    response.raise_for_status()

    version = hashlib.sha256(response.content).hexdigest()

    return dg.DataVersion(version)


observation_job = dg.define_asset_job(
    "observe_dataset_atenciones_siad",
    selection=[dataset_atenciones_siad_source],
)

observation_schedule = dg.ScheduleDefinition(
    name="monthly_siad_observation",
    cron_schedule="0 6 1 * *",     # First day of the month at 06:00
    #cron_schedule="* * * * *",      # Every minute
    job=observation_job,
)


@dg.asset(
    deps=[dataset_atenciones_siad_source],
    automation_condition=dg.AutomationCondition.eager(),
    tags={
        "codigo": "d3_1",
    }
)
def dataset_atenciones_siad(context: dg.AssetExecutionContext,) -> dg.Output:
    """Dataset fuente."""

    response = requests.get(URL_D3_S1, timeout=30)
    response.raise_for_status()
    data = response.json()
    check_data(data)
    data = filter_data(data)

    return enriched_output(context, pd.DataFrame(data))


# Transformaciones _____________________________________________________________________________________________

@dg.asset(
    tags={
        "codigo": "d3_s1_v1_4",
        "idioma": "CAT",
        "cod_vis": "v1_4"
    },
    metadata={
        "visualizacion": "v.1.4 (2019-2024, Cat, -)"
    }
)
def dataset_atencions_siad_anuals(context: dg.AssetExecutionContext, dataset_atenciones_siad) -> dg.Output:
    """
    Dar el formato correcto a las atenciones anuales del SIAD.
    """
    # Cargar datos necesarios
    df = dataset_atenciones_siad

    df = df.rename(columns={
        "any": "Any",
        "count": "Dones ateses per VdG"
    })

    # Dar formato acorrecto a las columnas numéricas
    df["Any"] = df["Any"].astype(int)
    df["Dones ateses per VdG"] = pd.to_numeric(
        df["Dones ateses per VdG"], errors="coerce"
    ).astype("Int64") # Conservamos espacios asignados como NaN para los valores sin definir

    # Lista de años desde 2010 to 2024
    all_years = pd.DataFrame({"Any": range(2010, 2025)})

    # Fusionar los datos dejando los espacios vacíos de los indefinidos
    df = all_years.merge(df, on="Any", how="left")

    # Exportar a csv
    path = get_csv_path(context)
    df.to_csv(path, index=False) #encoding="utf-8-sig"
    # This CSV can be directly uploaded to "Violència gènere CAT/1.4 Dones ateses en situació de violència de gènere" in Flourish
    # I don't know if something else needs to be done in Flourish, such as updating the Iframe...

    return enriched_output(context, df)
