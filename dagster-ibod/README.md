# dagster_ibod

Proyecto de automatización de datasets para la Iniciativa Barcelona Open Data usando Dagster y Jupyter Lab.

## Documentación

Este README contendría la documentación o un enlace a ella. Sería visible desde Jupyter Lab y también desde GitHub (en GitHub con un formato más visual).

En esta documentación se explicaría:

- Por un lado lo más básico: cómo actualizar los datasets y qué hacer en caso de error.

- Por otro lado lo más técnico: cómo se movería la instalación a otro host, etc.

Para una explicación sobre la toma de decisiones, se recomendará leer la memoria final del TFG, que también quedará en el GitHub.

### ¿Cómo actualizo los datasets del proyecto?

(Por ahora, asumimos que el usuario es quien comprueba cada X tiempo si las fuentes están actualizadas y, cuando lo están todas, acciona manualmente la actualización, proporcionando los datasets fuente).

-> Dirigirse a Jupyter Lab y subir los datasets en ...

-> Dirigirse a Dagster ...

-> Materializar ...

...

### ¿Qué hago en caso de error?

-> Jupyter Lab


## Getting started

### Installing dependencies

**Option 1: uv**

Ensure [`uv`](https://docs.astral.sh/uv/) is installed following their [official documentation](https://docs.astral.sh/uv/getting-started/installation/).

Create a virtual environment, and install the required dependencies using _sync_:

```bash
uv sync
```

Then, activate the virtual environment:

| OS | Command |
| --- | --- |
| MacOS | ```source .venv/bin/activate``` |
| Windows | ```.venv\Scripts\activate``` |

**Option 2: pip**

Install the python dependencies with [pip](https://pypi.org/project/pip/):

```bash
python3 -m venv .venv
```

Then activate the virtual environment:

| OS | Command |
| --- | --- |
| MacOS | ```source .venv/bin/activate``` |
| Windows | ```.venv\Scripts\activate``` |

Install the required dependencies:

```bash
pip install -e ".[dev]"
```

### Running Dagster

Start the Dagster UI web server:

```bash
dg dev
```

Open http://localhost:3000 in your browser to see the project.

## Learn more

To learn more about this template and Dagster in general:

- [Dagster Documentation](https://docs.dagster.io/)
- [Dagster University](https://courses.dagster.io/)
- [Dagster Slack Community](https://dagster.io/slack)
