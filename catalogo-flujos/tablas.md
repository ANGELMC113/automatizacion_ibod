# Propuesta de tablas para modelar el catálogo

Si bien lo que se describe a continuación no es una arquitectura como tal, es buena parte de ella (para un ingeniero de software quizás una mínima parte de ella).

Es importante haber leído la [documentación en pdf](./Documentación%20herramienta%20interna%20V1.pdf) para distinguir los tipos de elementos que se proponen. 

- PK = Primary key
- FK = Foreign key


## Tablas implícitas auxiliares

Son simplemente categorías. Faltaría decidir cómo se modelan.

Tipos de elementos:
- Dataset fuente                        
- Dataset lógico - transformación       
- Dataset CKAN                          
- Visualización                         
- Producto final   

Métodos de actualización:
- Automático
- Semiautomático
- Manual

   - Nota: se puede plantear eliminar el "Semiautomático".

Estados:
- Actualizado                   
- Desactualizado                
-  Permanente                   
- Pendiente de acción manu


## Tablas principales

La forma estándar de describir en SQL una relación jerárquica es utilizando una tabla para el nivel superior de jerarquía (supertipo) y una tabla para cada uno de los subtipos. En estos subtipos, el ID es PK y FK a la vez, apuntando al supertipo.

- Supertype y subtype ([explicación y ejemplo](https://learndatamodeling.com/blog/supertype-and-subtype/)).

### "elementos" (supertype)

| Columna     | Display          | Tipo   | Comentarios                                         |
| ----------- | ---------------- | ------ | --------------------------------------------------- |
| id_elemento | ID del elemento  | Int    | PK                                                  |
| tipo        | Tipo de elemento | String | - Uno de los tipos definidos.<br>- Not null |

### Datasets lógicos y fuente: "datasets" (subtype)

| Columna        | Display                                               | Tipo          | Comentarios                                               |
| -------------- | ----------------------------------------------------- | ------------- | --------------------------------------------------------- |
| id_elemento    | ID del dataset lógico                                 | Int           | PK y FK apuntando a "elementos.id_elemento"               |
| nombre         | Nombre                                                | String        | - Unique<br>- Not null                                    |
| fecha_act      | Fecha de la última actualización                      | Fecha         | Check: fecha no futura                                    |
| estado         | Estado                                                | String        | - Uno de los estados definidos<br>- Not null             |
| es_fuente      | ¿Es un dataset fuente?                                | Bool          | Not null \*1                                              |
| metodo_act     | Metodo para actualizarlo                              | Categoría     | - Uno de los métodos definidos<br>- Not null       |
| indicaciones   | Indicaciones  y documentos para actualizar el dataset | String        | ¿Cómo se accede, consigue o actualiza este dataset? \*6   |
| url_fuente     | URL de la fuente                                      | String        | Check: si "es_fuente" == 0 entonces "url_fuente" es null. |
| metadatos_json | Metadatos JSON                                        | JSON (String) | Not null                                                  |

\*1 Un dataset puede ser fuente o lógico (transformación). 
- Recordatorio: un dataset fuente es "lo que se podría descargar", un dataset lógico es "el resultado de una acción", siendo una descarga total o parcial una acción realizada sobre un dataset fuente.
	- Ejemplo práctico: para descargar un dataset fuente entero, necesitamos 2 elementos: un dataset fuente (con su fuente y URL) y un dataset lógico, cuyas indicaciones indiquen "descarga completa". El resto de metadatos (los JSON) se pueden enlazar.

- Esto lo marca el booleano, para dar pie a una cierta flexibilidad:
	- Un dataset fuente puede no tener ninguna fuente relacionada, pero quizás sí una URL, o al revés.

\*6 Es importante recordar que para un dataset fuente, aquí no indicamos cómo se descarga, eso se haría en un dataset lógico o transformación derivada de esta fuente.
- Lo que sí que podemos indicar, por ejemplo, son credenciales para acceder a la fuente, indicaciones que hay que seguir en la interfaz para ver los datos...

### Datasts CKAN: "datasets_ckan" (subtype)

- Simplemente identifica los datasets del CKAN. No guardamos nada, porque todo lo tiene el CKAN.

| Columna     | Display                                 | Tipo   | Comentarios                                 |
| ----------- | --------------------------------------- | ------ | ------------------------------------------- |
| id_elemento | ID del dataset de CKAN                  | Int    | PK y FK apuntando a "elementos.id_elemento" |
| id_CKAN     | ID del dataset dentro de la BD del CKAN |        | ¿FK?                                        |
| fecha_act   | Fecha de la última actualización        | Fecha  | Check: fecha no futura                      |
| estado      | Estado                                  | String | Uno de los estados definidos             |

### "visualizaciones" (subtype)

| Columna        | Display                          | Tipo          | Comentarios                                 |
| -------------- | -------------------------------- | ------------- | ------------------------------------------- |
| id_elemento    | ID de la visualización           | Int           | PK y FK apuntando a "elementos.id_elemento" |
| metadatos_json | Metadatos JSON                   | JSON (String) | Not null                                    |
| fecha_act      | Fecha de la última actualización | Fecha         | Check: fecha no futura                      |
| estado         | Estado                           | String        | Uno de los estados definidos             |

### Productos finales: "productos" (subtype)

- Se distinguen de las visualizaciones porque los productos se pueden enlazar con una variedad mayor de elementos (en tipo y número). Es el elemento más flexible.

| Columna        | Display                          | Tipo          | Comentarios                                 |
| -------------- | -------------------------------- | ------------- | ------------------------------------------- |
| id_elemento    | ID del producto                  | Int           | PK y FK apuntando a "elementos.id_elemento" |
| metadatos_json | Metadatos JSON                   | JSON (String) | Not null                                    |
| fecha_act      | Fecha de la última actualización | Fecha         | Check: fecha no futura                      |
| estado         | Estado                           | String        | Uno de los estados definidos             |

### "Archivos"

Esta tabla relaciona archivos en el servidor con el elemento con el que se corresponden.
- Al no ser un elemento, esta tabla no tiene metadatos JSON.

| Columna     | Display           | Tipo          | Comentarios                                                                                                                                       |
| ----------- | ----------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| id_archivo  | ID del archivo    | Int           | PK                                                                                                                                                |
| id_elemento | ID del elemento   | Int           | - FK apuntando a "elementos.id_elemento"<br>- Not null                                                                                            |
| path        | Path              | String (Path) | - Es el Path del archivo<br>- Unique (trivial)<br>- Check: Python tiene que poder convertirlo a Path<br>- Not null<br>- Se recoge automáticamente |
| fecha       | Fecha de creación | Fecha         | - Check: fecha no futura<br>- Not null<br>- Se recoge automáticamente                                                                             |
| up_to_date  | ¿Al día?          | Bool          | - = fecha >= datasets.fecha_act<br>- null si no hay fecha_act                                                                                     |
| comentarios | Comentarios       | String        | Particularidades del archivo                                                                                                                      |

- Técnicamente, un archivo no puede pertenecer a un dataset fuente ni CKAN, pero por ahora se deja flexible.

## Tablas auxiliares

### "relaciones"

| Columna     | Display                 | Tipo | Comentarios                            |
| ----------- | ----------------------- | ---- | -------------------------------------- |
| id_relacion | ID de la relación       | Int  | PK                                     |
| id_origen   | ID del elemento origen  | Int  | FK apuntando a "elementos.id_elemento" |
| id_destino  | ID del elemento destino | Int  | FK apuntando a "elementos.id_elemento" |
- Check: id_origen != id_destino
- Check: toda pareja debe ser unique

- Si bien no se va a restringir por ahora, nos interesan estas relaciones:
	- dataset fuente -> dataset lógico
	- dataset lógico -> dataset lógico
	- dataset lógico -> dataset CKAN
	- dataset CKAN -> dataset lógico
	- dataset lógico -> visualización
	- visualización -> producto final
- Por flexibilidad, también se permite:
	- dataset fuente -> dataset CKAN
	- dataset fuente -> visualización
	- dataset CKAN -> visualización
	- dataset fuente -> producto final
	- dataset lógico -> producto final
	- dataset CKAN -> producto final
- Se prohíbe:
	- * -> dataset fuente
	- producto final -> *
	- visualización -> dataset*
	- visualización -> visualización

- Todo lo que se prohíbe es lo que rompe el flujo de izquierda a derecha y las columnas con ancho de 1 elemento (excepto "datasets lógicos y CKAN", la única columna con anchura variable). La interfaz se describe más abajo, donde se introducen las 4 columnas.

### "metadatos_linkeados"

| Columna     | Display           | Tipo   | Comentarios                             |
| ----------- | ----------------- | ------ | --------------------------------------- |
| id_link     | ID del link       | Int    | PK                                      |
| id_relacion | ID de la relación | Int    | FK apuntando a "relaciones.id_relacion" |
| metadato    | Metadato          | String | Not null                                |
- UNIQUE(id_relacion, metadato)
