# utils.py
"""Funciones para los Notebooks de Dades Obertes Catalunya."""

import pandas as pd
import requests


def _check_raw_dades_obertes(response: requests.Response) -> None:
    """
    Levanta un error si los datos no tienen el formato esperado
    de la API de Dades Obertes Catalunya.
    """
    mensaje_error = "Error de formato para los datos de la API de Dades Obertes Catalunya."

    response.raise_for_status()
    data = response.json()

    # response.json() debe ser una lista
    if not isinstance(data, list) or not data:
        raise ValueError(
            f"{mensaje_error}\n"
            "response.json() no es una lista.\n"
        )

    for row in data: # Asumimos que cada elemento de la lista es una fila

        # Cada fila debe ser un diccionario
        if not isinstance(row, dict):
            raise ValueError(
                f"{mensaje_error}\n"
                "Una fila de la lista no es un diccionario.\n"
                f"Fila: {row}"
            )


def query_dades_obertes(resource_code: str, query: str = "SELECT * LIMIT 5") -> pd.DataFrame:
    """
    Dada una query SQL y un código de dataset en Dades Obertes Catalunya,
    descarga el dataset correspondiente a la query.

    Si no se pasa query, hace un SELECT * LIMIT 5 (equivalente a un .head() del pandas)
    """
    url_data = f"https://analisi.transparenciacatalunya.cat/resource/{resource_code}.json"

    response = requests.get(
        url_data,
        params={"$query": query},
        timeout=60
    )
    _check_raw_dades_obertes(response)

    return pd.DataFrame(response.json())

