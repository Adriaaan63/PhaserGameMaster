Para integrar esta fantástica mecánica de la banda (que funciona como un "botón de área de efecto" o *AoE* para satisfacer a varios clientes a la vez) y establecer las bases del Gestor de Sonido, debemos actualizar el Documento de Diseño de Juego (GDD).

A continuación, te detallo los textos estructurados para que modifiques o añadas a las secciones correspondientes de tu **`Game.md`**:

---

### Modificaciones para `Game.md`

#### 4. Mechanics (Key Section)

**Añadir/Modificar en 4.1. Rules (Reglas de Pedidos y Paciencia de Servicio):**

* **Pedidos Globales (La Música):** A diferencia de las bebidas o la comida, que requieren recolección física y entrega individual, el pedido de "Música" funciona como una mecánica de satisfacción en área (AoE).
* **Resolución Simultánea:** Cuando Wuher activa a la Banda Bith interactuando con el escenario, el pedido de **todos** los clientes sentados en la cantina que hayan solicitado "Música" pasa automáticamente a estado `SATISFIED`.
* **Tiempo de Disfrute (Delay de salida):** Los clientes satisfechos por la banda no se levantan inmediatamente. Modifican su temporizador interno para quedarse sentados escuchando la actuación completa. Solo cuando termine el bucle de la canción (15 segundos), dejarán su propina y se marcharán hacia la salida.
* **Bloqueo de Pedido Continuo:** Para mantener la fluidez lógica del juego, si la banda *ya está tocando*, ningún cliente recién sentado podrá generar un pedido de "Música". El sistema forzará a que pidan comida o bebida hasta que la banda termine su turno de 15 segundos y vuelva a estar inactiva.



**Añadir en 4.7. Actions (Acción Contextual Principal - Tecla `Espacio`):**

* **Con las manos VACÍAS (`State: EMPTY`):**
* *Frente a la Banda (tiles contiguos a `zonaBanda`):* Al presionar la tecla de Acción (`Espacio`) mirando hacia el escenario, Wuher "paga" o da la señal a los músicos. Esto cambia el estado de la banda a `PLAYING`, activa las animaciones de los 4 sprites tocando sus instrumentos y dispara el evento global para resolver pedidos de música.



#### 7. Characters

**Añadir en 7.3. Non-combat and Friendly Characters:**

* **Figrin D'an y los Modal Nodes (La Banda Bith):** Cuatro NPCs estáticos colocados en formación sobre la `zonaBanda`. Carecen de IA de *pathfinding* o combate. Tienen dos estados visuales: `IDLE` (afinando instrumentos, quietos) y `PLAYING` (animación sincronizada tocando sus instrumentos de viento y percusión galáctica).

#### 9. Interface (y Audio)

**Sustituir y Ampliar el apartado 9.3. Audio, music, sound effects:**

* **Arquitectura de Audio (Gestor Centralizado - Phaser v4):**
Para garantizar un rendimiento óptimo y evitar que los sonidos se pisen (especialmente durante peleas o lluvias de monedas), el juego implementa un `AudioManager.ts` (patrón Singleton o Inyectado). Este gestor divide las pistas en tres buses principales (Web Audio API):
1. `BGM` (Background Music): Música ambiental de la cantina o ruidos de la calle.
2. `SFX` (Sound Effects): Efectos espaciales interactivos (blásters, clink de monedas, quejas de clientes). Utiliza *pooling* (limita la cantidad máxima de efectos idénticos simultáneos a 3-5) para evitar la saturación de decibelios.
3. `UI`: Efectos limpios, sin filtros espaciales, para botones, éxito o error en los pedidos.


* **El Evento Musical (Cantina Band):**
El elemento sonoro clave del juego no es música de fondo perpetua, sino un recurso de jugabilidad táctica. Cuando el jugador activa la `zonaBanda`, el `AudioManager` dispara un archivo de audio específico: un bucle perfecto de **15 segundos** del icónico tema de *Star Wars* "Mad About Me" (estilo *Jizz*).
* **Dinámica:** Mientras suena el bucle, la música general de fondo (si la hubiera) reduce su volumen (*ducking*). Al finalizar los 15 segundos, el clip musical se detiene (con un pequeño y sutil *fade-out*), las animaciones de los músicos cesan y los clientes musicales sueltan su dinero.



---

### Explicación de la Arquitectura de Sonido (Para tener en cuenta al programar)

Cuando le pasemos esta orden a tu agente de IA, le pediremos que cree el `AudioManager.ts`. La estrategia óptima en Phaser para esta mecánica será:

1. **Carga Previa:** Cargar el track de la banda (`cantina_band_loop.mp3` o `.ogg`) en la fase de `preload`.
2. **EventBus Orientado:** Usar el `EventBus` para emitir un evento `EVENT_BAND_STARTED`.
3. **Suscripciones Independientes:**
* El `AudioManager` escucha el evento y da al *play* a la canción.
* El `ClientManager` escucha el evento, busca qué clientes querían música y les pone un timer de 15,000 milisegundos (`SATISFIED_MUSIC_DELAY`).
* Un `BandManager` o script de la escena escucha el evento y pone a los 4 sprites a animarse (y bloquea nuevas peticiones mediante un *flag* booleano tipo `isBandPlaying = true`).



Con este diseño, el código quedará extremadamente limpio y los clientes no necesitarán saber si la banda existe o no; simplemente reaccionarán a los eventos globales, respetando la arquitectura estricta que definiste en `Agent.md`.