## Estado actual

### Decisiones tomadas

- Phaser 4 + TypeScript con arquitectura modular.
- Las escenas orquestan; entidades y managers encapsulan lógica.
- Comunicación desacoplada mediante `EventBus`.
- Parámetros centralizados en `GameRegistry.ts`.
- Tutoriales bloqueantes mediante `TutorialManager` y `TutorialUI`.
- La música de la Banda Bith funciona como área de efecto para clientes sentados.
- Las transiciones entre noches deben esperar a resolver clientes, recompensas y música antes de cambiar de noche.
- El HUD restaura la escala responsive original del icono de apertura calculada en `HUD.ts`.

### Parámetros principales

- Clientes: aparición cada 8 segundos.
- Cola máxima: 4 clientes.
- Velocidad de cliente: 72.
- Peleas: 5 segundos.
- Pedidos:
  - Bebida: 52 %.
  - Comida: 28 %.
  - Música: 20 %.
- Paciencia del pedido musical: 30 segundos.
- Duración de actuación de la banda: 15 segundos.
- Fade de audio: 700 ms.
- Volúmenes:
  - BGM: 0,65.
  - SFX: 0,8.
  - UI: 0,75.
- Máximo de efectos simultáneos por bus: 5.
- Banda provisional: 4 músicos.

### Arquitectura actual

- Escenas:
  - `NightCantinaScene.ts`: gameplay y orquestación.
  - `UIScene`: HUD, tutoriales, tienda y transición.
  - `PreloadScene`: carga de recursos.
- Entidades:
  - Clientes, jugador, monedas, ratas, músicos, matones y soldados.
- Managers:
  - Clientes, asientos, pathfinding, peleas, monedas, ratas, banda, audio, tienda, reputación, heat, wanted y progresión.
- Tutoriales:
  - `Night1Script.ts`
  - `Night2Script.ts`
- Transición:
  - `NightTransitionUI.ts`
  - Usa eventos de solicitud, preparación y finalización.
- HUD:
  - `HUD.ts`
  - Gestiona apertura de cantina, materiales, guía, construcción y feedback visual.

### Problemas pendientes

- La nueva transición todavía necesita una prueba manual completa en navegador.
- Deben verificarse especialmente:
  - Último cliente con pedido musical.
  - Banda activa al terminar el tiempo.
  - Generación de créditos antes de destruir al cliente.
  - Cambio de `currentNight` únicamente al terminar la pantalla.
  - Liberación correcta de asientos.
- Falta confirmar que el audio de la banda se detiene completamente y no queda ningún estado residual.
- El tutorial de Noche 2 está implementado parcialmente, pero aún necesita validación extremo a extremo.
- Existe una posible mejora pendiente: sustituir el fallback fijo de posición del cartel Wanted por una referencia directa a la entidad real.
- El build mantiene el warning preexistente de `MedievalSharp-Regular.ttf`.

Sobre este estado actual hemos arreglado lo siguiente:
- Analyzed ShopUI.ts:L60-140
Analyzed ShopUI.ts:L190-239
Ran check materials toggle in HUD
Ran check EVENT_GAME_WARNING messages
Analyzed ShopUI.ts:L30-58
Analyzed Night2Script.ts:L1-211
Edited NightCantinaScene.ts
Editing ShopUI.ts
Analyzed ShopUI.ts:L205-220
Editing ShopUI.ts
Analyzed ShopUI.ts:L208-216
Editing ShopUI.ts
Ran check line endings in ShopUI.ts
Ran normalize line endings to LF
Edited ShopUI.ts
Analyzed HUD.ts:L310-325
Edited HUD.ts
Edited Night2Script.ts
Ran verify TypeScript compilation
Timed 2s

Se han implementado y verificado las siguientes soluciones:

### 1. Garantía de fondos para compra de comida (Bono Tutorial)
* **Archivo modificado**: [`Night2Script.ts`](file:///d:/MASTER/phaser/PhaserGameMaster/src/managers/Night2Script.ts).
* **Comportamiento**: Al iniciar la Noche 2 (`showShopDialog()`), se comprueba el balance de créditos del jugador en el registro. Si dispone de menos de **8 créditos** (el coste de la ración de comida), se le asigna automáticamente un bono de cortesía tutorial estableciendo su balance en **15 créditos**, emitiendo `EVENT_CREDITS_UPDATED` (que refresca el slot del HUD de inmediato) y notificando al jugador con un aviso visual en pantalla (`EVENT_GAME_WARNING`).

---

### 2. Vinculación del Cartel Wanted real y limpieza de punteros
* **Archivos modificados**:
  * [`NightCantinaScene.ts`](file:///d:/MASTER/phaser/PhaserGameMaster/src/scenes/NightCantinaScene.ts#L948-L955): Se reemplazó la búsqueda frágil por zona Tiled por una referencia directa a la propiedad real de la entidad:
    ```ts
    const posterTile = this.wantedPoster?.tilePosition
        ?? this.gridManager.getObjectZoneCenterTiles('cartel')[0]
        ?? { tileX: 4, tileY: 7 };
    ```
  * [`Night2Script.ts`](file:///d:/MASTER/phaser/PhaserGameMaster/src/managers/Night2Script.ts): Se añadió la limpieza explícita de punteros (`this.tutorial.showPointers([])`) inmediatamente al abrir cada uno de los menús:
    * Al abrir la Tienda de Materiales (`SHOP_OPEN`).
    * Al abrir la Guía de Clientes (`GUIDE_OPEN`).
    * Al interactuar con el Cartel Wanted (`WANTED_OPEN`).
    * Al activarse los diálogos emergentes de Heat y Reputación.

---

### 3. Obligación de compra y corrección de desincronización de la tienda
* **Archivos modificados**:
  * [`ShopUI.ts`](file:///d:/MASTER/phaser/PhaserGameMaster/src/ui/ShopUI.ts#L211-L218): En el método `close()`, antes de emitir el cierre se consulta el flag de registro `requireFoodPurchase`. Si está activo, cancela el cierre y emite el aviso `'Debes comprar comida antes de cerrar la tienda.'`. Esto bloquea tanto el botón 'X' de la ventana como la tecla `ESC`.
  * [`HUD.ts`](file:///d:/MASTER/phaser/PhaserGameMaster/src/ui/HUD.ts#L312-L318): Se añade la misma salvaguarda si el jugador pulsa el icono de materiales en la barra superior para forzar el cierre.
  * [`Night2Script.ts`](file:///d:/MASTER/phaser/PhaserGameMaster/src/managers/Night2Script.ts):
    * Activa `requireFoodPurchase = true` al entrar en la fase de tienda.
    * En `handleFoodPurchased()`, desactiva `requireFoodPurchase = false`.
    * En `handleMaterialsToggled()`, si la tienda se intentara cerrar sin comida comprada, advierte y fuerza la reapertura; si ya se compró comida, transiciona limpiamente a `showGuideDialog()`.
    * Limpia de forma segura el flag y los timers (`heatTimer`, `reputationTimer`) en `destroy()`.

