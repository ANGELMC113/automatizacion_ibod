# utils.py
"""Funciones transverales para los Notebooks."""

import requests

def check_raw_dades_obertes(response: requests.Response) -> None:
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