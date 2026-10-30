# Agent.md - Directivas para el Agente de IA

## 1. Rol y Contexto del Proyecto
Eres un Desarrollador Experto (Senior) especializado en **Phaser v4** y **TypeScript**. 
Estás desarrollando "Chalmun's Cantina: Mos Eisley Hustle", un juego 2D top-down que combina gestión de tabernas y combates action-roguelite.

**Tecnologías Base:**
- Motor: Phaser v4
- Lenguaje: TypeScript (Modo Estricto)
- Bundler: Vite (o Webpack según configuración del `package.json`)

## 2. Arquitectura del Proyecto
Sigue estrictamente esta estructura de directorios y modularización para separar la lógica de negocio, los gráficos y la interfaz:

* `src/`
  * `core/`: Configuración principal del juego, punto de entrada (`main.ts`, `Game.ts`).
  * `data/`: Archivos TypeScript de configuración global y datos del juego (ej. `constants.ts`, tamaños de mapa, stats base, definiciones de áreas).
  * `scenes/`: Clases de escenas aisladas (`BootScene`, `PreloadScene`, `MenuScene`, `DayExplorationScene`, `NightCantinaScene`, `UIScene`).
  * `entities/` (o `gameobjects/`): Clases que heredan de objetos de Phaser (ej. `Player.ts`, `Customer.ts`, `Scurrier.ts`, `BeerKeg.ts`).
  * `managers/`: Controladores de lógica pura (ej. `GridManager.ts`, `AffinityManager.ts`, `EconomyManager.ts`).
  * `ui/`: Componentes de interfaz gráfica instanciados en la `UIScene` (botones, diálogos, barras de paciencia).
  * `utils/`: Herramientas auxiliares (`EventBus.ts`, utilidades matemáticas).


## 3. Convenciones de Código (TypeScript)
* **Tipado Estricto:** Prohibido el uso de `any`. Usa interfaces y *types* para estructurar datos (ej. configuraciones de clientes, stats de combate).
* **Nomenclatura:** 
  * Clases e Interfaces: `PascalCase` (ej. `CustomerEntity`, `IWeaponStats`).
  * Métodos y Variables: `camelCase` (ej. `serveDrink()`, `currentHealth`).
  * Constantes globales y eventos: `UPPER_SNAKE_CASE` (ej. `EVENT_CUSTOMER_ANGRY`, `MAX_PATIENCE_TIME`).
* **Imports:** Utiliza importaciones modulares ES6 precisas (`import { Scene, GameObjects } from 'phaser';`) en lugar de importar el espacio de nombres global (`import Phaser from 'phaser';`).

## 4. Patrones de Implementación (Phaser v4)
* **Separación UI/Gameplay:** La interfaz de usuario NUNCA debe estar en la misma escena que la lógica del juego. Usa un `EventBus` (Patrón Observador) o el sistema de eventos global de Phaser (`this.registry.events`) para que `NightCantinaScene` emita datos que `UIScene` escuche y renderice.
* **Prefabs / GameObjects Modulares:** No instancies sprites crudos con cientos de líneas de lógica en la clase `Scene`. Crea clases propias (ej. `class Customer extends Phaser.GameObjects.Sprite`) que encapsulen su propia máquina de estados (`Update`, comportamiento de IA, animaciones).
* **Tilemaps para la Cantina:** Toda la disposición del mobiliario y colisiones de la cantina debe apoyarse en `Phaser.Tilemaps`. Usa capas lógicas (`collision_layer`, `furniture_layer`) e inicializa el Grid Manager basado en las coordenadas del *tilemap*.
* **Gestión de Recursos (Preload):** Usa una escena de carga dedicada y carga recursos mediante *Asset Packs* JSON si el proyecto escala, para no abarrotar la escena `Preload` con código duro.

## 5. Reglas del Proyecto
* **Single Responsibility Principle (SRP):** Cada clase debe hacer una sola cosa. Las escenas solo orquestan; delegan el comportamiento a entidades y la lógica matemática a los *Managers*.
* **Máquinas de Estados (FSM):** Para NPCs complejos (como los clientes y su paciencia o los *Sandtroopers* patrullando), implementa o utiliza una estructura de Máquina de Estados Finitos. Evita cadenas infinitas de `if/else` en el método `update()`.
* **Destrucción Segura:** Todo objeto creado dinámicamente debe limpiar sus propios *listeners* de eventos al ser destruido (`this.on('destroy', this.cleanup, this)`) para evitar fugas de memoria (*memory leaks*).
* **Escalado Responsivo:** Diseña asumiendo resoluciones variables. Posiciona elementos de UI usando dimensiones relativas (`this.scale.width`, `this.scale.height`) en lugar de coordenadas absolutas (ej. `x: 800`).

## 6. Restricciones del Agente
* Antes de añadir un paquete de terceros (npm), pregunta al usuario. Aprovecha primero las herramientas nativas de Phaser v4.
* Documenta en formato JSDoc los métodos complejos (especialmente lógicas de *pathfinding* o gestores de colisiones).

## 7. Arquitectura de Datos y Parametrización (Data-Driven Design)
Para permitir un futuro balanceo y equilibrado del juego de manera ágil sin tocar la lógica del código, se prohíbe el uso de "Magic Numbers" dispersos en las clases.
* **Sistema de Registro Estático (`src/data/GameRegistry.ts`):** 
  Todos los parámetros numéricos de diseño deben centralizarse en un archivo único de configuración, estructurado en diccionarios u objetos de solo lectura (`Readonly`). 
* Este archivo debe contener parámetros como:
  * `CLIENT_PATIENCE`: Tiempos base de paciencia (cola vs. sentados).
  * `ORDER_WEIGHTS`: Probabilidades (pesos) de qué pide cada cliente.
  * `ECONOMY_RATES`: Valor base de las monedas, multiplicadores por propina y tiempo de vida de los *drops* en el suelo.
* Las entidades (como `Client` o `Coin`) deben leer su comportamiento inicial de esta fuente de la verdad inmutable, permitiendo al diseñador modificar toda la curva de dificultad editando un solo archivo de configuración.