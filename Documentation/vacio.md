¡Perfecto! Este sistema es clave porque introduce la presión de tiempo (mantener pulsado para llenar) y la gestión de inventario limitado (la comida obtenida en el exterior).

Aquí tienes el texto redactado de forma precisa para actualizar tu `Game_4.md`. Como siempre, puedes copiar y pegar estos bloques directamente en tu documento para mantener la coherencia del GDD.

---

### Inserciones para el Game Design Document (GDD)

#### 4. Mechanics (Key Section)

**4.1. Rules – What are the rules to the game, both implicit and explicit.**
*(Añadir a las reglas del Modo Nocturno / Servicio)*

* **Reglas de Suministro y Preparación:**
* **Bebidas (Torre Central):** Para servir una bebida, Wuher debe coger un vaso vacío y colocarse frente a la Torre Central (situada en la `zonaCocina`). El llenado no es instantáneo; requiere mantener presionada la tecla de Acción (`Espacio`) durante un tiempo determinado (ej. 2 segundos). Si se suelta la tecla antes de tiempo, el llenado se cancela.
* **Comida (Parrilla):** La cantidad de comida disponible durante la noche depende estrictamente de lo que el jugador haya conseguido (o se le haya otorgado) en la Fase Diurna exterior. Los clientes solo pedirán comida si hay unidades en el HUD; una vez que el contador llegue a cero, ningún cliente nuevo pedirá platos esa noche.
* **Estaciones Fijas:** La Torre Central y la Parrilla son inamovibles. El jugador debe acercarse a sus *tiles* específicos para interactuar con ellas.



**4.6. Objects – how to pick them up and move them**
*(Añadir al final de la sección "Objetos Interactuables")*

* **Gestión de Estaciones de Servicio:**
* **Interactuar con la Torre Central:** Wuher debe estar en estado `HOLDING` con un "vaso vacío". Al mirar hacia la Torre Central, mantener `Espacio` transforma el "vaso vacío" en "vaso lleno" (Juri Juice, Leche Azul, etc., dependiendo del dispensador o menú activo) tras completar una pequeña barra de progreso.
* **Recoger de la Parrilla:** Cuando un cliente pide comida, Wuher se acerca a la Parrilla con las manos vacías (estado `EMPTY`). Al pulsar `Espacio`, se resta una unidad del inventario global de comida de esa noche, y Wuher pasa al estado `HOLDING` con un "Plato de Comida" en las manos, listo para ser entregado.



**4.7. Actions, including whatever switches and buttons are used, interacting with objects...**
*(Actualizar la lista de acciones de la tecla Espacio)*

* **Acción Contextual Principal (Tecla `Espacio`):** El comportamiento depende del estado del jugador y del tile/objeto objetivo:
* **Con las manos VACÍAS (`State: EMPTY`):**
* *Frente a la Parrilla:* Si hay comida disponible en el inventario del HUD, recoge un plato de comida (pasa a estado `HOLDING`). Si el inventario es 0, no ocurre nada o suena un error.
* *Frente a un vaso vacío:* Lo recoge (pasa a `HOLDING`).
* *(... resto de acciones: saludar cliente, usar garrote ...)*


* **Con las manos OCUPADAS (`State: HOLDING`):**
* *Frente a la Torre Central (SOLO si sostiene vaso vacío):* Al mantener pulsado `Espacio`, inicia el llenado. Al soltar o terminar, el objeto sostenido cambia a "vaso lleno". Si sostiene un plato de comida, la acción se bloquea.
* *Frente al Cliente / Mesa:* Entrega o apoya el objeto.





#### 9. Interface

**9.1. Visual System**

* **9.1.1. HUD:**
*(Añadir a la descripción del HUD en Modo Nocturno)*
* **Inventario Dinámico de Suministros:** Durante el servicio nocturno, se mostrará en una esquina de la pantalla (ej. superior izquierda) un contador visual de los suministros de comida conseguidos en el exterior (ej. icono de un filete de Bantha: "x5"). Este número disminuye en tiempo real cada vez que Wuher saca un plato de la Parrilla. Si llega a 0, el icono se vuelve gris o muestra un aspa roja para indicar agotamiento.
* **Barra de Progreso de Interacción:** Al mantener pulsado `Espacio` en la Torre Central, aparecerá una pequeña barra de carga (progress bar) flotando justo encima de Wuher o del surtidor, llenándose de izquierda a derecha. Se vacía inmediatamente si el jugador suelta el botón antes de tiempo.



---

Con esta redacción, el GDD ahora refleja claramente cómo el botín de la aventura (Fase Diurna) impacta directamente en las mecánicas de gestión de tiempo (Fase Nocturna).

¿Deseas que preparemos el prompt para que el agente empiece a implementar la lógica de la Torre Central y la Parrilla en el código?