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
* Las sillas deben colocarse ortogonalmente adyacentes a una mesa (hasta 4 sillas por mesa pequeña) o pegadas a la barra.


* Cualquier silla sin una mesa o barra adyacente queda inactiva (`SILLA_INACTIVA`).


* Sentar a una raza junto a su rival (ej. Wookiees y Trandoshanos) en la misma mesa o barra contigua genera un icono de rayos rojos y acelera su enfado.


* Si el jugador muere en la incursión exterior, pierde el botín recolectado.




* **4.2. Model of the game universe:** Todo el sistema del interior se basa en una distribución por cuadrícula modular (*Grid Building*), donde el jugador coloca mesas, sillas y barriles estratégicamente.


* **4.3. Physics:** El mundo funciona en una cuadrícula 2D, utilizando algoritmos de *pathfinding* (A*) para que los clientes se muevan por las puertas sin chocar.


* **4.4. Economy:**
* Basada en **Créditos Imperiales** que los clientes lanzan al aire tras consumir.


* Se utiliza para comprar chatarra, vasos extra, decoración, barriles y sueldos diarios de mercenarios o empleados de apoyo.


* Las decisiones morales impactan la economía: delatar fugitivos otorga recompensas rápidas; ocultarlos brinda propinas enormes y sube la reputación.


* Se pierden ingresos por clientes asesinados en peleas o por monedas robadas por ratas.




* **4.5. Character movement in the game:** Se realiza con las teclas `W, A, S, D` (movimiento en 8 direcciones) y cuenta con un pequeño *Dash* usando `Shift` para emergencias.


* **4.6. Objects:** La recolección de objetos (monedas, platos, vasos, barriles) se ejecuta con las manos vacías presionando `Espacio`.


* **4.7. Actions:** El botón `Espacio` es completamente contextual: sirve para llenar bebidas en los cilindros, entregar pedidos, dejar objetos o usar el garrote para detener peleas y ratas. El uso del ratón (`Clic Izquierdo / Derecho`) está limitado a la interfaz de usuario, tiendas y arrastrar mobiliario.


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

* **8.1. / 8.2. For each level:** No existen niveles clásicos, el flujo se basa en un ciclo diario. Cada día, el reto externo es una incursión de 1 al día para cazar recursos, mientras que el reto interno escala con turnos nocturnos más complejos en los que se debe mantener el orden.



## 9. Interface

* **9.1. Visual System:**
* **9.1.1. HUD:** Cuenta con iconos sobre las cabezas de los clientes (globos con sus pedidos de comida, música o bebida), un icono de advertencia sobre asientos mal ubicados, temporizadores circulares de paciencia y un icono de "¡Soplón!" si el jugador delata a alguien en público.


* **9.1.2. Menus:** El "Libro de Gestión" donde se elige el menú y las mejoras antes de la apertura.


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