Parece que no tengo acceso al archivo `Game_5.md` en tu Drive, pero no te preocupes, te facilitaré los textos redactados para que puedas copiarlos y pegarlos directamente en el documento.

Vamos a detallar cómo funciona este sistema de peleas emergentes, qué pasa si las ignoramos y cómo escala la dificultad (Alerta Imperial).

---

### Textos para actualizar `Game.md`

#### 4. Mechanics (Key Section)

**Añadir en 4.1. Rules:**

* **Reglas de Escalada y Combate en la Cantina:**
* Si el temporizador de paciencia de dos clientes de razas incompatibles (sentados juntos) llega a cero simultáneamente (o durante la ventana de penalización por proximidad), no abandonan el local pacíficamente. Entran en un estado de **PELEA**.
* Una pelea es un evento crítico con un temporizador oculto. Si Wuher no interviene a tiempo, la pelea culmina en un golpe letal o disparo de bláster, resultando en un cadáver.
* **Consecuencias de la Muerte:**
1. **Cero Ingresos:** Ninguno de los involucrados paga su cuenta. El asesino abandona inmediatamente el local corriendo por la puerta trasera.
2. **Daño Colateral:** La silla o mesa involucrada pasa a estado `DESTRUIDO`, inutilizándola por el resto del turno nocturno.
3. **Suciedad Traumática:** Un cadáver y un charco de sangre ocupan los *tiles*. Los clientes evitarán sentarse cerca y su paciencia bajará más rápido por el asco/miedo, hasta que Wuher limpie la zona.
4. **Heat (Alerta Imperial):** Un disparo letal incrementa drásticamente la "Barra de Alerta Imperial" de la noche.





**Añadir en 4.2. Model of the game universe:**

* **Máquina de Estados de Combate (Expansión):**
* De `SEATED_WAITING_ORDER` con penalización $\rightarrow$ 5. `FIGHTING` (Pelea en curso, aparece feedback visual) $\rightarrow$ Si Wuher interviene: Pasan a `LEAVING` enfadados (sin pago) $\rightarrow$ Si nadie interviene: Uno pasa a `DEAD` (se vuelve un obstáculo en el mapa) y el otro a `FLEEING` (Huyendo).


* **Sistema de Heat (Alerta Imperial):** Un medidor oculto o sutil en el universo que rastrea el nivel de ruido, 

 y disparos. Si este medidor supera un umbral durante la noche, el motor genera un evento de incursión de los *Sandtroopers* para cerrar el local.

**Añadir en 4.6. Objects:**

* **Interacción con la Destrucción y Limpieza:**
* **Cadáveres y Charcos:** Son tratados como objetos físicos estáticos con un "aura" negativa. Wuher debe acercarse con las manos vacías y mantener pulsado `Espacio` durante un tiempo (barra de progreso) para limpiar el charco y tirar el cadáver (o despiezarlo para recursos si se tiene la mejora correspondiente).
* **Mobiliario Destruido:** Los muebles en estado `DESTRUIDO` cambian su *sprite*. No pueden recogerse en el inventario normal ni limpiarse durante la noche. Requieren ser reparados en la fase diurna gastando "Chatarra" (*scraps*).



**Añadir en 4.7. Actions:**

* **Acción Contextual Principal (Tecla `Espacio`):**
* **Frente a una Pelea (`State: EMPTY`):** Si Wuher tiene las manos vacías y se acerca a dos clientes en estado `FIGHTING`, presionar (o mantener, según balanceo) `Espacio` obligará a los clientes a separarse y marcharse del local (`LEAVING`). No se gana dinero, pero se evita el cadáver, la destrucción del mobiliario y el *Heat* imperial.



**Modificar 4.8. Combat:**

* **En la Cantina (Gestión de Conflictos):** El combate en el interior no es mecánico para el jugador (Wuher no ataca con combos), sino que es un **evento de crisis de tiempo**. La tensión reside en abandonar la cadena de pedidos (sacrificar propinas de otras mesas) para correr a separar a dos clientes incompatibles antes de que salten chispas y uno acabe muerto, arruinando el servicio de esa zona y atrayendo al Imperio.

#### 9. Interface

**Añadir en 9.1.1. HUD:**

* **Feedback Visual de Pelea:** Sobre las cabezas de los clientes en disputa aparece un globo de diálogo grande o una nube estilo cómic (bocadillo temblando con símbolos de insultos, polvo y golpes) para avisar al jugador de que la crisis es inminente y requiere su atención inmediata.
* **Aura de Miedo/Asco:** Una sutil viñeta o tintado en el suelo alrededor de un cadáver que indica visualmente el área de efecto (AOE) donde los nuevos clientes se negarán a sentarse.

---

### 2. Prompt para el Agente de Código

Aquí tienes el prompt detallado, estructurado y enfocado a que el agente desarrolle este sistema de conflicto paso a paso.

---

```text
Actúa como un Desarrollador Experto en Phaser v4 y TypeScript.

Antes de comenzar con la tarea, aquí tienes un resumen del estado actual del juego para darte contexto sobre el proyecto:

### RESUMEN DEL ESTADO ACTUAL DEL SISTEMA Y JUEGO
**Título:** Chalmun's Cantina: Mos Eisley Hustle (Gestión caótica y Action-Roguelite).
**Estado actual:** Hemos implementado la Rueda de Afinidades (`AffinityManager`) que penaliza (multiplicador de paciencia x2) a clientes incompatibles sentados en mesas vecinas. La taberna tiene mobiliario modular y los clientes realizan pedidos.

---

### TAREA ACTUAL: SISTEMA DE PELEAS Y CONSECUENCIAS (CADÁVERES Y DESTRUCCIÓN)

El objetivo ahora es programar el clímax de la Rueda de Afinidades: el Combate entre clientes y la intervención del jugador.

Antes de programar, lee estrictamente los principios de `Agent.md` (Clean Code, SRP, tipado, cero magic numbers) y revisa los nuevos puntos añadidos en los apartados 4.1, 4.2, 4.6, 4.7 y 4.8 del `Game.md`.

Para mantener el proyecto escalable, vamos a implementar esta crisis en varios módulos. Debes realizar las siguientes implementaciones:

### 1. Actualizar `Client.ts` (Máquina de Estados)
- Añade los estados `FIGHTING`, `DEAD` y `FLEEING`.
- **Lógica de Entrada a Pelea:** Si el cliente está sufriendo una penalización por afinidad (tiene un enemigo al lado) y su paciencia llega a cero, en lugar de irse (`LEAVING`), transiciona a `FIGHTING`. Lanza un evento global `EVENT_FIGHT_STARTED` (con las IDs o referencias de ambos clientes).
- **En Estado `FIGHTING`:**
  - Muestra un UI diegético agresivo (un bocadillo de pelea temblando).
  - Inicia un nuevo timer crítico (ej. `FIGHT_DURATION_MS = 5000` definido en `GameRegistry`).
  - Si el timer expira sin intervención: un cliente aleatorio muere (`DEAD`) y el otro huye (`FLEEING`).

### 2. Consecuencias (Cadáveres y Destrucción)
- **Muerte (`DEAD`):** El cliente muerto cambia de sprite (ej. un placeholder de charco de sangre), desvincula su timer, pero NO libera su silla ni el tile. Se convierte en un obstáculo.
- **Destrucción:** El `SeatingManager` o la escena deben recibir un evento `EVENT_CLIENT_MURDERED`. El tile de la silla/mesa donde ocurrió debe marcarse con un estado `DESTRUIDO`, inutilizándolo.
- **Alerta Imperial (Heat):** Crea un nuevo gestor (o añádelo si tienes uno de economía/progreso) `ThreatManager.ts`. Suma puntos de *Heat* cada vez que alguien muere.

### 3. Interacción del Jugador (`Player.ts` y Acción)
- Modifica la lógica de la tecla `Espacio`. Si Wuher (manos vacías) se acerca a un cliente en estado `FIGHTING` y pulsa espacio:
  - Interrumpe la pelea. Pasa a ambos clientes al estado `LEAVING` (se van sin pagar, pero vivos).
  - Lanza un evento `EVENT_FIGHT_STOPPED` para limpiar el UI de pelea.
- (Opcional por ahora, déjalo comentado): Limpiar el cadáver manteniendo `Espacio` pulsado.

Por favor, comienza proponiendo los cambios en la Máquina de Estados de `Client.ts` (especialmente cómo gestionar el timer de la pelea y la muerte) y cómo interceptará Wuher esa pelea en su input de acción. Una vez aprobado, revisaremos la destrucción de los muebles.

```