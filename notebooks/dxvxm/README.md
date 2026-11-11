# Análisis de datos para DxVxM / DxVxD

A fecha de 2026-10-08, en el Excel de la documentación se listan las siguientes fuentes:

1. [Portal Estadístico de la Delegación del Gobierno contra la Violencia de Género](https://estadisticasviolenciagenero.igualdad.gob.es/) (PEDG)

    - Es un cubo(s) de datos gestionado con Saiku. No tiene API pública.

2. [Portal estadístico de Criminalidad](https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/datos.html?path=%2FDatos4%2F&title=Victimizaciones&type=jaxi&utm_) (PEC)

    - Permite descargar datasets enteros.

3. [Consejo General del Poder Judicial](https://www.poderjudicial.es/cgpj/es/Temas/Estadistica-Judicial/) (CGPJ)

    - Tiene una BD que permite pregenerar un enlace reutilizable a una tabla.

4. [INEbase](https://www.ine.es/inebmenu/queesinebase.htm) (INE)

    - Es la plataforma digital del Instituto Nacional de Estadística (INE), y una de las plataformas de datos abiertos más relevante del estado.

    - La plataforma es muy sofisticada y ChatGPT usualmente es capaz de generar código que descargue datos de aquí a través de la API.

    - En realidad, los datasets de esta fuente se documentaban hasta ahora como procedentes de la Plataforma de datos abiertos del Gobierno de España: [datos.gob.es](https://datos.gob.es/es/). Es preferible directamente nombrar al INE, pues son los propietarios de los datos y los que los proporcionan.

5. [Dades Obertes Catalunya](https://analisi.transparenciacatalunya.cat/) (DOC)

    - Posibilidad de exportar y de API.

6. [Article de premsa a govern.cat](https://govern.cat/salapremsa/notes-premsa/420708/en-el-primer-any-de-funcionament-de-la-usav-s-han-ates-843-casos-de-violencies)

    - Es un artículo de prensa con tablas.

7. La Ciba (Ajuntament de Santa Coloma de Gramenet) (CIBA)

    - Envían datasets a IBOD.

Nota: estas fuentes no tienen por qué ser las originales, pero son de donde IBOD extrae los datos.

## Algunas conclusiones para cada fuente

### Fuente 1. [Portal Estadístico del Gobierno contra la Violencia de Género]((https://estadisticasviolenciagenero.igualdad.gob.es/)) (PEDG)

Este portal funciona con [Saiku](https://saiku.bi/), una capa de gestión por encima de lo que aparenta ser un *data warehouse*.

No ofrece archivos, sino que se debe seleccionar:

- Un ámbito de análisis

- Variables de análisis para las columnas

- Variables de análisis para las filas

De forma manual, te obliga a descargar, por tanto, un subset (una tabla) basado en los ejes seleccionados, que se puede guardar como CSV o Excel.

Con técnicas de scraping, se puede intentar generar el link de descarga de un subconjunto determinado. Se ha intentado hacer esto y, si bien se ha conseguido el enlace usando las herramientas de desarrollador, este caduca. Se debe descubrir cómo generar ese enlace y conseguirlo sin usar un navegador web.

Datasets fuente empleados:

- [dxvxm-generico-f_1-esp: Feminicidios en la pareja o expareja](./n1-PEDG-feminicidios.ipynb)

- [dxvxm-generico-f_2-esp: Huérfanos y huérfanas menores de edad en feminicidios](./n1-PEDG-feminicidios.ipynb)

- [dxvxm-generico-f_3-esp: Menores víctimas mortales de violencia de género](./n2-PEDG-feminicidios_victimas_menores.ipynb)

- [dxvxm-generico-f_4-esp: Denuncias por violencia en la pareja o expareja](./n3-PEDG-denuncias.ipynb)

- [dxvxm-generico-f_5-esp: Órdenes de protección](./n4-PEDG-ordenes_proteccion.ipynb)

La mayoría de estos datos se desagregan por CCAA y año, algunos también por provincia y partido judicial.

Está pendiente decidir si se estandarizan estas desagregaciones para que en un futuro sea más fácil generar productos territoriales.

- Es muy probable que cambie la forma en la que se descargan los datasets. También es probable que defina una serie de operaciones estandar a aplicar en todos ellos y que estandarice las columnas de las desagregaciones (que por alguna extraña razón no es estándar de por sí).

### Fuente 2: [Portal estadístico de Criminalidad](https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/datos.html?path=%2FDatos4%2F&title=Victimizaciones&type=jaxi&utm_) (PEC)

Este portal ofrece datasets bastante completos.

Los datasets, usando un navegador web, se pueden descargar enteros o filtrados.

Además, hay enlaces que permiten descargar el CSV completo. No hay garantías de que el enlace sea permanente, aunque tampoco de que caduque.

- ChatGPT saca fácilmente el enlace al CSV cuando se le proporciona el enlace normal del navegador a un dataset en concreto.

- Está pendiente buscar formas de descargar un subconjunto determinado.

- También está pendiente documentar la descarga manual, por si el enlace deja de funcionar.

Aunque por ahora solo se utilizan dos datasets, contiene otros interesantes que se podrían explorar.

Datasets fuente empleados:

- [dxvxm-generico-f_6-esp: Victimizaciones por tipología penal](./n5-PEC-victimizaciones.ipynb)

- [dxvxm-generico-f_7-esp: Hechos esclarecidos contra la libertad sexual](./n6-PEC-hechos_esclarecidos.ipynb)

Los datos se puden desagregar por CCAA y año, entre otros.

Ambos datasets tienen notas metodológicas. Si se consulta una selección de datos, abajo del todo, aparecen las notas (no parece que los asteriscos marquen ningún item en específico en la tabla).

- Victimizaciones por tipología penal:

(*) Se computan datos provenientes de la Policía Nacional, Guardia Civil, policías autonómicas, a excepción de la Ertzaintza, y policías locales que proporcionan datos al Sistema Estadístico de Criminalidad. No se incluyen datos de los Mossos d'Esquadra de homicidios dolosos / asesinatos consumados a partir de 2020 se encuentran incluidos. No se incluyen datos de los Mossos d'Esquadra de robos con fuerza o con violencia/intimidación en domicilios y establecimientos, ni de robos con violencia/intimidación en vía pública hasta el 2019 a partir de 2020 se encuentran incluidos. No se incluyen datos de los Mossos d'Esquadra hasta 2014 a partir de 2015 los Mossos d'Esquadra aportan datos de esta tipología delictiva.

(**) En agresiones sexuales con/sin penetración se computan agresiones sexuales con/sin penetración y abusos sexuales con/sin penetración.

- Hechos esclarecidos contra la libertad sexual:

(*) Se computan datos provenientes de la Policía Nacional, Guardia Civil, Policía Foral de Navarra y policías locales que proporcionan datos al Sistema Estadístico de Criminalidad en toda la serie histórica.
Los datos de la Ertzaintza se incluyen a partir del año 2019, y los datos de los Mossos d'Esquadra, se incluyen a partir de 2020.
Con respecto a la tipología delictiva de estafas informáticas, no se incluyen datos de los Mossos d'Esquadra ni Ertzaintza hasta 2014 a partir de 2015 están incluidos los datos de todos los cuerpos
policiales.

(**) En agresiones sexuales con/sin penetración se computan agresiones sexuales con/sin penetración y abusos sexuales con/sin penetración.

ChatGPT es el que me ha dado el aviso de la existencia de estas notas:

```
Hay una nota metodológica en la tabla que conviene no pasar por alto.

Los datos de Cataluña tienen particularidades relacionadas con la incorporación de los Mossos d'Esquadra al Sistema Estadístico de Criminalidad:

No se incluyen datos de Mossos d'Esquadra hasta 2014.

A partir de 2015 se incorporan datos para determinadas tipologías.

Para algunas categorías, como homicidios consumados y determinados robos, hay cambios de cobertura en 2020.

Esto puede afectar a las comparaciones temporales de Cataluña y generar rupturas estadísticas que no necesariamente reflejan cambios reales en la criminalidad.
```

### Fuente 3: [Consejo General del Poder Judicial](https://www.poderjudicial.es/cgpj/es/Temas/Estadistica-Judicial/) (CGPJ)

Se suben archivos periódicamente, lo que compromete la estandarización.

Los documentos son de diversos formatos, como PDF o Excel con diversas páginas.

La forma más sencilla de gestionar este dataset es haciendo que el usuario utilice una plantilla.

- Está pendiente ver si año tras año se mantiene el formato. Si es el caso, se puede automatizar parcialmente. Puede ser que emplear un LLM pemita automatizarlo casi completamente (solo haría falta descargar los archivos).

- ChatGPT ha encontrado una [base de datos](https://www6.poderjudicial.es/PXWeb-2025-v1/pxweb/es/11.-Juzgados%20de%20Violencia%20Sobre%20La%20Mujer/) que les pertenece. Se debe estudiar como opción.

    - Esta BD permite hacer subconsultas y generar enlaces reutilizables para descargar en una variedad de formatos.

    - Se debe [estudiar cómo aprovechar esto](./n7_0-CGPJ-BBDD.ipynb) y cómo conseguir las agrefaciones que aparecen, por ejemplo, en el PDF.

Datasets fuente empleados:

- [dxvxm-generico-f_8-esp: Porcentaje de condenas por violencia de género](./n7_1-CGPJ-porcentaje_condenas.ipynb)

- [dxvxm-generico-f_9-esp: Delitos contra la libertad e indemnidad sexual](./n7_2-CGPJ-delitos.ipynb)

Los datos se pueden desagregar en CCAA, provincias partidos judiciales y otros.

### Fuente 4: [INEbase](https://www.ine.es/inebmenu/queesinebase.htm)

Datasets fuente empleados:

- [dxvxm-generico-f_10-esp](./n8-INE-victimizaciones2.ipynb)

### Fuente 5: [Dades Obertes Catalunya]((https://analisi.transparenciacatalunya.cat/))

Este portal es muy sofisticado. Permite exportar un dataset entero a partir de un enlace permanente y tiene API pública.

Está construido con [Socrata](https://dev.socrata.com/), y permite ejecutar queries en formato SQL sobre un recurso (una tabla). La interfaz web también permite ejecutar consultar y ver la tabla conforme se va filtrando.

Datasets fuente empleados:

- [dxvxm-generico-f_11-cat](./n9-DOC-atencions_siad.ipynb)

- [dxvxm-generico-f_12-cat](./n10-DOC-atencions_tel.ipynb)

- [dxvxm-generico-f_13-cat](./n11-DOC-delictes.ipynb)

- [dxvxm-generico-f_14-cat](./n12-DOC-ambit_social.ipynb)

### Fuente 6: [Article de premsa a govern.cat](https://govern.cat/salapremsa/notes-premsa/420708/en-el-primer-any-de-funcionament-de-la-usav-s-han-ates-843-casos-de-violencies)

Esta fuente es un artículo que contiene algunos datos en tablas. No se actualiza.

- Pendiente de analizar

### Fuente 7: La Ciba (Ajuntament de Santa Coloma de Gramenet)

Estos datos se envían a IBOD, por lo que no tienen por qué ser públicos.

En según qué ocasiones, es necesario anonimizar los datasets.

- Pendiente de analizar
