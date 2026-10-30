A continuación, se presenta el Documento de Diseño de Juego (Game Design Document - GDD) estructurado según la plantilla solicitada y rellenado exclusivamente con la información extraída de los documentos `GameConcept.md` y `MiniGdd.md`.

---

# Game Design Document

## 1. Title Page

* **1.1. Game Name:** Chalmun's Cantina: Mos Eisley Hustle.

* **1.2. Team:** Adrian Castellanos.


## 2. Game Overview

* **2.1. Game Concept:** Es un juego de gestión caótica y acción roguelite desarrollado en Phaser 4, en el cual el jugador toma el control de Wuher, el tabernero de Mos Eisley.


* **2.2. Target Audience:** Jugadores mid-core, fans de Star Wars (12+) y amantes de los juegos de gestión caótica y simuladores de restaurantes con progresión.


* **2.3. Genre(s):** Gestión de Tiempo / Action-Roguelite.


* **2.4. Game Flow Summary:** El flujo de juego se divide en 3 fases conectadas por un Ciclo Día/Noche:


* **Fase Diurna:** Sin límite de tiempo, el jugador explora la Plaza de Mos Eisley (Hub) para comerciar y hace una incursión al Desierto para combatir y recolectar ingredientes.


* **Fase Pre-Apertura:** Al caer los soles, se usa un Modo Construcción (Grid Tiled) y un Libro de Gestión para preparar la cantina y el menú.


* **Fase Nocturna:** Un turno frenético de 3 a 4 minutos enfocado en sentar clientes, atenderlos, cobrar y evitar eventos como peleas o inspecciones imperiales.




* **2.5. Look and Feel:** El juego se presenta en un estilo visual *pixel art* 2D que adopta una **perspectiva top-down (cenital) de tipo 3/4**. Este ángulo ligeramente inclinado permite visualizar tanto la parte superior como el frente de los objetos y personajes, otorgando una gran sensación de profundidad, volumen y tridimensionalidad al entorno.

    La paleta de colores y la atmósfera beben directamente de la estética de "universo usado" de Mos Eisley:

    * **Contraste Lumínico:** La luminosidad cegadora y cálida del desierto de Tatooine durante el día contrasta fuertemente con la penumbra claustrofóbica, polvorienta y saturada de neón del interior del bar por la noche.
    * **Texturas y Desgaste:** Todo el mobiliario, los recipientes y las estaciones de servicio utilizan tonos apagados y sucios (grises, blancos amarillentos, marrones y verdes militares). Los objetos tienen contornos integrados (sin usar negro puro) y muestran signos de desgaste, óxido y "mugre espacial". Todo esto ocurre con el ritmo estridente del *Jizz* espacial sonando de fondo.




## 3. Gameplay

* **3.1. Objectives:** El objetivo es transformar un antro de mala muerte en la cantina de contrabando más infame de la galaxia, sobreviviendo a clientes armados y ratas. Se debe gestionar un polvorín social equilibrando a las facciones criminales.


* **3.2. Game Progression:** No sigue una campaña lineal; la progresión es sistémica y emergente, forjando reputación en el mercado negro de Jabba el Hutt o consiguiendo recompensas imperiales. Al avanzar los días, los ingresos se pueden usar para comprar mejoras de mobiliario o contratar NPCs que automatizan tareas.


* **3.3. Play Flow:** El bucle principal nocturno sigue los siguientes pasos: Entrada (Detector Droides) ➔ Sentar (Cuidar Afinidad Racial) ➔ Atender (Bebida/Comida/Música) ➔ Cobrar (Evitar Ratas) ➔ Eventos (Peleas / Imperio) ➔ Salida.


* **3.4. Mission/challenge Structure:** Los retos se presentan a través de las incursiones diarias de caza peligrosas en el exterior. En el interior, los desafíos surgen de eventos sistémicos, como clientes en Busca y Captura (*Wanted*) que el jugador debe decidir si encubrir o delatar al Imperio.


* **3.5. Puzzle Structure:** Funciona como un puzle táctico en tiempo real en la fase de sentado, gracias a una "Rueda de Afinidades" donde mezclar razas enemigas duplica la velocidad en la que cae su paciencia.



## 4. Mechanics (Key Section)

* **4.1. Rules:**
* **Reglas de Colocación (Modo Pre-Apertura):**
    * El jugador no puede colocar mesas ni sillas en áreas restringidas del mapa: `zonaBarra/Cocina`, `zonaBanda`, `zonaAlmacen`, `zonaColaEntrada`, ni sobre los `spawns` (de Wuher o de Ratas) ni fuera de las paredes delimitadoras de la cantina.
    * Una mesa ocupa 1 o 4 *tiles* (dependiendo del tipo). No puede superponerse a otra mesa, pared o bloque sólido.
    * Al arrastrar un objeto desde el inventario al mapa, se proyecta un "fantasma" (*ghost image*) sobre el tile objetivo. Este se ilumina en **verde** si la colocación es válida (respeta las restricciones zonales y está libre), y en **rojo** si el tile pertenece a una zona restringida o ya está ocupado.
    * El turno nocturno no puede iniciarse si el jugador no ha colocado el mobiliario necesario según lo dictaminado en el Libro de Gestión (al menos 1 mesa y 2 sillas activas).


* Cualquier silla sin una mesa o barra adyacente queda inactiva (`SILLA_INACTIVA`).


* Sentar a una raza junto a su rival (ej. Wookiees y Trandoshanos) en la misma mesa o barra contigua genera un icono de rayos rojos y acelera su enfado.


* **Reglas de Manipulación de Objetos (Modo Nocturno / Servicio):**
    * **Capacidad de Carga:** El jugador (Wuher) tiene una capacidad de carga estrictamente limitada a **un solo objeto a la vez** en sus manos (ej. una jarra de Juri Juice, un plato de comida o una jarra vacía).
    * **Bloqueo de Interacción:** Si el jugador ya tiene un objeto en las manos, no podrá recoger otro ni interactuar con los dispensadores de bebidas hasta que se deshaga del objeto actual (entregándolo o dejándolo sobre una superficie válida).
    * **Superficies Válidas:** Los objetos interactuables solo pueden soltarse sobre superficies designadas como "mostradores" (la barra) o "mesas". No se pueden tirar al suelo (intentar hacerlo no ejecutará ninguna acción).

* **Reglas de Suministro y Preparación:**
    * **Bebidas (Torre Central):** Para servir una bebida, Wuher debe coger un vaso vacío y colocarse frente a la Torre Central (situada en la `zonaCocina`). El llenado no es instantáneo; requiere mantener presionada la tecla de Acción (`Espacio`) durante un tiempo determinado (ej. 2 segundos). Si se suelta la tecla antes de tiempo, el llenado se cancela.
    * **Comida (Parrilla):** La cantidad de comida disponible durante la noche depende estrictamente de lo que el jugador haya conseguido (o se le haya otorgado) en la Fase Diurna exterior. Los clientes solo pedirán comida si hay unidades en el HUD; una vez que el contador llegue a cero, ningún cliente nuevo pedirá platos esa noche.
    * **Estaciones Fijas:** La Torre Central y la Parrilla son inamovibles. El jugador debe acercarse a sus *tiles* específicos para interactuar con ellas.
    
* **Reglas del Flujo de Clientes y Asignación:**
    * **Spawn de Clientes:** Los clientes se generan dinámicamente en los tiles etiquetados mecánicamente como `zonaColaEntrada`. La tasa de aparición (frecuencia) es dictada por un sistema de dificultad procedural que escala con el paso de los días dentro de la partida, aumentando la cantidad y el ritmo de llegada de los clientes.
    * **Sistema de Paciencia (Cola):** Nada más generarse en la entrada, cada cliente inicia con una "Barra de Paciencia" (o medidor de estado). Este valor disminuye gradualmente mientras el cliente espera de pie. Si no es atendido (asignado a una silla) antes de que la paciencia llegue a cero, el cliente abandonará la cantina por la puerta, penalizando la reputación del jugador.
    * **Regla de Sillas Huérfanas (Restricción de Asignación):** El jugador solo puede sentar clientes en sillas operativas. Cualquier silla en el mapa que no tenga al menos una MESA o una BARRA en sus tiles ortogonalmente adyacentes se considera una **Silla Huérfana**. Estas sillas reciben un identificador de estado `SILLA_INACTIVA` y no se pueden seleccionar como destino para ningún cliente.
    * **Restricción de Ocupación:** Un cliente solo puede ser asignado a un tile de Silla que actualmente se encuentre libre (sin otro cliente ni evento de destrucción).
* **Reglas de Pedidos y Paciencia de Servicio:**
    * Una vez que un cliente se sienta en su silla asignada, el sistema genera aleatoriamente un pedido (Bebida, Comida o Música).
    * Al generar el pedido, el cliente recibe una nueva "Barra de Paciencia de Servicio". Este es un temporizador independiente al de la cola, y su duración inicial depende del tipo de pedido y de la clase del cliente.
    * Si la paciencia llega a cero antes de recibir el objeto correcto, el cliente abandonará la mesa enfadado, sin dejar propina y afectando negativamente a la reputación.
    * Si Wuher le entrega el ítem correcto antes del tiempo límite, el cliente pasa a estado de "Satisfecho" y emite el pago.
* **Reglas de Economía Física:**
    * El pago no se suma automáticamente al contador del jugador. Al ser satisfecho, el cliente "lanza" físicamente un número de monedas (Créditos) al suelo, alrededor de su tile actual.
    * Las monedas tienen un tiempo de vida (desaparecen si se ignoran durante mucho tiempo) y son vulnerables a ser robadas por eventos (ej. Scurriers).

* Si el jugador muere en la incursión exterior, pierde el botín recolectado.




* **4.2. Model of the game universe:** El universo se divide mecánicamente en *capas lógicas de cuadrícula*. El interior de la cantina no es solo un suelo plano, sino que cuenta con un mapa de metadatos (zonas) invisible para el jugador pero crítico para el sistema. El `GridManager` clasifica cada tile (ej. Tile 5x8 = "Suelo Libre", Tile 12x4 = "Zona Prohibida: Banda"). Todas las piezas interactúan bajo este modelo: los clientes buscan "Suelos Libres" adyacentes a "Mesas" para caminar, el jugador solo puede colocar muebles en "Suelos Libres", y las ratas generan sus rutas de robo desde los *tiles* catalogados como `spawnRatas`.
El universo de la cantina modela a los clientes no como simples *sprites*, sino como **Agentes Estatales Dinámicos** vinculados al `GridManager`.
    1. **Fase Espera:** El cliente existe en un tile de la `zonaColaEntrada`. El universo verifica por cada cliente su "paciencia", siendo un temporizador que decae.
    2. **Fase Asignación (Jugador):** El universo entra en un modo de "selección". El jugador, al interactuar con el cliente, habilita un sub-sistema que escanea todas las sillas del `GridManager`. Filtra y resalta únicamente aquellas que tienen el estado `ACTIVA` (conectadas a mesa/barra y libres).
    3. **Fase Tránsito:** Una vez que el jugador vincula al cliente con la silla destino, el cliente cambia su estado a `MOVIÉNDOSE`. El universo invoca al sistema de *Pathfinding* (A*) para trazar la ruta más corta desde la entrada hasta el tile de la silla, esquivando muros y otros clientes estáticos. Al llegar, el cliente se ancla al tile de la silla, cambiando su animación a "Sentado".

* **Máquina de Estados del Cliente Expandida:**
    1. `WAITING_IN_LINE` -> 2. `MOVING_TO_CHAIR` -> 3. `SEATED_WAITING_ORDER` (El cliente genera un pedido y su paciencia decae) -> 4. `SATISFIED` (Recibe el ítem, lanza monedas y se levanta) -> 5. `LEAVING`.
* **Entidades Económicas:** Las monedas (Créditos) se modelan como entidades físicas en el mundo (`DropEntities`), no como simples valores numéricos. Son instanciadas por el `Client` pero gestionadas por el motor de físicas del juego.


* **4.3. Physics:** El mundo funciona en una cuadrícula 2D, utilizando algoritmos de *pathfinding* (A*) para que los clientes se muevan por las puertas sin chocar.
    * **Y-Sorting (Profundidad Visual):** Al utilizar una perspectiva 3/4 con personajes de proporciones altas (32x64) moviéndose en un grid de 32x32, el motor (Phaser) debe actualizar constantemente la profundidad de dibujado (`depth` o `Z-index`) de todos los *sprites* basándose en la coordenada "Y" de su punto de anclaje (los pies). Esto garantiza que si Wuher camina por detrás de paredes, su cuerpo quede oculto, pero si camina por delante, se superponga visualmente.
    * **Recolección por Colisión (Trigger):** Las monedas arrojadas por los clientes no requieren interacción manual (no se usa `Espacio`). Tienen un *collider* de tipo "Trigger" (sensor). Cuando el cuerpo físico de Wuher se solapa con el *bounding box* de la moneda, esta es destruida del mundo físico y su valor se transfiere a la economía del jugador.


* **4.4. Economy:**
* La economía principal se basa en la **Recolección Activa** Basada en **Créditos Imperiales** que los clientes lanzan al aire tras consumir..
    * **Fórmula de Pago (Prototipo):** La cantidad de monedas soltadas dependerá del valor base del ítem entregado multiplicado por un modificador de propina (basado en cuánta paciencia le sobraba al cliente). El valor exacto y el ratio de *drop* están centralizados en un Gestor de Datos (Data Registry) para facilitar el equilibrado progresivo del juego.


* Se utiliza para comprar chatarra, vasos extra, decoración, barriles y sueldos diarios de mercenarios o empleados de apoyo.


* Las decisiones morales impactan la economía: delatar fugitivos otorga recompensas rápidas; ocultarlos brinda propinas enormes y sube la reputación.


* Se pierden ingresos por clientes asesinados en peleas o por monedas robadas por ratas.




* **4.5. Character movement in the game:** Se realiza con las teclas `W, A, S, D` (movimiento en 8 direcciones) y cuenta con un pequeño *Dash* usando `Shift` para emergencias.


* **4.6. Objects:** La recolección de objetos (monedas, platos, vasos, barriles) se ejecuta con las manos vacías presionando `Espacio`.
    * **Objetos de Mobiliario (Modo Pre-Apertura):** Se manejan exclusivamente a través de la Interfaz Gráfica de Usuario (GUI) y el ratón, **solo cuando el "Modo Construcción" está activado**. Para mover un objeto (mesa, silla, decoración):
        1. El jugador abre el Inventario pulsando el botón correspondiente en la interfaz (o mediante el Libro de Gestión).
        2. Hace *Clic Izquierdo* y mantiene pulsado sobre un objeto del inventario (Mesa, Silla).
        3. Arrastra el cursor sobre la cuadrícula del tilemap. El juego ajusta ("*snapping*") la posición del objeto al tile más cercano, mostrando el indicador visual verde/rojo.
        4. Al soltar el *Clic Izquierdo* (`Drag End`), si el indicador es verde, el objeto se fija al suelo y se retira del inventario. Si es rojo, la acción se cancela y el objeto regresa al inventario.
        5. **Para quitar un objeto ya colocado:** El jugador hace *Clic Izquierdo* sobre el mueble en el mapa para devolverlo al inventario, liberando el tile. **Importante:** Esta acción está estrictamente deshabilitada si el "Modo Construcción" está inactivo, previniendo que el jugador borre mesas por accidente durante el servicio nocturno.
    * **Objetos Interactuables (Jarras, Comida):** El sistema de físicas y recolección imita el flujo de trabajo de *Overcooked*.
        * **Coger (Pick up):** Cuando el jugador tiene las manos vacías y se acerca a un objeto apoyado en una superficie (ej. una jarra en la barra), al mirar hacia él y presionar la tecla de Acción (`Espacio`), el objeto desaparece de la cuadrícula del mapa y pasa a renderizarse visualmente en las manos del sprite de Wuher. El estado del jugador cambia a `HOLDING_OBJECT`.
        * **Mover:** Mientras se sostiene el objeto, este sigue la posición y orientación del jugador en todo momento.
        * **Soltar / Entregar (Drop / Deliver):** Cuando el jugador lleva un objeto y se acerca a una superficie libre (ej. una mesa vacía) o a un cliente que ha pedido ese ítem exacto, al presionar nuevamente la tecla de Acción (`Espacio`), el objeto se desvincula de las manos del jugador. Si es una mesa, el objeto hace *snap* (se ajusta) al centro del tile de la mesa. Si es un cliente, el objeto se destruye (se consume) y se inicia la lógica de pago.
    * **Gestión de Estaciones de Servicio:**
        * **Interactuar con la Torre Central:** Wuher debe estar en estado `HOLDING` con un "vaso vacío". Al mirar hacia la Torre Central, mantener `Espacio` transforma el "vaso vacío" en "vaso lleno" (Juri Juice, Leche Azul, etc., dependiendo del dispensador o menú activo) tras completar una pequeña barra de progreso.
        * **Recoger de la Parrilla:** Cuando un cliente pide comida, Wuher se acerca a la Parrilla con las manos vacías (estado `EMPTY`). Al pulsar `Espacio`, se resta una unidad del inventario global de comida de esa noche, y Wuher pasa al estado `HOLDING` con un "Plato de Comida" en las manos, listo para ser entregado.
    * **Objetos Consumibles (Físicos):** Las monedas ("Créditos") son objetos instanciados dinámicamente en el suelo. Se recogen simplemente caminando sobre ellas. Su recolección es independiente del sistema de "Manos Ocupadas" (estado `HOLDING`), por lo que Wuher puede recoger monedas del suelo incluso si lleva un plato de comida en las manos.


* **4.7. Actions:** 
* **Ratón (Clic Izquierdo):** Su función principal es sensible al contexto y se divide en dos estados controlados por un "Botón de Modo Construcción" en el HUD:
  * **Con Modo Construcción ACTIVADO:** El clic izquierdo sirve exclusivamente para arrastrar muebles desde el inventario al mapa (Drag & Drop) y para hacer clic sobre muebles ya colocados para devolverlos al inventario.
  * **Con Modo Construcción DESACTIVADO (Modo Servicio):** El clic izquierdo ignora el mobiliario. Se utiliza para la mecánica de Asignación de Clientes: al tener un cliente seleccionado, hacer clic izquierdo sobre una silla válida le asigna esa ruta.

    * **Gestión (Modo Día / Pre-Apertura):**
        * `Ratón (Clic / Drag & Drop)`: Herramienta principal. Se utiliza para interactuar con los botones de la interfaz (Abrir Cantina, Libro de Gestión, Inventario) y para el sistema de colocación de mobiliario.
            * **Con Modo Construcción ACTIVADO:** El clic izquierdo sirve exclusivamente para arrastrar muebles desde el inventario al mapa (Drag & Drop) y para hacer clic sobre muebles ya colocados para devolverlos al inventario.
        * `Indicadores Visuales de Comunicación`: El juego comunica las reglas implícitamente al jugador usando colores en tiempo real durante la acción de arrastrar (Verde = Válido / Rojo = Inválido). También comunica errores de silla mediante un icono de exclamación amarillo si se coloca una silla sin mesa adyacente.
    * **Acción Contextual Principal (Tecla `Espacio`):** El comportamiento de esta tecla depende enteramente de la máquina de estados del jugador (si sus manos están vacías o llenas) y del objeto/tile que tenga justo enfrente (basado en su vector de dirección):
        * **Con las manos VACÍAS (`State: EMPTY`):**
            * *Frente a la Parrilla:* Si hay comida disponible en el inventario del HUD, recoge un plato de comida (pasa a estado `HOLDING`). Si el inventario es 0, no ocurre nada o suena un error.
            * *Frente a un vaso vacío:* Lo recoge (pasa a `HOLDING`).
            * *Frente a un cliente esperando:* Lo saluda y le asigna una mesa.
            * *Frente a una pelea / rata:* Usa el garrote para atacar/espantar.
        * **Con las manos OCUPADAS (`State: HOLDING`):**
            * *Frente a la Torre Central (SOLO si sostiene vaso vacío):* Al mantener pulsado `Espacio`, inicia el llenado. Al soltar o terminar, el objeto sostenido cambia a "vaso lleno". Si sostiene un plato de comida, la acción se bloquea.
            * *Frente a la Mesa:* apoya el objeto.
            * Frente al Cliente Sentado: Al presionar `Espacio`, el juego verifica si el ítem que sostiene Wuher coincide con el identificador del pedido del cliente. Si coincide, el ítem se destruye de las manos de Wuher (pasa a `EMPTY`), el cliente lanza el pago al aire y se levanta. Si no coincide, el juego emite un feedback visual/sonoro de rechazo y el jugador conserva el ítem.
        
    * El uso del ratón (`Clic Izquierdo / Derecho`) está limitado a la interfaz de usuario, tiendas y arrastrar mobiliario.

    * **Acción Contextual de Sentar al Cliente:** El jugador realiza la asignación en dos pasos para mantener el dinamismo y evitar interfaces intrusivas que pausen el juego (manteniendo el tono de *Time Management* frenético):
        1. **Selección del Cliente:** Wuher debe acercarse al cliente que está esperando en la cola y presionar la Tecla de Acción (`Espacio`). En este momento, el cliente pasa a un estado visual de "Seleccionado" (ej. un brillo en su contorno).
        2. **Selección del Destino (Asignación):** Con el cliente seleccionado, el jugador con Modo Construcción DESACTIVADO (Modo Servicio), el clic izquierdo ignora el mobiliario. Se utiliza para la mecánica de Asignación de Clientes: al tener un cliente seleccionado, hacer clic izquierdo sobre una silla válida le asigna esa ruta..
            * *Feedback Positivo:* El cliente asiente o muestra un icono, y comienza a caminar hacia la mesa de forma autónoma.
            * *Feedback Negativo:* Si el jugador intenta asignar al cliente a una `SILLA_INACTIVA` (silla huérfana), sonará un efecto de sonido de error (buzzer) y la acción no se registrará.

* **4.8. Combat:**
* **En la Cantina:** Si la paciencia entre clientes rivales llega a cero, entran en estado `PELEA`. El jugador debe intervenir (`Espacio`). Si no lo hace, se generan disparos de bláster o golpes letales, lo que resulta en cadáveres, mobiliario destruido (`DESTRUIDO`) y la llegada de *Sandtroopers*.


* **En las Afueras:** Las incursiones son combates *top-down* de esquiva y golpe contra bestias o campamentos.




* **4.9. Screen Flow:** Se navega desde la pantalla exterior (Hub o Incursión), pasando a una pantalla de preparación y finalmente a la pantalla principal de servicio en la taberna.


* **4.10. Game Options:** (No aplicable).
* **4.11. Replaying and saving:** (No aplicable / Roguelite basado en carreras diarias).
* **4.12. Cheats and Easter Eggs:** El jugador puede obtener un ingrediente secreto al limpiar el cadáver de un alienígena, para así destilar el "Trago Especial" que se vende mucho más caro.



## 5. Story and Narrative

* **5.1. Back story:** El jugador controla a Wuher, el tabernero malhumorado y xenófobo.


* **5.2. Plot elements:** Giran en torno a decisiones morales y supervivencia frente a amenazas tanto criminales como imperiales, incluyendo encubrir criminales o delatarlos a los *Sandtroopers*.


* **5.3. Game story progression:** La historia progresa al transformar gradualmente el local en un recinto infame en el mercado negro, equilibrando la reputación criminal.


* **5.4. Cut scenes:** (No aplicable).

## 6. Game World

* **6.1. General look and feel of world:** La estética transita entre la intensa luz de los soles gemelos en Tatooine durante el día y una taberna llena de humo, neones y oscuridad por la noche.


* **6.2. Areas:**
* **6.2.1-6.2.2. La Calle Comercial de Mos Eisley:** Mapa seguro sin combate para comerciantes como Watto, la Agencia de Mercenarios y el Mercado Negro.


* **6.2.1-6.2.2. Desierto de Tatooine:** Mapa de acción para incursiones, habitado por *Banthas*, *Womp Rats*, Jawas y *Tusken*.


* **6.2.1-6.2.2. La Cantina:** Estructurada en *tiles*, cuenta con la Barra en "U", una Puerta Principal (con Detector de Droides) para formar la cola, una Puerta Trasera de salida y el Escenario de la Banda.





## 7. Characters

* **7.1. For each character / 7.3. Non-combat and Friendly Characters:**
    * **Wuher:** Personaje controlado por el jugador.


    * **Tork (Portero):** Empleado contratable que patrulla, detiene peleas y limpia cadáveres automáticamente.


    * **Ackmena (Camarera):** Ayudante que recoge vasos y sirve bebidas.


    * **Bomo (Chef):** NPC que prepara automáticamente los platos en la estación de comida.


    * **Garindan:** Espía oculto que el jugador puede usar como transmisor para delatar clientes.




* **7.2. Artificial Intelligence Use in Opponent and Enemy:**
    * **Scurriers / Ratas Womp:** Enemigos ladrones que corren desde la ventilación para robar monedas.


    * **Sandtroopers:** Oficiales que patrullan y buscan criminales o contrabando por el bar.


    * **Clientes (5 Facciones):** Los Wookiees, Trandoshanos, Rodianos, Aqualish e Ithorianos poseen IA basada en la rueda de afinidad. Se enfadan si se sientan cerca de facciones contrarias.





## 8. Levels
**8.1. Training Level**

* El Día 1 funcionará como un nivel de entrenamiento seguro. El jugador es recibido por un breve cuadro de texto de Chalmun (el dueño) explicando las reglas básicas. En este nivel no hay peleas extremas ni ratas ladronas. El jugador es guiado de la mano para:
1. Abrir el inventario y colocar obligatoriamente 1 mesa y 2 sillas (verificando que entiende la mecánica de verde/rojo).
2. Asignar una bebida básica en el Libro de Gestión.
3. Iniciar el turno (Noche) para servir a un único cliente con paciencia ilimitada.



**8.2. For each level (El Bucle de Días Sucesivos)**

* **8.2.1. Synopsis:** Cada "nivel" representa un nuevo ciclo de 24 horas (Día y Noche) en Tatooine.
* **8.2.2. Required introductory material:** Antes de abrir, el jugador revisa su "Libro de Gestión" (Menú) que le informa de las condiciones del día (ej. "Llegan contrabandistas hoy", o "Alta actividad de Sandtroopers").
* **8.2.3. Objectives:** Sobrevivir al turno nocturno maximizando ganancias, evitando muertes en el local y sin perder la recaudación a manos de los Scurriers.
* **8.2.4. Details of what happens in the level:**
* **8.2.4.1. Map:** Exterior (desierto o calle comercial para reabastecimiento) y posteriormente el interior estático de la cantina.
* **8.2.4.2. Critical path:** Recolectar stock $\rightarrow$ Distribuir mesas $\rightarrow$ Asignar menú $\rightarrow$ Abrir puertas $\rightarrow$ Ciclo rápido de servicio y limpieza $\rightarrow$ Fin del día.
* **8.2.4.3. Important and incidental encounters:** Encuentros incidentales con clientes marcados como `Wanted` (Busca y Captura) y patrullas de Inspectores Imperiales que modifican drásticamente el comportamiento estándar del servicio.



## 9. Interface

* **9.1. Visual System:**
* **9.1.1. HUD:** Cuenta con iconos sobre las cabezas de los clientes (globos con sus pedidos de comida, música o bebida), un icono de advertencia sobre asientos mal ubicados, temporizadores circulares de paciencia y un icono de "¡Soplón!" si el jugador delata a alguien en público.
    * En modo **Pre-Apertura**: 
        * **Botón Toggle "Modo Construcción":** 
            * En la fase de Pre-Apertura (y opcionalmente durante el día), el HUD muestra un botón flotante (icono de un martillo o plano) que permite alternar el "Modo Construcción".
            * **Al activarlo:** Despliega la "Barra de Herramientas del Inventario" en la parte inferior de la pantalla y habilita la manipulación de muebles en el mapa (Drag & Drop y eliminación). Muestra iconos de los muebles disponibles con un número de *stock*. Durante el arrastre (*Drag & Drop*), el HUD dibuja dinámicamente un cuadrado verde o rojo transparente sobre la celda (*tile*) seleccionada por el puntero.
            * **Al desactivarlo:** Oculta la barra de inventario y bloquea cualquier interacción de construcción con los muebles, despejando la pantalla y los controles (inputs) para las mecánicas de servicio y asignación de clientes.
        * Incluye un gran botón flotante de "Abrir Cantina" en la esquina superior derecha. 
    * En modo **Nocturno (Apertura)**:
        * **Inventario Dinámico de Suministros:** Durante el servicio nocturno, se mostrará en una esquina de la pantalla (ej. superior izquierda) un contador visual de los suministros de comida conseguidos en el exterior (ej. icono de un filete de Bantha: "x5"). Este número disminuye en tiempo real cada vez que Wuher saca un plato de la Parrilla. Si llega a 0, el icono se vuelve gris o muestra un aspa roja para indicar agotamiento.
        * **Barra de Progreso de Interacción:** Al mantener pulsado `Espacio` en la Torre Central, aparecerá una pequeña barra de carga (progress bar) flotando justo encima de Wuher o del surtidor, llenándose de izquierda a derecha. Se vacía inmediatamente si el jugador suelta el botón antes de tiempo.

    * El sistema de información en pantalla integra el *feedback* directamente sobre los objetos del mundo (*Diegetic HUD*) para evitar saturar la interfaz de pantalla:
        * **Temporizador de Paciencia (Cola):**
            * Sobre la cabeza de cada cliente esperando en la entrada, aparece un pequeño globo de pensamiento o un icono circular que actúa como temporizador (similar a un reloj de arena o un diagrama de tarta vaciándose).
            * Este icono cambia de color para transmitir urgencia: **Verde** (Acaba de llegar), **Amarillo/Naranja** (Perdiendo paciencia) y **Rojo Parpadeante** (A punto de irse).
        * **Feedback Visual de Sillas (Asignación):**
            * **Sillas Huérfanas:** Para evitar frustraciones, todas las sillas colocadas por error sin una mesa reciben una marca permanente: un pequeño icono rojo de advertencia o un aspa flotando sobre el tile de la silla, indicando su estado `INACTIVA`.
            * **Modo Selección de Destino:** Cuando Wuher "selecciona" a un cliente en la entrada, todas las sillas válidas (disponibles y conectadas) resaltan sutilmente en el mapa (por ejemplo, con un suave parpadeo verde en el suelo, o un icono de flecha hacia abajo sobre ellas). Esto permite al jugador identificar instantáneamente a golpe de vista dónde hay huecos libres en el frenesí de la noche.
        * **Feedback Visual Diegético de Pedidos:** 
            * Tan pronto como un cliente se sienta, aparece sobre su cabeza un **globo o bocadillo cuadrado** (similar al estilo de *Meadgard*).
            * En el centro de este cuadrado se renderiza un icono que identifica claramente lo que desea (ej. un filete para Comida, una jarra para Bebida).
            * **Paciencia Dinámica Integrada:** El fondo de este bocadillo cuadrado, actúa como el temporizador visual. Se vacía progresivamente (como una barra vertical de color) cambiando de Verde a Rojo, indicando al jugador exactamente cuánto tiempo le queda para completar ese servicio específico antes de fracasar.

* **9.1.2. Menus:** El "Libro de Gestión" donde se elige el menú y las mejoras antes de la apertura. Menú a pantalla completa (o *overlay* grande) accesible antes de iniciar el turno nocturno. En él, el jugador decide qué tipos de bebidas cargar en los tanques (`zonaCocina`), selecciona qué comidas estarán disponibles (basándose en los recursos del almacén) y gestiona los contratos del personal extra.


* **9.1.3. Camera model:** El modelo de cámara de *Chalmun's Cantina: Mos Eisley Hustle* varía dependiendo de la fase de juego (Día/Noche) y la escena activa, adaptándose a las necesidades mecánicas de cada entorno. El juego utiliza un sistema de coordenadas dual: el sistema lógico del mundo (píxeles/tiles) y el "Viewport" (la ventana que renderiza la escena en pantalla), aplicando un escalado general (ej. `ROOM_SCALE = 2`) para la estética *pixel art*.
    #### A. Interior de la Cantina (`NightCantinaScene`)
    Durante la fase de gestión y servicio, el jugador necesita tener un control total de la situación espacial, prever por dónde entran los clientes y reaccionar rápidamente a eventos (como un Scurrier robando monedas en la otra punta del local). Por tanto, la cámara ofrece una opcion:

    1. **Cámara Global Fija (Por Defecto):**
    La cámara, manejada a través de `this.cameras.main`, bloquea su *viewport* para abarcar la totalidad de la cuadrícula jugable de la cantina (ej. los $24 \times 15$ tiles correspondientes a `ROOM_W` y `ROOM_H` definidos en las constantes). El jugador (Wuher) se mueve libremente por el mapa, pero la cámara **no le sigue**. Esta vista es estática, permitiendo observar simultáneamente la puerta de entrada, la barra, el escenario y todas las mesas, emulando la sensación de un tablero de gestión clásico.

    #### B. Mundo Exterior (`DayExplorationScene` / Hub)
    Para la fase de exploración (tanto en la Calle Comercial como en el Desierto de Tatooine), el juego adopta un **modelo de cámara estática por zonas (o "habitaciones")**, idéntico al analizado en el ejemplo de desarrollo (*Zelda top-down*). El objetivo es crear un mapa continuo, pero segmentando la acción y los enemigos por áreas lógicas para controlar el rendimiento y el ritmo del combate.

    El funcionamiento de este sistema se basa en tres reglas:

    1. **Desvinculación del Jugador:**
    Al igual que en la cámara fija de la cantina, el método `startFollow()` **no se utiliza**. El jugador se desplaza por un mapa continuo y masivo, pero la cámara se queda fija mostrando una única sección (una "sala" equivalente a `ROOM_PX_W` y `ROOM_PX_H`).
    2. **Cálculo de Transición por Coordenadas (`updateRoom`):**
    En cada *frame*, el juego divide la posición global de Wuher (`player.x`, `player.y`) entre el ancho y alto lógico de la sala actual para determinar en qué "columna" o "fila" de sala se encuentra. El cambio de cámara no se dispara tocando un objeto invisible en el suelo, sino al cruzar el umbral matemático que separa dos salas (ej. `Math.floor(player.x / ROOM_PX_W)`).
    3. **Animación de "Pan" y Bloqueo:**
    Cuando el sistema detecta que el jugador ha entrado en una sala nueva (por ejemplo, ha salido por el borde derecho de la pantalla):
        * El motor "congela" a los enemigos y detiene temporalmente la velocidad física del jugador (`player.body.setVelocity(0, 0)`).
        * La cámara inicia una transición suave hacia el centro lógico de la nueva sala utilizando el método `this.cameras.main.pan(targetX, targetY, duración, 'Sine.easeInOut')`.
        * Para evitar que el jugador siga moviéndose mientras la cámara viaja, el desbloqueo del movimiento no se hace con un temporizador arbitrario, sino esperando a que se dispare el evento nativo `Phaser.Cameras.Scene2D.Events.PAN_COMPLETE`. Solo entonces, la acción se reanuda en la nueva zona.

    Este modelo exterior obliga al jugador a enfrentarse a las amenazas de "pantalla en pantalla", haciendo que la recolección de chatarra o el combate contra los *Tuskens* requiera dominar el espacio visible de la sala actual antes de transicionar a la siguiente.


* **9.2. Control System:** Teclado (`WASD`, `Shift`, `Espacio`) orientado al movimiento y acciones precisas en tiempo real, junto con el uso del Ratón para organizar la gestión y la construcción en la cuadrícula.


* **9.3. Audio, music, sound effects:** El juego utiliza la música en vivo (*Jizz*) interpretada por los músicos Bith (*Figrin D'an y los Modal Nodes*). Si se les paga mediante `Espacio`, tocan la música durante 20-30 segundos, mitigando el estrés de los clientes y distrayendo al público.


* **9.4. Game Art:** El estilo artístico está diseñado para equilibrar la densidad visual de un juego de gestión con la claridad necesaria para la acción, tomando inspiraciones de títulos como *Stardew Valley*:

    * **Tamaño Base de Cuadrícula:** El mundo se construye sobre una rejilla de *tiles* estándar de **32x32 píxeles** para la estructura del suelo, paredes y cuadrículas de colisión.
    * **Proporciones de Personajes:** Los personajes principales (como Wuher y los clientes) tienen un diseño alargado. Su proporción es el doble de alto que un *tile* estándar de ancho (ocupando un espacio visual aproximado de 32x64 píxeles). Esto les otorga mayor legibilidad anatómica y presencia en pantalla frente al mobiliario.
    * **Escala Asimétrica de Objetos:** Aunque la cuadrícula lógica es de 32x32, los elementos clave del entorno (como la gran Barra en "U", la Torre Central de bebidas, la parrilla o grandes rocas en el exterior) rompen esta escala estricta. Son dibujados como piezas mucho más grandes que abarcan múltiples *tiles* para ganar detalle y presencia visual sin romper la armonía del *pixel art*.
    * **Vistas Direccionales:** Debido a la perspectiva 3/4, todos los *sprites* móviles y el mobiliario interactuable están compuestos obligatoriamente por sus 4 vistas cardinales (frente, espalda, y perfiles laterales) para mantener la coherencia geométrica cuando el jugador se mueva alrededor de ellos.


* **9.5. Help System:** El juego brinda información de apoyo en forma de advertencias visuales dentro del HUD (por ejemplo, rayos rojos entre razas enemigas) que enseñan las reglas del sistema de afinidades.