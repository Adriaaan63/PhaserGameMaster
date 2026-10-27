Aquí tienes la redacción detallada y técnica para actualizar tu Documento de Diseño (GDD). Al adoptar una perspectiva 3/4 en un motor 2D, es altamente recomendable añadir una breve nota sobre el **Y-Sorting (Ordenación de Profundidad)** en el apartado mecánico, por lo que he incluido también un pequeño añadido para la sección 4.3.

Puedes integrar estos bloques directamente en tu documento:

---

### Inserciones para el Game Design Document (GDD)

#### 2. Game Overview

**2.5. Look and Feel – What is the basic look and feel of the game? What is the visual style?**
*(Reemplazar la descripción actual por esta versión ampliada)*
El juego se presenta en un estilo visual *pixel art* 2D que adopta una **perspectiva top-down (cenital) de tipo 3/4**. Este ángulo ligeramente inclinado permite visualizar tanto la parte superior como el frente de los objetos y personajes, otorgando una gran sensación de profundidad, volumen y tridimensionalidad al entorno.

La paleta de colores y la atmósfera beben directamente de la estética de "universo usado" de Mos Eisley:

* **Contraste Lumínico:** La luminosidad cegadora y cálida del desierto de Tatooine durante el día contrasta fuertemente con la penumbra claustrofóbica, polvorienta y saturada de neón del interior del bar por la noche.
* **Texturas y Desgaste:** Todo el mobiliario, los recipientes y las estaciones de servicio utilizan tonos apagados y sucios (grises, blancos amarillentos, marrones y verdes militares). Los objetos tienen contornos integrados (sin usar negro puro) y muestran signos de desgaste, óxido y "mugre espacial". Todo esto ocurre con el ritmo estridente del *Jizz* espacial sonando de fondo.

#### 9. Interface

**9.4. Game Art – intended style**
*(Añadir esta nueva sección que estaba vacía/sin detalle)*
El estilo artístico está diseñado para equilibrar la densidad visual de un juego de gestión con la claridad necesaria para la acción, tomando inspiraciones de títulos como *Stardew Valley*:

* **Tamaño Base de Cuadrícula:** El mundo se construye sobre una rejilla de *tiles* estándar de **32x32 píxeles** para la estructura del suelo, paredes y cuadrículas de colisión.
* **Proporciones de Personajes:** Los personajes principales (como Wuher y los clientes) tienen un diseño alargado. Su proporción es el doble de alto que un *tile* estándar de ancho (ocupando un espacio visual aproximado de 32x64 píxeles). Esto les otorga mayor legibilidad anatómica y presencia en pantalla frente al mobiliario.
* **Escala Asimétrica de Objetos:** Aunque la cuadrícula lógica es de 32x32, los elementos clave del entorno (como la gran Barra en "U", la Torre Central de bebidas, la parrilla o grandes rocas en el exterior) rompen esta escala estricta. Son dibujados como piezas mucho más grandes que abarcan múltiples *tiles* para ganar detalle y presencia visual sin romper la armonía del *pixel art*.
* **Vistas Direccionales:** Debido a la perspectiva 3/4, todos los *sprites* móviles y el mobiliario interactuable están compuestos obligatoriamente por sus 4 vistas cardinales (frente, espalda, y perfiles laterales) para mantener la coherencia geométrica cuando el jugador se mueva alrededor de ellos.

#### Sugerencia de Adición: 4. Mechanics (Key Section)

*Si usamos perspectiva 3/4 y personajes más altos que los tiles, es obligatorio que el motor sepa qué dibujar delante y qué detrás para mantener la ilusión de 3D. Te recomiendo añadir esta breve nota en el apartado de físicas.*

**4.3. Physics**
*(Añadir esta línea al final del apartado 4.3)*

* **Y-Sorting (Profundidad Visual):** Al utilizar una perspectiva 3/4 con personajes de proporciones altas (32x64) moviéndose en un grid de 32x32, el motor (Phaser) debe actualizar constantemente la profundidad de dibujado (`depth` o `Z-index`) de todos los *sprites* basándose en la coordenada "Y" de su punto de anclaje (los pies). Esto garantiza que si Wuher camina por detrás de la barra, su cuerpo quede oculto, pero si camina por delante, se superponga visualmente al mueble.