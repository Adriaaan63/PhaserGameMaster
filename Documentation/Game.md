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




* **2.5. Look and Feel:** El juego se presenta en una vista *top-down* 2D. Se basa en un fuerte contraste visual: la luminosidad cegadora del desierto durante el día contra la penumbra claustrofóbica, polvorienta y saturada de neón del interior del bar por la noche. Todo esto ocurre con el ritmo estridente del *Jizz* espacial de fondo.



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

* Si el jugador muere en la incursión exterior, pierde el botín recolectado.




* **4.2. Model of the game universe:** El universo se divide mecánicamente en *capas lógicas de cuadrícula*. El interior de la cantina no es solo un suelo plano, sino que cuenta con un mapa de metadatos (zonas) invisible para el jugador pero crítico para el sistema. El `GridManager` clasifica cada tile (ej. Tile 5x8 = "Suelo Libre", Tile 12x4 = "Zona Prohibida: Banda"). Todas las piezas interactúan bajo este modelo: los clientes buscan "Suelos Libres" adyacentes a "Mesas" para caminar, el jugador solo puede colocar muebles en "Suelos Libres", y las ratas generan sus rutas de robo desde los *tiles* catalogados como `spawnRatas`.


* **4.3. Physics:** El mundo funciona en una cuadrícula 2D, utilizando algoritmos de *pathfinding* (A*) para que los clientes se muevan por las puertas sin chocar.


* **4.4. Economy:**
* Basada en **Créditos Imperiales** que los clientes lanzan al aire tras consumir.


* Se utiliza para comprar chatarra, vasos extra, decoración, barriles y sueldos diarios de mercenarios o empleados de apoyo.


* Las decisiones morales impactan la economía: delatar fugitivos otorga recompensas rápidas; ocultarlos brinda propinas enormes y sube la reputación.


* Se pierden ingresos por clientes asesinados en peleas o por monedas robadas por ratas.




* **4.5. Character movement in the game:** Se realiza con las teclas `W, A, S, D` (movimiento en 8 direcciones) y cuenta con un pequeño *Dash* usando `Shift` para emergencias.


* **4.6. Objects:** La recolección de objetos (monedas, platos, vasos, barriles) se ejecuta con las manos vacías presionando `Espacio`.
    * **Objetos de Mobiliario (Modo Pre-Apertura):** Se manejan exclusivamente a través de la Interfaz Gráfica de Usuario (GUI) y el ratón. Para mover un objeto (mesa, silla, decoración):
        1. El jugador abre el Inventario pulsando el botón correspondiente en la interfaz (o mediante el Libro de Gestión).
        2. Hace *Clic Izquierdo* y mantiene pulsado sobre un objeto del inventario (Mesa, Silla).
        3. Arrastra el cursor sobre la cuadrícula del tilemap. El juego ajusta ("*snapping*") la posición del objeto al tile más cercano, mostrando el indicador visual verde/rojo.
        4. Al soltar el *Clic Izquierdo* (`Drag End`), si el indicador es verde, el objeto se fija al suelo y se retira del inventario. Si es rojo, la acción se cancela y el objeto regresa al inventario.
        5. Para quitar un objeto ya colocado, el jugador hace *Clic Izquierdo* sobre él en el mapa para devolverlo al inventario, liberando el tile.
    * **Objetos Interactuables (Jarras, Comida):** El sistema de físicas y recolección imita el flujo de trabajo de *Overcooked*.
        * **Coger (Pick up):** Cuando el jugador tiene las manos vacías y se acerca a un objeto apoyado en una superficie (ej. una jarra en la barra), al mirar hacia él y presionar la tecla de Acción (`Espacio`), el objeto desaparece de la cuadrícula del mapa y pasa a renderizarse visualmente en las manos del sprite de Wuher. El estado del jugador cambia a `HOLDING_OBJECT`.
        * **Mover:** Mientras se sostiene el objeto, este sigue la posición y orientación del jugador en todo momento.
        * **Soltar / Entregar (Drop / Deliver):** Cuando el jugador lleva un objeto y se acerca a una superficie libre (ej. una mesa vacía) o a un cliente que ha pedido ese ítem exacto, al presionar nuevamente la tecla de Acción (`Espacio`), el objeto se desvincula de las manos del jugador. Si es una mesa, el objeto hace *snap* (se ajusta) al centro del tile de la mesa. Si es un cliente, el objeto se destruye (se consume) y se inicia la lógica de pago.


* **4.7. Actions:** 
    * **Gestión (Modo Día / Pre-Apertura):**
        * `Ratón (Clic / Drag & Drop)`: Herramienta principal. Se utiliza para interactuar con los botones de la interfaz (Abrir Cantina, Libro de Gestión, Inventario) y para el sistema de colocación de mobiliario.
        * `Indicadores Visuales de Comunicación`: El juego comunica las reglas implícitamente al jugador usando colores en tiempo real durante la acción de arrastrar (Verde = Válido / Rojo = Inválido). También comunica errores de silla mediante un icono de exclamación amarillo si se coloca una silla sin mesa adyacente.
    * **Acción Contextual Principal (Tecla `Espacio`):** El comportamiento de esta tecla depende enteramente de la máquina de estados del jugador (si sus manos están vacías o llenas) y del objeto/tile que tenga justo enfrente (basado en su vector de dirección):
        * **Con las manos VACÍAS (`State: EMPTY`):**
        * *Frente a un objeto (Jarra/Plato):* Lo recoge y pasa al estado `HOLDING`.
        * *Frente al dispensador de bebidas:* Comienza a llenar una jarra nueva (requiere mantener pulsado).
        * *Frente a un cliente esperando:* Lo saluda y le asigna una mesa.
        * *Frente a una pelea / rata:* Usa el garrote para atacar/espantar.
    * El uso del ratón (`Clic Izquierdo / Derecho`) está limitado a la interfaz de usuario, tiendas y arrastrar mobiliario.

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
    * En modo **Pre-Apertura**: El HUD se transforma. Aparece la "Barra de Herramientas del Inventario" en la parte inferior de la pantalla. Muestra iconos de los muebles disponibles con un número de *stock*. Incluye un gran botón flotante de "Abrir Cantina" en la esquina superior derecha. Durante el arrastre (*Drag & Drop*), el HUD dibuja dinámicamente un cuadrado verde o rojo transparente sobre la celda (*tile*) seleccionada por el puntero.


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


* **9.4. Game Art:** (Estilo visual 2D *top-down* basado en *Tiled* maps).


* **9.5. Help System:** El juego brinda información de apoyo en forma de advertencias visuales dentro del HUD (por ejemplo, rayos rojos entre razas enemigas) que enseñan las reglas del sistema de afinidades.