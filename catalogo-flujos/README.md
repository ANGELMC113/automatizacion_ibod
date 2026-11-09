# Catálogo de datos y flujos

Aplicación para documentar datos, proyectos y dependencias de una forma visual y manual.

La característica clave que diferencia este catálogo de los principales catálogos *open source* es que permite documentar datasets y procesos ETL aunque estos no estén automatizados de ninguna manera, y por lo tanto se mentengan de forma manual.

Esto permite un mayor nivel de abstracción y planificación integrada.

Actualmente contiene algunos ejemplos de Iniciativa Barcelona Open Data.

**Importante** esta app está en desarrollo y no está finalizada:

- El frontend está una fase bastante avanzada, pero falta una pieza importante: poder visualizar archivos CSV, modificarlos y guardarlos. Esto afecta tanto al frontend como al backend.

   - También hay algunos errores puntuales que hay arreglar en el frontend, y algunas cosas que se deben pulir y mover al backend.

- No hay backend como tal, pero hay una propuesta de cómo se podría modelar y parte de esa propuesta está en en [src/types/lineage.ts](./src/types/lineage.ts)

## Ejecución local (desarrollo)

Se recomienda descubrir la aplicación probándola. Los datos no persisten, porque no hay backend. Al refrescar el navegador ("F5") se restablece el estado inicial.

**Requisitos:**  Node.js

1. Instalar dependencias:
   `npm install`

2. Ejecutar la app:
   `npm run dev`

## Fundamentos y propuestas para seguir el desarrollo

Hay una serie de conceptos que son lo más fundamental del software: los datasests, visualizaciones y proyectos.

Se recomienda consultar la [documentación en pdf](./Documentación%20herramienta%20interna%20V1.pdf), en la que se hace una explicación de cómo se intentan abstraer todos estos conceptos de forma que se consiga una estructura con un buen balance entre rigidez y flexibilidad.

En esa misma búsqueda de balance, se distingue también un metadato fundamental, que es necesario para que el software funcione y se puedan documentar los datasets, de un metadato JSON. Estos metadatos son "mutables", de forma que el usuario puede definirlos sin que eso comprometa el software y la arquitectura.

Si se quisiera seguir desarrollando esta app, sería necesario:

- Crear un backend

- Darle una capa de autenticación

### Particularidades

A continuación se listan algunas funcionalidades que no se tienen por qué percibir en el frontend a simple vista (algunas están implementadas, otras no o a medias).

- Hay dos capas de selección: la capa de proyecto (que afecta a todas las vistas, al orden de los elementos y a su visibilidad) y la capa de elemento, que afecta a los elementos resaltados en rojo.

- Si se vinculan los metadatos, un cambio en el ancestro se debe reflejar en los descendientes vinculados (para cada metadato en particular).

- Un cambio de estado de "Actualizado" a "Desactualizado" se debe propagar a todos los descendientes.

### El backend

- Necesitaría un sistema que saque copias de seguridad periódicamente. Esto permite restablecer el sistema en el caso de que alguien acceda sin permiso y borre datos.

#### Arquitectura software propuesta

La propuesta de metadatos inicial se puede inferir desde el archivo [src/data/lineageData.ts](./src/data/lineageData.ts).

   - Nota: el "código" se podría mover a los metadatos fijos (SQL), para estandarizar las etiquetas de cada elemento (sustituyendo al ID). Habría que plantearse un formato estándar corto.

En [tablas.md](./tablas.md) se expone una propuesta que puede servir como base para modelar la arquitectura de software.

#### Algoritmo para posicionar los elementos del grafo en la pantalla

Para organizar los elementos del grafo, se trató de definir una lógica en Python en el archivo [src/utils/graphAlgorithms.py](./src/utils/graphAlgorithms.py) que luego se pidió a la IA que tradujera a TypeScript para ponerlo en la demo.

Este código de Python no tiene por qué ser funcional (no se ha podido probar porque no existe backend; en su lugar se usa la [versión generada por IA en TypeScript](./src/utils/graphAlgorithms.ts), que supuestamente hace algo muy similar), pero plasma la idea general:

1. Filtrar según proyecto, en caso de que haya alguno necesario. Esto altera el orden de las visualizaciones.

2. Ordenar las visualizaciones. Primero van las que se usan en el proyecto seleccionado. Luego puede ser que nos interese ordenar alfabéticamente, por fecha, por estado...

3. Hacer un "DFS" desde cada visualización hacia atrás e ir colocando los elementos de arriba abajo.

4. Colocar el resto de elementos en los espacios libres, también de arriba abajo.

Este algoritmo no minimiza la longitud de las flechas, pero respeta el orden planteado para la columna de las visualizaciones. El principal problema que tiene es que los elementos que no se usen en visualizaciones, como los datasets CKAN, se quedan abajo. Se podría arreglar dejando filas libres entre las visualizaciones, dedicadas a estos datasets CKAN.

#### Linkeo de metadatos

- Es importante poder linkear los metadatos JSON de distintos elementos.
	- Linkear significa que en cambiar el metadato del ancestro, el del descendiente también cambia.
		- Se puede bloquear el del descendiente para no permitir cambios en la dirección opuesta (por lo tanto simplificando la implementación).
		- Solo es relevante para los metadatos en la lista por defecto, el resto no conviene.
- Se debe poder:
	- Linkear todos los metadatos de golpe en unir un dataset lógico a su orígen.
		- No hace falta poder hacerlo otra vez después.
	- Linkear cada metadato por separado, en cualquier momento.
		- En este caso, poder linkear con cualquiera de los ancestros conectados directamente (sin pasar por otros nodos). Se tiene que poder combinar (este metadato con el ancestro A, este metadato con el B).
	- Quitar el link de un metadato para dejarlo vacío o definir el metadato a mano.
	- Resultado: este dale del ancestro A, este lo dejo vacío, este dale del B, este lo defino a mano...

#### Otras cosas 

Otras cosas que ahora están en la demo pero se tienen que ir al backend.

- La propagación de un cambio de "Actualizado" a "Desactualizado" a través de los descendientes y en cadena.
   - En el frontend, habrá que mantener el warning de propagación
- Propagar las cadenas de metadatos vinculados para que, sin tener que copiarlos, el frontend vea los metadatos vinculados correctamente.
- Coger las imágenes preview desde el backend en lugar del frontend.

- Se debe decidir si forzar que toda visualización se deba hacer sí o sí con un solo dataset, o quizás con 0 o 1 datasets (para visualizaciones que no sepamos qué datos usan más allá de lo que se ve en pantalla).