## Puesta en marcha (EN CONSTRUCCIÓN)

- Nota: esta sección aún está en construcción. Las indicaciones sirven para instalar la versión en desarrollo del software y usarlo en el mismo dispositivo en el que se instala, y no en un servidor diferente del cliente.

1. Descargar todo el contenido del repositorio.

2. Definir permanente la variable DAGSTER_HOME para que apunte a la carpeta .dagster del proyecto.

3. Crear un entorno virtual de Python e instalar las dependencias en requirements.txt.

4. Reiniciar la terminal y volver a activar el entorno virtual. Esto permite usar el comando `dg`.

### Guía paso a paso (para sistemas Linux):

#### Requisitos

- Python instalado. Para el desarrollo se ha usado Python 3.12.3.

#### 1. Descarga del repositorio

1. Descargar el repositorio como .zip y descomprimirlo.

TO DO: la forma corecta es conectándose al repositorio para poder actualizarlo más fácilmente.

#### 2. Definición de DAGSTER_HOME

1. Copiar el path absoluto a la carpeta `dagster_ibod/.dagster` del proyecto. Este path depende de dónde hayamos puesto el proyecto.

    - Se recomienda ponerlo en `home`.

2. En el archivo `~/.bashrc` añadir `export DAGSTER_HOME=path` donde `path` es el path copiado en el paso anterior.

    - Si este archivo no existe, se debe crear.

#### 3. Entorno virtual y dependencias

1. Abrir una terminal y cambiar el *working directory* a la carpeta del proyecto.

2. Usar `python -m venv venv_ibod` para crear el entorno virtual.

    - Es posible que haya que usar otro comando en lugar de `python` para usar una versión en concreto.

3. Usar `source venv_ibod/bin/activate` para activar el entorno.

4. Usar `pip install -r requiremenets.txt` para instalar las dependencias.

5. Usar `python -m ipykernel install --user --name "venv_ibod" --display-name "Python 3.12.3 (venv_ibod)"` para poder utilizar este entorno como kernel en los Jupyer Notebooks.

## Ejecución

Es importante iniciar el entorno virtual.

### Dagster

1. En la carpeta `dagster_ibod`, usar `dg dev`.

2. Comprobar que Dagster dice este mensaje: `All component YAML validated successfully.`

    - Si no vemos ese mensaje, es posible que Dagster no haya reconocido la variable DAGSTER_HOME. Debemos arreglar este error para que los datos persistan entre diferentes ejecuciones.

3. Abrir localhost:3000 en un navegador para ver la interfaz.

### Jupyter lab

1. Usar `jupyer lab`.

2. Abrir localhost:8888 en un navegador para ver la interfaz.