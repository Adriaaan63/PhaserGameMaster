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


* **2.4. Game Flow Summary:** El flujo de juego se divide en:


    * **Fase Pre-Apertura:** Al iniciar el día, el jugador accede al Menú de Materiales (Tienda) para comprar suministros con las ganancias de la noche anterior. Luego, usa el Modo Construcción y el Libro de Gestión para preparar la cantina.


    * **Fase Nocturna:** Un turno frenético de 3 a 4 minutos enfocado en sentar clientes, atenderlos, cobrar y evitar eventos como peleas o inspecciones imperiales.




* **2.5. Look and Feel:** El juego se presenta en un estilo visual *pixel art* 2D que adopta una **perspectiva top-down (cenital) de tipo 3/4**. Este ángulo ligeramente inclinado permite visualizar tanto la parte superior como el frente de los objetos y personajes, otorgando una gran sensación de profundidad, volumen y tridimensionalidad al entorno.

    La paleta de colores y la atmósfera beben directamente de la estética de "universo usado" de Mos Eisley:

    * **Contraste Lumínico:** La luminosidad cegadora y cálida del desierto de Tatooine durante el día contrasta fuertemente con la penumbra claustrofóbica, polvorienta y saturada de neón del interior del bar por la noche.
    * **Texturas y Desgaste:** Todo el mobiliario, los recipientes y las estaciones de servicio utilizan tonos apagados y sucios (grises, blancos amarillentos, marrones y verdes militares). Los objetos tienen contornos integrados (sin usar negro puro) y muestran signos de desgaste, óxido y "mugre espacial". Todo esto ocurre con el ritmo estridente del *Jizz* espacial sonando de fondo.




## 3. Gameplay

* **3.1. Objectives:** El objetivo es transformar un antro de mala muerte en la cantina de contrabando más infame de la galaxia, sobreviviendo a clientes armados y ratas. Se debe gestionar un polvorín social equilibrando a las facciones criminales.


* **3.2. Game Progression:** No sigue una campaña lineal; la progresión es sistémica y emergente, forjando reputación en el mercado negro de Jabba el Hutt o consiguiendo recompensas imperiales. Al avanzar los días, los ingresos se pueden usar para comprar mejoras de mobiliario o contratar NPCs que automatizan tareas.
    * **Sistema de Reputación Criminal (Jabba):** A diferencia del *Heat* imperial, que es volátil y se reinicia cada noche, la Reputación es persistente y se mantiene entre los distintos días. El jugador inicia la partida con un nivel de reputación medio (ej. 50/100).
    * **Fluctuación Diaria:** Atender con éxito los pedidos de los clientes incrementa marginalmente la barra, forjando una fama de local fiable. Por el contrario, ignorar pedidos (que la paciencia llegue a cero y el cliente se marche) reduce levemente la reputación.
    * **El Peso de la Traición:** El mayor impacto a la reputación ocurre al interactuar con el Imperio. Si el jugador "vende" a un cliente en Busca y Captura (*Wanted*) a una patrulla de *Sandtroopers* y hay otros clientes criminales cerca como testigos, la reputación criminal se desploma severamente.
    * **Incursión de Jabba:** La reputación persistente comienza en 50/100. Cada pedido satisfecho suma 1 punto y cada pedido abandonado resta 2. Al llegar a 0, los clientes huyen, se detiene temporalmente la generación y los matones destruyen cuatro muebles; al terminar, la reputación se restablece a 20/100.


* **3.3. Play Flow:** El bucle principal nocturno sigue los siguientes pasos: Entrada (Detector Droides) ➔ Sentar (Cuidar Afinidad Racial) ➔ Atender (Bebida/Comida/Música) ➔ Cobrar (Evitar Ratas) ➔ Eventos (Peleas / Imperio) ➔ Salida.


* **3.4. Mission/challenge Structure:** Los retos surgen de eventos sistémicos, principalmente mediante el **Sistema de Busca y Captura (*Wanted*)**. El jugador deberá leer el cartel de recompensas en la Pre-Apertura, identificar visualmente a un sospechoso generado aleatoriamente durante el caos de la noche, y decidir su destino ante las patrullas imperiales (delatarlo, encubrirlo o ignorarlo).
    * **Implementación del ciclo Wanted:** `WantedManager` genera y persiste el perfil de la jornada, `ClientManager` fuerza al cliente objetivo (ID 5) a usar su raza, y `Sandtrooper` resuelve la inspección mediante rutas de pathfinding.


* **3.5. Puzzle Structure:** Funciona como un puzle táctico en tiempo real en la fase de sentado, gracias a una "Rueda de Afinidades" donde mezclar razas enemigas duplica la velocidad en la que cae su paciencia.



## 4. Mechanics (Key Section)

* **4.1. Rules:**
* **Reputación Criminal y Respuesta de Jabba:**
    * La reputación se guarda en el registro global entre noches y nunca se reinicializa mientras exista un valor guardado. Sus límites son 0 y 100.
    * Un pedido satisfecho aplica `+1`; un pedido abandonado por paciencia aplica `-2`; una futura traición al código criminal aplicará `-25`.
    * Cuando la reputación llega a 0, se emite `EVENT_JABBA_RAID_STARTED`: todos los clientes abandonan la cantina sin pago, se pausa la generación de nuevos clientes y se prepara la entrada de cuatro matones.
    * La incursión termina tras contabilizar cuatro muebles destruidos y emite `EVENT_JABBA_RAID_ENDED`. Entonces se reactiva la generación y la reputación queda en 20 para evitar ataques encadenados.
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
    * **Pedidos Globales (La Música):** A diferencia de las bebidas o la comida, que requieren recolección física y entrega individual, el pedido de "Música" funciona como una mecánica de satisfacción en área (AoE).
        * **Resolución Simultánea:** Cuando Wuher activa a la Banda Bith interactuando con el escenario, el pedido de **todos** los clientes sentados en la cantina que hayan solicitado "Música" pasa automáticamente a estado `SATISFIED`.
        * **Tiempo de Disfrute (Delay de salida):** Los clientes satisfechos por la banda no se levantan inmediatamente. Modifican su temporizador interno para quedarse sentados escuchando la actuación completa. Solo cuando termine el bucle de la canción (15 segundos), dejarán su propina y se marcharán hacia la salida.
        * **Bloqueo de Pedido Continuo:** Para mantener la fluidez lógica del juego, si la banda *ya está tocando*, ningún cliente recién sentado podrá generar un pedido de "Música". El sistema forzará a que pidan comida o bebida hasta que la banda termine su turno de 15 segundos y vuelva a estar inactiva.
* **Reglas de Economía Física:**
    * El pago no se suma automáticamente al contador del jugador. Al ser satisfecho, el cliente "lanza" físicamente un número de monedas (Créditos) al suelo, alrededor de su tile actual.
    * Las monedas persisten en el suelo hasta que Wuher las recoge o una rata las roba. No desaparecen por tiempo; la recolección y el robo compiten por la misma moneda y solo uno puede completarse.

* **Rueda de Afinidades (Penalización por Proximidad):** El juego implementa un sistema de puzle espacial táctico basado en las rivalidades históricas de 5 arquetipos raciales (Wookiees, Trandoshanos, Rodianos, Aqualish, Ithorianos).
    * **Regla de Proximidad:** Si el jugador sienta a dos clientes cuyas razas son incompatibles (enemigos naturales) en la misma mesa, o en asientos de barra que estén contiguos (a una distancia igual o menor a 1 *tile* ortogonal o diagonal), se activa un modificador negativo.
    * **Penalización:** La "Barra de Paciencia de Servicio" de ambos clientes decaerá el **doble de rápido (x2)** de su velocidad normal.
    * **Feedback Visual:** Aparecerá un icono de "rayos rojos" u odio entre los sprites de ambos clientes afectados, advirtiendo al jugador del error táctico.

* **Reglas de Escalada y Combate en la Cantina:**
    * Si el temporizador de paciencia de dos clientes de razas incompatibles (sentados juntos) llega a cero simultáneamente (o durante la ventana de penalización por proximidad), no abandonan el local pacíficamente. Entran en un estado de **PELEA**.
    * Una pelea es un evento crítico con un temporizador oculto. Si Wuher no interviene a tiempo, la pelea culmina en un golpe letal o disparo de bláster, resultando en un cadáver.
    *   **Sistema de Heat (Alerta Imperial):** Un medidor oculto lógicamente en el universo, pero representado de forma explícita mediante una barra roja en el margen inferior izquierdo de la pantalla (UI). Rastrea el nivel de conflictividad en la cantina.
        *   **Acumulación Continua (Peleas):** Cuando dos clientes inician una pelea (`FIGHTING`), el medidor de *Heat* comienza a llenarse lentamente por cada segundo que dura el altercado.
        *   **Acumulación por Impacto (Muertes):** Si una pelea no se detiene a tiempo y termina en asesinato (`EVENT_CLIENT_MURDERED`), se aplica una penalización instantánea masiva al medidor de *Heat*, simbolizando el estruendo de un bláster letal.
        *   **Decaimiento Pasivo (Cooldown):** Si la cantina está en paz (ningún cliente peleando), el medidor de *Heat* disminuye gradualmente de forma constante tras unos segundos de gracia. Esto permite al jugador recuperarse si mantiene la calma durante un buen rato.
        *   **Clímax (Incursión Imperial):** Si la barra roja llega al 100% (o al límite numérico parametrizado en el registro) durante la Fase Nocturna, se bloquea el juego y se activa un evento global donde un pelotón de *Sandtroopers* irrumpe en el local, forzando un cierre prematuro del turno y penalizando los ingresos del día.
    * **Consecuencias de la Muerte:**
        1. **Cero Ingresos:** Ninguno de los involucrados paga su cuenta. El asesino abandona inmediatamente el local corriendo por la puerta trasera.
        2. **Daño Colateral:** La silla o mesa involucrada pasa a estado `DESTRUIDO`, inutilizándola por el resto del turno nocturno.
        3. **Suciedad Traumática:** Un cadáver y un charco de sangre ocupan los *tiles*. Los clientes evitarán sentarse cerca y su paciencia bajará más rápido por el asco/miedo, hasta que Wuher limpie la zona.
        4. **Heat (Alerta Imperial):** incrementa drásticamente la "Barra de Alerta Imperial" de la noche.
* **Reglas de Consecuencia de Reputación (La Visita de Jabba):**
    * Si la barra de Reputación llega a cero (0%), se activa de inmediato un evento punitivo.
    * **Pánico General:** Todos los clientes que estén sentados o en la cola pasan a estado `FLEEING`. Abandonan inmediatamente sus pedidos y corren hacia la puerta trasera para huir de la cantina, dejando el local vacío y deteniendo la generación (`spawn`) de nuevos clientes.
    * **El Escarmiento:** Cuatro NPCs (Matones de Jabba) entran por el objeto Tiled `cantina_entrada` en formación 2x2 y marchan hacia el interior hasta cruzar la línea de `zonaColaEntrada`.
    * **Ataque y Retirada:** Tras romper la formación, cada matón recibe un mueble operativo único, llega mediante pathfinding, reproduce una explosión visual y lo marca como `DESTRUIDO`. Después regresan por pathfinding a `cantina_entrada`.
    * **Condición de Finalización:** Cuando el cuarto matón desaparece por la entrada se emite `EVENT_JABBA_RAID_ENDED`, se desbloquea al jugador, se reanuda el spawn normal de clientes (si aún queda tiempo en la noche) y la reputación se restablece a 20/100.
* **Sistema de Busca y Captura (Wanted):**
    * **Fase Pre-Apertura (El Cartel):** En el mapa `cantina2.tmj` existe un objeto llamado `cartel` con clase `busca_captura`. Si Wuher se acerca a él y pulsa `Espacio`, se despliega una interfaz (menú *Wanted*). Este menú muestra las pistas generadas procedimentalmente para esa noche: un cuadrado con el color representativo de su raza (ej. verde brillante para Rodiano), y 3 características textuales lógicas (ej. Raza: Rodiano, Detalle: Lleva un sombrero viejo, Recompensa: 50 Créditos).
    * **Identificación (Fase Nocturna):** Durante el servicio, el motor instanciará a un cliente que coincida visualmente (añadiendo el *prop* correspondiente) con la descripción del cartel.
    * **La Inspección Imperial:** Cuando el cliente *Wanted* es sentado en una silla, se activa un temporizador oculto. Al poco tiempo, un oficial *Sandtrooper* entrará por la puerta principal para realizar una inspección.
    * **Opciones de Resolución del Jugador:**
        1. **Delatar (Acercarse al Sandtrooper):** Wuher interactúa (`Espacio`) con el oficial. El Sandtrooper camina hacia el cliente y lo arresta. **Consecuencia:** El jugador gana los Créditos de recompensa al instante, pero su Barra de Reputación con Jabba sufre una caída drástica (`-25`).
        2. **Encubrir (Ruta de Escape):** Wuher interactúa (`Espacio`) con el cliente *Wanted* sentado y le indica que huya por la puerta trasera u objeto `puertaSecreta` (clase `puerta_secreta` del tilemap). El cliente escapa antes de que el Sandtrooper lo vea. **Consecuencia:** El jugador no recibe dinero, pero su Reputación Criminal sube significativamente (`+15`).
        3. **Ignorar (Inacción):** Wuher no hace nada y sigue sirviendo bebidas. Si el Sandtrooper, durante su ruta de patrulla, pasa por el campo de visión del cliente, lo arrestará por su cuenta. **Consecuencia:** Ninguna. No se gana recompensa (el mérito es del oficial) ni se pierde reputación (el jugador no fue el chivato).

* Si el jugador muere en la incursión exterior, pierde el botín recolectado.




* **4.2. Model of the game universe:** El universo se divide mecánicamente en *capas lógicas de cuadrícula*. El interior de la cantina no es solo un suelo plano, sino que cuenta con un mapa de metadatos (zonas) invisible para el jugador pero crítico para el sistema. El `GridManager` clasifica cada tile (ej. Tile 5x8 = "Suelo Libre", Tile 12x4 = "Zona Prohibida: Banda"). Todas las piezas interactúan bajo este modelo: los clientes buscan "Suelos Libres" adyacentes a "Mesas" para caminar, el jugador solo puede colocar muebles en "Suelos Libres", y las ratas generan sus rutas de robo desde los *tiles* catalogados como `spawnRatas`.
El universo de la cantina modela a los clientes no como simples *sprites*, sino como **Agentes Estatales Dinámicos** vinculados al `GridManager`.
    * **Máquina de Estados del Cliente Expandida:**
         `WAITING_IN_LINE` -> 2. `MOVING_TO_CHAIR` -> 3. `SEATED_WAITING_ORDER` (El cliente genera un pedido y su paciencia decae) -> 4. `SATISFIED` (Recibe el ítem, lanza monedas y se levanta) -> 5. `LEAVING`.

        1. **Fase Espera:** El cliente existe en un tile de la `zonaColaEntrada`. El universo verifica por cada cliente su "paciencia", siendo un temporizador que decae.
        2. **Fase Asignación (Jugador):** El universo entra en un modo de "selección". El jugador, al interactuar con el cliente, habilita un sub-sistema que escanea todas las sillas del `GridManager`. Filtra y resalta únicamente aquellas que tienen el estado `ACTIVA` (conectadas a mesa/barra y libres).
        3. **Fase Tránsito:** Una vez que el jugador vincula al cliente con la silla destino, el cliente cambia su estado a `MOVIÉNDOSE`. El universo invoca al sistema de *Pathfinding* para trazar una ruta sobre la cuadrícula, esquivando obstáculos y las posiciones reservadas por otros clientes. Si una ruta queda bloqueada durante el movimiento, se recalcula; los clientes no pueden ocupar simultáneamente el mismo tile.
        4. **Fase Éxodo (Salida):** Cuando el cliente termina su ciclo en la silla (ya sea por estado `SATISFIED` tras recibir su pedido, o `LEAVING` enfadado porque su paciencia llegó a cero), el universo invoca nuevamente al sistema de *Pathfinding*.
            * El `GridManager` identifica la Puerta Trasera como un portal transitable en la cuadrícula, incluso si comparte tiles con la capa visual de paredes.
            * El cliente conserva su reserva de silla mientras siga sobre ella. La silla queda disponible al abandonar su tile, evitando que otro cliente sea enviado al mismo asiento antes de que se despeje.
            * Si no existe una ruta al portal, el cliente permanece en estado `EXIT_BLOCKED`, muestra feedback rojo y reintenta la ruta. No desaparece como si hubiese alcanzado la puerta.
            * Durante el trayecto, el cliente ignora interacciones con el jugador. Al alcanzar la puerta trasera, el cliente se retira de la escena.

    * **Entidades Económicas:** Las monedas (Créditos) se modelan como entidades físicas persistentes (`CoinDrop`) administradas por `CoinManager`. Wuher puede recogerlas por solapamiento y las ratas pueden robarlas mediante el mismo gestor.

    * **Máquina de Estados de Combate (Expansión):**
    De `SEATED_WAITING_ORDER` con penalización $\rightarrow$ 4. `APPROACHING_FIGHT` (El cliente que agota antes su paciencia se levanta y camina hacia el asiento de su rival) $\rightarrow$ 5. `FIGHTING` (Ambos entran en combate cuerpo a cuerpo) $\rightarrow$ Consecuencias (`DEAD`/`FLEEING` o interrupción de Wuher).

    * **Sistema de Heat (Alerta Imperial):** Un medidor oculto o sutil en el universo que rastrea el nivel de ruido, sangre y disparos. Si este medidor supera un umbral durante la noche, el motor genera un evento de incursión de los *Sandtroopers* para cerrar el local.


* **4.3. Physics:** El mundo funciona en una cuadrícula 2D, utilizando *pathfinding* para que los clientes se muevan por las puertas sin chocar.
    * **Y-Sorting (Profundidad Visual):** Al utilizar una perspectiva 3/4 con personajes de proporciones altas (32x64) moviéndose en un grid de 32x32, el motor (Phaser) debe actualizar constantemente la profundidad de dibujado (`depth` o `Z-index`) de todos los *sprites* basándose en la coordenada "Y" de su punto de anclaje (los pies). Esto garantiza que si Wuher camina por detrás de paredes, su cuerpo quede oculto, pero si camina por delante, se superponga visualmente.
    * **Recolección por Colisión (Trigger):** Las monedas arrojadas por los clientes no requieren interacción manual (no se usa `Espacio`). Tienen un *collider* de tipo "Trigger" (sensor). Cuando el cuerpo físico de Wuher se solapa con el *bounding box* de la moneda, esta es destruida del mundo físico y su valor se transfiere a la economía del jugador.


* **4.4. Economy:**
    * La economía principal se basa en la **Recolección Activa** Basada en **Créditos Imperiales** que los clientes lanzan al aire tras consumir..
        * **Fórmula de Pago (Prototipo):** La cantidad de monedas soltadas dependerá del valor base del ítem entregado multiplicado por un modificador de propina (basado en cuánta paciencia le sobraba al cliente). El valor exacto y el ratio de *drop* están centralizados en un Gestor de Datos (Data Registry) para facilitar el equilibrado progresivo del juego.
    * **El Peligro de las Ratas Ladronas (Scurriers):**  Las monedas que permanecen demasiado tiempo en el suelo atraen a las ratas del local.
        * **Sistema de Spawns Restringidos:** En el mapa `cantina2.tmj` existen dos objetos definidos con la clase `spawn_ratas`. Cada spawn funciona de manera independiente y solo puede instanciar **una rata activa** simultáneamente.
        * **Fijación de Botín (Targeting):** Si hay monedas en el suelo y una rata está disponible en un spawn, esta sale y se le asigna el botín completo dejado por un único cliente. Cada grupo de botín solo puede estar asignado a una rata/spawn. La rata usa *pathfinding* para alcanzar cada moneda individualmente, recalculando la ruta después de cada recogida, y también para regresar a su spawn con todo el botín.
        * **Bloqueo de Cambio de Objetivo:** Una vez que una rata sale de su nido hacia un objetivo específico, no cambiará de rumbo hacia monedas más cercanas ni revaluará su ruta hasta que regrese al spawn (con o sin el botín).
        * **Tiempo de Atracción:** Una moneda permanece protegida durante 3 segundos; después queda disponible para ser fijada como objetivo por una rata libre.
        * **Intervención del Jugador:** Wuher puede pulsar `Espacio` frente a una rata que esté buscando o transportando una moneda. La rata suelta el botín si lo llevaba y huye al spawn, donde libera el punto para el siguiente ciclo.

    * Se utiliza para comprar chatarra, vasos extra, decoración, barriles y sueldos diarios de mercenarios o empleados de apoyo en la tienda.
    * **Gestión de Ingresos (Tienda):** Los créditos imperiales obtenidos durante la noche no se gastan en el mundo exterior (ya no hay exploración), sino que se invierten íntegramente a través del Menú de Materiales. Aquí el jugador toma decisiones económicas críticas: gastar en stock perecedero para la noche actual (comida, vasos limpios), comprar herramientas de mantenimiento (chatarra para reparar mesas rotas por peleas o matones), o invertir a largo plazo comprando nuevo mobiliario (distintos tipos de mesas) para aumentar la capacidad del local.
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

    * **Interacción con la Destrucción y Limpieza:**
        * **Cadáveres y Charcos:** Son tratados como objetos físicos estáticos con un "aura" negativa. Wuher debe acercarse con las manos vacías y mantener pulsado `Espacio` durante un tiempo (barra de progreso) para limpiar el charco y tirar el cadáver (o despiezarlo para recursos si se tiene la mejora correspondiente).
        * **Mobiliario Destruido:** Los muebles en estado `DESTRUIDO` cambian su *sprite*. No pueden recogerse en el inventario normal ni limpiarse durante la noche. Requieren ser reparados en la fase diurna gastando "Chatarra" (*scraps*).


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
            * **Frente a una Pelea:** Si Wuher tiene las manos vacías y se acerca a dos clientes en estado `FIGHTING`, presionar (o mantener, según balanceo) `Espacio` obligará a los clientes a separarse y marcharse del local (`LEAVING`). No se gana dinero, pero se evita el cadáver, la destrucción del mobiliario y el *Heat* imperial.
            * *Frente a la Banda (tiles contiguos a `zonaBanda`):* Al presionar la tecla de Acción (`Espacio`) mirando hacia el escenario, Wuher da la señal a los músicos. Esto cambia el estado de la banda a `PLAYING`, activa las animaciones de los 4 sprites tocando sus instrumentos y dispara el evento global para resolver pedidos de música.
            * *Frente a una Rata Ladrona:* Si el jugador detecta a una rata intentando robar un botín o huyendo con él, puede acercarse (con las manos vacías o llenas) y presionar la tecla `Espacio`. Al igual que al detener una pelea, esta acción representa un "golpe" o pisotón que asusta a la rata. Al ser golpeada, la rata aborta su robo inmediatamente (soltando la moneda si ya la tenía) y huye a toda velocidad de regreso a su spawn original.
            *   *Frente al Cartel de Busca y Captura (Solo Pre-Apertura):* Al presionar la tecla de Acción (`Espacio`) mirando hacia el objeto `cartel` en la pared, el juego pausa el movimiento y despliega en pantalla el Menú Informativo del cliente buscado para esa noche.
            *   *Frente al Sandtrooper (Durante la Inspección):* Si el evento de inspección está activo, acercarse al oficial y pulsar `Espacio` ejecuta la "Ruta Delatar". Wuher le indica dónde está el sospechoso, ganando la recompensa pero perdiendo drásticamente Reputación Criminal.
            *   *Frente al Cliente Wanted (Durante la Inspección):* Si el Sandtrooper está en el local, acercarse al cliente en Busca y Captura y pulsar `Espacio` ejecuta la "Ruta Encubrir". Wuher le avisa en secreto para que huya hacia la `puertaSecreta`, subiendo considerablemente la Reputación Criminal.

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
* **En la Cantina (Gestión de Conflictos):** El combate en el interior no es mecánico para el jugador (Wuher no ataca con combos), sino que es un **evento de crisis de tiempo**. La tensión reside en abandonar la cadena de pedidos (sacrificar propinas de otras mesas) para correr a separar a dos clientes incompatibles antes de que salten chispas y uno acabe muerto, arruinando el servicio de esa zona y atrayendo al Imperio. Si la paciencia entre clientes rivales llega a cero, pasa lo siguiente: 

    * **Fase de Escalamiento (Aproximación):** La pelea no estalla mágicamente a distancia. Cuando la paciencia de un cliente afectado por la afinidad llega a cero, este se convierte en el "Agresor". Abandona su asiento y entra en un modo de movimiento hostil hacia la silla del cliente objetivo.
    * **Fase de Confrontación (Visuales):** Una vez que el agresor alcanza el tile adyacente o el mismo tile de su rival, la pelea comienza oficialmente. A nivel visual, se instancia un efecto de "nube de polvo/humo de dibujos animados" que cubre los sprites de los combatientes. El feedback visual textual (¡Pelea!) sigue mostrándose flotando por encima de esta nube de humo para garantizar que el jugador lo vea incluso desde lejos.

    El jugador debe intervenir (`Espacio`). Si no lo hace, se generan disparos de bláster o golpes letales, lo que resulta en cadáveres, mobiliario destruido (`DESTRUIDO`) y la llegada de *Sandtroopers*.


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
    * **6.2.1-6.2.2. La Cantina:** Estructurada en *tiles*, cuenta con la Barra en "U", una Puerta Principal (con Detector de Droides) para formar la cola, una Puerta Trasera de salida y el Escenario de la Banda.





## 7. Characters

* **7.1. For each character**

**Facciones y Clientes (Los 5 Arquetipos de la Rueda de Afinidades)**

Para dotar de legibilidad inmediata al caos de la cantina, los clientes se dividen en 5 arquetipos basados en razas icónicas del universo Star Wars. Cada raza tiene un diseño de *sprite* (color y silueta) fácilmente reconocible para facilitar la toma de decisiones rápidas al sentarlos.

**1. Los Wookiees (ej. Chewbacca)**

* **7.1.1. Back story:** Provenientes de Kashyyyk, muchos Wookiees en Mos Eisley son antiguos esclavos liberados o contrabandistas. Han sufrido décadas de opresión y caza furtiva.
* **7.1.2. Personality:** Honorables pero de temperamento explosivo. Si se sienten amenazados o insultados, son propensos a arrancar los brazos a sus oponentes.
* **7.1.3. Appearance:** Sprites grandes y voluminosos (ocupan más espacio visual que un humano estándar), cubiertos de espeso pelaje marrón y portando bandoleras cruzadas.
* **7.1.4. Abilities:** Alta paciencia base, pero propinas estándar. Su gran tamaño bloquea ligeramente la visibilidad detrás de ellos.
* **7.1.6. Relationship (Afinidad Negativa):** Se llevan MAL con **Trandoshanos** (sus captores y cazadores naturales) y **Humanos Contrabandistas** (por viejas deudas de juego y traiciones).

**2. Los Trandoshanos (ej. Bossk)**

* **7.1.1. Back story:** Reptiles humanoides del planeta Trandosha. Su cultura gira en torno a la caza y a adorar a la "Scorekeeper", otorgando puntos por cada presa capturada (especialmente Wookiees).
* **7.1.2. Personality:** Sádicos, fríos y calculadores. Son matones profesionales y cazarrecompensas que no dudan en iniciar un tiroteo si les beneficia.
* **7.1.3. Appearance:** Sprites delgados pero imponentes, con escamas de color verde oliva/amarillento, hocicos reptilianos y vistiendo característicos trajes de vuelo amarillos o armaduras desgastadas.
* **7.1.4. Abilities:** Dejan buenas propinas si se les sirve rápido, pero inician peleas letales si su paciencia se agota.
* **7.1.6. Relationship (Afinidad Negativa):** Se llevan MAL con **Wookiees** (sus presas predilectas) y **Rodianos** (feroz competencia entre gremios de cazarrecompensas).

**3. Los Rodianos (ej. Greedo)**

* **7.1.1. Back story:** Originarios del pantanoso Rodia, muchos se han convertido en cazarrecompensas al servicio de Jabba el Hutt para escapar de la violencia de clanes de su mundo natal.
* **7.1.2. Personality:** Oportunistas, nerviosos y con gatillo fácil (aunque a menudo con mala puntería). Siempre buscando la manera de ganar unos créditos extra traicionando a alguien.
* **7.1.3. Appearance:** Sprites esbeltos y encorvados. Piel verde brillante, ojos grandes y oscuros (facetados), trompa tapir y vistiendo chalecos o chaquetas turquesas. Muy reconocibles por el color verde intenso.
* **7.1.4. Abilities:** Suelen pedir bebidas baratas. Tienen una paciencia muy volátil (baja rápido si el local está lleno).
* **7.1.6. Relationship (Afinidad Negativa):** Se llevan MAL con **Humanos Contrabandistas** (objetivos frecuentes de las recompensas de Jabba) y **Aqualish** (por disputas territoriales en los bajos fondos).

**4. Los Aqualish (ej. Ponda Baba)**

* **7.1.1. Back story:** Provenientes de Ando. Son una raza anfibia conocida en toda la galaxia por su agresividad no provocada y su afición a resolver disputas en bares a base de blásteres.
* **7.1.2. Personality:** Pendencieros, brutos y xenófobos. Beben en exceso y buscan cualquier excusa para iniciar una trifulca.
* **7.1.3. Appearance:** Sprites robustos (casi tanto como los Wookiees), con rostros arácnidos/anfibios (colmillos inferiores grandes), piel en tonos grisáceos/azul oscuro y ojos grandes. Suelen vestir cazadoras anaranjadas o marrones.
* **7.1.4. Abilities:** Tienen el temporizador de paciencia base más corto del juego. Exigen servicio inmediato.
* **7.1.6. Relationship (Afinidad Negativa):** Se llevan MAL con **Ithorianos** (odian su pacifismo y debilidad física) y **Humanos** (históricamente tienen rencillas y buscan pelea con ellos en las cantinas).

**5. Los Ithorianos (ej. Momaw Nadon / Hammerhead)**

* **7.1.1. Back story:** Llamados "Hammerheads" por su fisionomía. Son nativos de los frondosos bosques de Ithor. Generalmente son exiliados pacifistas, ecologistas o comerciantes de antigüedades.
* **7.1.2. Personality:** Pacíficos, sabios y serenos. Detestan la violencia y el ruido fuerte, prefiriendo rincones apartados para charlar o hacer negocios tranquilos.
* **7.1.3. Appearance:** Sprites con siluetas muy distintivas: cuellos curvos hacia adelante con cabezas en forma de martillo ("T"). Tonos de piel marrones/rosados, vistiendo túnicas largas de colores ocres o burdeos.
* **7.1.4. Abilities:** Generan un aura pasiva que ralentiza muy levemente la pérdida de paciencia de las mesas adyacentes (efecto tranquilizador). Pagan propinas enormes.
* **7.1.6. Relationship (Afinidad Negativa):** Se llevan MAL (se estresan y huyen) con **Aqualish** y **Trandoshanos**, ya que su naturaleza pacifista no tolera estar sentados junto a matones agresivos.

* **7.3. Non-combat and Friendly Characters:**
    * **Wuher:** Personaje controlado por el jugador.


    * **Tork (Portero):** Empleado contratable que patrulla, detiene peleas y limpia cadáveres automáticamente.


    * **Ackmena (Camarera):** Ayudante que recoge vasos y sirve bebidas.


    * **Bomo (Chef):** NPC que prepara automáticamente los platos en la estación de comida.


    * **Garindan:** Espía oculto que el jugador puede usar como transmisor para delatar clientes.

    * **Figrin D'an y los Modal Nodes (La Banda Bith):** Cuatro NPCs estáticos colocados en formación sobre la `zonaBanda`. Carecen de IA de *pathfinding* o combate. Tienen dos estados visuales: `IDLE` (afinando instrumentos, quietos) y `PLAYING` (animación sincronizada tocando sus instrumentos de viento y percusión galáctica).




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
* **8.2.4.2. Critical path:** Comprar suministros en el Menú de Materiales $\rightarrow$ Distribuir mesas $\rightarrow$ Asignar menú $\rightarrow$ Abrir puertas $\rightarrow$ Ciclo rápido de servicio y limpieza $\rightarrow$ Fin del día.
* **8.2.4.3. Important and incidental encounters:** Encuentros incidentales con clientes marcados como `Wanted` (Busca y Captura) y patrullas de Inspectores Imperiales que modifican drásticamente el comportamiento estándar del servicio.



## 9. Interface

* **9.1. Visual System:**
* **9.1.1. HUD:** 
La interfaz de usuario de `NightCantinaScene` se orquesta en una capa superior de HUD unificada, visible y responsive, que utiliza la estética pixel-art de tecnología desgastada y "smartphone de bolsillo" (marcos metálicos oscuros, botones cuadrados con rebordes reforzados e iconos ilustrativos).

    **A. El Panel Superior de Estado (HUD Zona Superior):**
Se sitúa en el margen superior de la pantalla, alineado horizontalmente y dividido en compartimentos (slots):
    1. **Compartimento de Fase:** Muestra en formato de texto digital la etapa actual de la cantina: `PRE-APERTURA`, `NOCTURNA` o `DÍA`.
    2. **Indicador de Comida:** Icono ilustrativo de ración/plato junto al contador numérico de raciones que Wuher puede preparar (ej. "x5").
    3. **Contador de Créditos:** Icono de moneda/crédito imperial animado junto al total acumulado de dinero del jugador.
    4. **Reloj de Tiempo:** Muestra la cuenta atrás digital (`00:00`) que resta para finalizar la Fase Nocturna.
    5. **Botón Guía de Clientes (Interactuable):** Botón cuadrado con icono de libro/guía. Abre el panel de la rueda de afinidades.
    6. **Botón de Materiales (Interactuable):** Botón cuadrado con icono de chatarra/inventario. Abre el menú de materiales (chatarra, comida, etc.).
    7. **Botón de Construcción (Interactuable - Toggle):** Botón cuadrado con icono de martillo/plano. Activa o desactiva visualmente el Modo Construcción e inventario inferior.
    8. **Botón de Apertura (Interactuable):** Botón cuadrado con icono de puerta/blaster. Disponible únicamente en la Pre-Apertura para abrir el local, quedando desactivado y ensombrecido el resto del tiempo.

    **B. Sistema de Progreso Sobre el Jugador (Overhead Progress Bars):**
    * Para evitar que la acción del juego o el propio mapa oculten información crítica, todas las barras de progreso interactivo (como el llenado de recipientes o la acción de fregar la sangre) se renderizan **directamente encima de la cabeza de Wuher** (`Overhead Canvas`).
    * Estas barras son pequeñas, se mueven junto con el contenedor del jugador en todo momento y utilizan rebordes metálicos con un relleno de color progresivo que no puede ocultarse por los elementos visuales de la escena (depth superior), garantizando que el jugador siempre sepa cuánto tiempo de interacción le resta para completar la acción de forma realista.

    **C. Feedbacks de Acciones en Pantalla:**
    * Cualquier mensaje de aviso (como advertencias, errores de asignación, logros de dinero o recordatorios) se proyecta de forma flotante en el centro de la pantalla, justo debajo del HUD superior, con un fundido (fade-out) tras unos segundos para no entorpecer la vista de la cantina.

    **D. UI Diegética:**
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
        * **Feedback Visual de Pelea:** Sobre las cabezas de los clientes en disputa aparece un globo de diálogo grande o una nube estilo cómic (bocadillo temblando con símbolos de insultos, polvo y golpes) para avisar al jugador de que la crisis es inminente y requiere su atención inmediata.
            * **Aura de Miedo/Asco:** Una sutil viñeta o tintado en el suelo alrededor de un cadáver que indica visualmente el área de efecto (AOE) donde los nuevos clientes se negarán a sentarse.

    **E. Barra Inferior de Alerta Imperial:**
    *   Ubicada en el margen inferior izquierdo de la pantalla, fijada en el layout de `UIScene`.
    *   Consiste en un contenedor con marco metálico oscuro, una etiqueta roja con la leyenda `IMPERIO` y una barra de progreso interior (color rojo sangre) que se llena de izquierda a derecha. Se actualiza dinámicamente según el estado del `ThreatManager`.
    *   En el margen inferior derecho se muestra la barra amarilla `REPUTACIÓN`, que representa la reputación criminal persistente ante Jabba. Se actualiza al completar o perder pedidos y reacciona visualmente a la incursión de matones.

    **F. Barra Inferior de Reputación Criminal:**
    * Ubicada en el margen inferior derecho de la pantalla (simétrica a la del Imperio), fijada en el layout de `UIScene`.
    * Consiste en un contenedor con marco metálico oscuro, una etiqueta dorada/amarilla con la leyenda `REPUTACIÓN` y una barra de progreso interior (color amarillo) que se llena de izquierda a derecha. Se lee del registro y se mantiene constante al iniciar cada noche.

* **9.1.2. Menus:** 
    * El "Libro de Gestión" donde se elige el menú y las mejoras antes de la apertura. Menú a pantalla completa (o *overlay* grande) accesible antes de iniciar el turno nocturno. En él, el jugador decide qué tipos de bebidas cargar en los tanques (`zonaCocina`), selecciona qué comidas estarán disponibles (basándose en los recursos del almacén) y gestiona los contratos del personal extra.
    * **El "Libro de Gestión" (Interfaz de Menú):**
        * Este menú actúa como el centro neurálgico antes de abrir el turno.
        * **Visualización de la Rueda de Afinidades:** Dentro del Libro de Gestión, habrá una pestaña dedicada a la "Guía de Clientes" o "Info de Seguridad". En ella, se mostrará visualmente la **Rueda de Afinidades** de las 5 razas (Wookiee, Trandoshano, Rodiano, Aqualish, Ithoriano).
        *   **Visualización de la Rueda de Afinidades (Holo-Rueda Radial):** 
            *   **Estructura (Pentágono):** Las 5 facciones principales se disponen en forma de pentágono o círculo. Cada vértice contiene el retrato (o el color/sprite representativo) de la raza, siguiendo la paleta oficial del registro: Wookiee (Marrón `0x79543b`), Trandoshano (Verde Oliva `0x87933f`), Rodiano (Verde Brillante `0x42a34b`), Aqualish (Azul Oscuro `0x536f83`) e Ithoriano (Rosado/Marrón `0xb48272`).
            *   **Mecánica Visual (Líneas de Odio):** En el centro de la rueda, líneas de tensión rojas conectan físicamente los nodos de las razas que son enemigas. Sobre el punto medio de estas líneas, flota un icono de advertencia (⚡ o ⏳x2), informando claramente de la penalización de paciencia doble al sentarlos juntos.
            *   **Feedback Inmediato e Interactivo:** Para no saturar al jugador, el panel es interactivo. Si el jugador posa el cursor (hover) sobre el retrato de una raza concreta, su nodo se resalta (ej. brilla), y *solo* se iluminan de rojo fuerte las líneas que conectan a sus enemigos naturales. Las líneas de los demás se atenúan o desaparecen, ofreciendo una lectura instantánea y sin esfuerzo en medio de la partida.
        * Esto sirve como herramienta de consulta para el jugador (tutorial pasivo) para memorizar qué razas *nunca* deben sentarse en mesas contiguas antes de iniciar el caos del turno nocturno.
    *   **Menú de Construcción (Barra de Inventario Inferior):**
        *   Cuando el jugador activa el "Modo Construcción" desde el botón del HUD superior durante la fase de Pre-Apertura, se despliega una barra de herramientas en la parte inferior de la pantalla.
            *   **Diseño de Slots:** El menú abandona los listados textuales en favor de un diseño visual de cajas cuadradas estilo "inventario de bolsillo" (usando los rebordes de `smart_phone_pocket_ui`). El inventario se presenta como una fila horizontal de compartimentos (*slots*).
            *   **Contenido Dinámico:** En el centro de cada *slot* se renderiza el sprite del mobiliario disponible (por ejemplo, el icono de la Mesa Básica o la Silla de madera). En la esquina inferior derecha de cada caja aparecerá un pequeño multiplicador de stock (ej. "x4"). Si el stock de un mueble llega a cero, el *slot* se ensombrece (filtro oscuro) y el texto cambia a rojo.
            *   **Sistema de Navegación por Carrusel:** Dado que el espacio en pantalla es limitado para no tapar la cantina, el jugador inicialmente solo verá un par de *slots* (ej. Mesa y Silla básica). Sin embargo, a medida que avance el juego y compre mesas para Wookiees, sillones Ithorianos o gramolas, se habilitará la navegación interactiva.
            *   **Flechas Laterales:** A los extremos izquierdo y derecho de la fila de *slots*, existirán dos botones interactivos con forma de flecha direccional. Al hacer clic en ellas (o al usar la rueda del ratón), los *slots* se desplazarán horizontalmente a izquierda o derecha de forma animada, permitiendo al jugador explorar todo su catálogo de muebles sin abrir engorrosas ventanas completas.
    *   **Menú de Busca y Captura (Wanted Poster):**
        *   Accesible exclusivamente durante la fase de Pre-Apertura al interactuar con el objeto `cartel` del tilemap.
        *   **Diseño Visual:** Se presenta como un *overlay* emergente en el centro de la pantalla, simulando un pergamino físico o un panel de datos imperial (siguiendo el *mockup* de `MenuBC.png`). El resto del juego se oscurece ligeramente (efecto *dim*) para centrar la atención.
        *   **Contenido Dinámico:**
            *   **Retrato:** En el centro del cartel se muestra un recuadro grande rellenado con el color base representativo de la raza buscada (`placeholderColor`), sirviendo como principal ancla de memoria visual.
            *   **Características (Texto):** Justo debajo, se genera una lista con 3 pistas clave procedimentales pero lógicas:
                1. *Raza:* (Ej. "Rodiano").
                2. *Detalle a tener en cuenta:* (Ej. "Lleva un sombrero viejo" o "Altamente agresivo").
                3. *Recompensa Imperial:* (Ej. "50 Créditos").
            *   **Navegación:** El jugador puede mantener este menú abierto todo el tiempo que necesite para memorizar las características. Se cierra de forma ágil volviendo a pulsar la tecla `Espacio` o haciendo clic fuera del recuadro, devolviendo el control a Wuher.
    * **Menú de Materiales (La Tienda):**
        * Accesible mediante el botón correspondiente en el HUD superior durante la fase de Pre-Apertura.
        * **Diseño Visual:** Funciona como una interfaz de tienda clásica, superpuesta al juego, estructurada mediante los *sprites* y paneles alojados en `..\assets\sprites\UI`. Presenta una cuadrícula uniforme dividida en "Slots" o cajetines individuales de venta.
        * **Slot de Producto:** Cada caja muestra en el centro el icono ilustrativo del ítem (un plato de carne, chatarra, una jarra, una mesa), y en la parte inferior, sobre un botón de "Comprar", el precio fijado dinámicamente.
        * **Feedback Desplegable (Tooltip):** Para mantener la tienda limpia de texto, al pasar el ratón (*hover*) sobre un slot, emerge un *tooltip* lateral o inferior mostrando el Nombre del objeto y una breve descripción de sus características o ventajas mecánicas.
        * **Mecánica de Compra y Volcado:** Al pulsar en comprar (si hay fondos suficientes), el flujo de los ítems difiere según su naturaleza:
            1. **Chatarra y Comida:** Incrementan instantáneamente sus respectivos contadores en las variables del juego y en el panel numérico del HUD.
            2. **Mobiliario (Mesas):** Añade un nuevo bloque o *slot* interactivo en la barra del inventario inferior del Modo Construcción, permitiendo arrastrarlo al mapa.
            3. **Recipientes Vacíos:** Por cuestiones logísticas, los vasos comprados no van a un contador mágico, sino que se transfieren lógicamente al inventario espacial del objeto *Tiled* "caja" (designado con la clase `caja_inventario`), obligando a Wuher a ir a recogerlos allí durante el servicio.
        * La implementación usa `ShopRegistry.ts` como catálogo único, `ShopUI.ts` como overlay y `InventoryCrate.ts` como almacén físico cuando el mapa contiene un objeto `caja_inventario`.


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


* **9.3. Audio, music, sound effects:**
    * **Arquitectura de Audio (Gestor Centralizado - Phaser v4):** Para garantizar un rendimiento óptimo y evitar que los sonidos se pisen (especialmente durante peleas o lluvias de monedas), el juego implementa un `AudioManager.ts` (patrón Singleton o Inyectado). Este gestor divide las pistas en tres buses principales (Web Audio API):
        1. `BGM` (Background Music): Música ambiental de la cantina o ruidos de la calle.
        2. `SFX` (Sound Effects): Efectos espaciales interactivos (blásters, clink de monedas, quejas de clientes). Utiliza *pooling* (limita la cantidad máxima de efectos idénticos simultáneos a 3-5) para evitar la saturación de decibelios.
        3. `UI`: Efectos limpios, sin filtros espaciales, para botones, éxito o error en los pedidos.


    * **El Evento Musical (Cantina Band):** El elemento sonoro clave del juego no es música de fondo perpetua, sino un recurso de jugabilidad táctica. Cuando el jugador activa la `zonaBanda`, el `AudioManager` dispara un archivo de audio específico: un bucle perfecto de **15 segundos** del icónico tema de *Star Wars* "Mad About Me" (estilo *Jizz*).
    * **Dinámica:** Mientras suena el bucle, la música general de fondo (si la hubiera) reduce su volumen (*ducking*). Al finalizar los 15 segundos, el clip musical se detiene (con un pequeño y sutil *fade-out*), las animaciones de los músicos cesan y los clientes musicales sueltan su dinero.


* **9.4. Game Art:** El estilo artístico está diseñado para equilibrar la densidad visual de un juego de gestión con la claridad necesaria para la acción, tomando inspiraciones de títulos como *Stardew Valley*:

    * **Tamaño Base de Cuadrícula:** El mundo se construye sobre una rejilla de *tiles* estándar de **32x32 píxeles** para la estructura del suelo, paredes y cuadrículas de colisión.
    * **Proporciones de Personajes:** Los personajes principales (como Wuher y los clientes) tienen un diseño alargado. Su proporción es el doble de alto que un *tile* estándar de ancho (ocupando un espacio visual aproximado de 32x64 píxeles). Esto les otorga mayor legibilidad anatómica y presencia en pantalla frente al mobiliario.
    * **Escala Asimétrica de Objetos:** Aunque la cuadrícula lógica es de 32x32, los elementos clave del entorno (como la gran Barra en "U", la Torre Central de bebidas, la parrilla o grandes rocas en el exterior) rompen esta escala estricta. Son dibujados como piezas mucho más grandes que abarcan múltiples *tiles* para ganar detalle y presencia visual sin romper la armonía del *pixel art*.
    * **Vistas Direccionales:** Debido a la perspectiva 3/4, todos los *sprites* móviles y el mobiliario interactuable están compuestos obligatoriamente por sus 4 vistas cardinales (frente, espalda, y perfiles laterales) para mantener la coherencia geométrica cuando el jugador se mueva alrededor de ellos.


* **9.5. Help System:** El juego brinda información de apoyo en forma de advertencias visuales dentro del HUD (por ejemplo, rayos rojos entre razas enemigas) que enseñan las reglas del sistema de afinidades.

## 10. Progresión de noches y tutoriales

`ProgressionManager` persiste `currentNight` en el registro global y controla el
temporizador de cada turno nocturno. La Noche 1 termina al satisfacer tres
clientes; las noches siguientes terminan cuando expira el tiempo configurado en
`GameRegistry.ts`. Al finalizar una noche, los clientes se limpian, se vuelve a
la Pre-Apertura y se incrementa la noche hasta la quinta.

`TutorialManager` emite los pasos mediante `EventBus.ts` y `TutorialUI` los
renderiza en `UIScene`. Los diálogos se avanzan con clic izquierdo, pueden
pausar el gameplay y admiten un indicador triangular animado mediante
`pointTo()` o `pointToGameObject()`. Las Noches 1 y 2 utilizan scripts
secuenciales independientes; desde la Noche 3 se aplica únicamente el
escalado paramétrico de `GameRegistry.progression`.

La Noche 1 se ejecuta como una secuencia bloqueante: movimiento, construcción,
apertura, vasos vacíos, torre de bebidas, banda, selección del primer cliente,
asignación de silla, pedido y recompensa. Cada paso de acción se desbloquea
mediante eventos reales del gameplay, no únicamente avanzando el diálogo.
Durante esta noche se ocultan la guía, la tienda, las barras de Heat y
Reputación, el cartel Wanted y los pedidos de comida; los clientes se fuerzan
a la raza humana y la noche finaliza tras tres clientes satisfechos.
