# GDD: Flujo de Progresión de Noches

## Visión General
El flujo del juego consistirá en el desarrollo de **5 noches** con una progresión de dificultad exponencial basada en la introducción paulatina de mecánicas. 
Para que el bucle de juego funcione correctamente, se debe desarrollar un **temporizador en la cantina** para cada noche; al finalizar el tiempo, se pasará al siguiente día.

**Equilibrado (Nota para el Agente IA):** El ajuste de parámetros y dificultad será responsabilidad del agente IA. La curva de dificultad debe diseñarse para que, en las primeras noches, el jugador sienta que tiene el control absoluto. Posteriormente, la situación debe volverse caótica, obligando al jugador a apoyarse y dominar todas las mecánicas implementadas para sobrevivir.

---

## NOCHE 1: Tutorial Básico
El objetivo de esta noche es enseñar las mecánicas fundamentales. El temporizador avanzará, pero la dificultad será nula; la noche terminará tras atender a un total de 3 clientes.

### Sistema de Comunicación del Tutorial
El juego se comunicará con el jugador de dos formas:
1. **Ventanas de texto en el HUD (Inglés):** Se avanzan haciendo clic con el botón izquierdo del ratón.
2. **Indicadores visuales (Triángulos invertidos):** Iconos sobre objetos, tiles o interfaces que indican con qué se debe interactuar.

### Fase 1: Pre-Apertura
*   **Movimiento (WASD):** Aparecerá una ventana de texto indicando los controles de movimiento.
*   **Modo Construcción:** Ventana de texto explicando la mecánica. Se activará un triángulo indicando al jugador que debe arrastrar mesas y sillas al tilemap de la cantina.
*   **Apertura de Cantina:** Ventana de texto explicando cómo pasar a la fase nocturna. Un triángulo señalará el botón de apertura.

### Fase 2: Nocturna
Antes de la llegada de clientes, se introducen las siguientes mecánicas:
*   **Objetos Interactuables (Bebidas):** Ventana de texto explicando la interacción. Se mostrarán dos recipientes vacíos marcados con triángulos. Al interactuar con ellos, desaparecerán (feedback de éxito).
*   **Torre Central:** Ventana de texto explicando su función. Los tiles correspondientes estarán marcados con triángulos para que el jugador interactúe.
*   **Zona de la Banda:** Ventana de texto explicando su funcionamiento. Se enseñará que la interacción se realiza pulsando la barra espaciadora cerca de la zona.

**Llegada de Clientes (Secuencia de 3 clientes separados):**
1.  **Cliente 1 (Interacción y Asignación):** Ventana de texto sobre el sistema de interacción/asignación. Un triángulo indicará dónde interactuar con el cliente. Luego, aparecerán triángulos en cada silla disponible como feedback visual para asignarle asiento.
2.  **Cliente 1 (Pedidos):** Al sentarse, una ventana de texto explicará el sistema de pedidos, cómo contentar al cliente y los controles necesarios.
3.  **Cliente 1 (Recompensas y Ratas):** Tras contentar al cliente, una ventana de texto explicará que ha soltado créditos al suelo. Se indicará que debe recogerlos rápido o aparecerán ratas (a las cuales se puede golpear si roban dinero).
4.  **Clientes 2 y 3:** Se atenderán de forma continua para afianzar el aprendizaje básico antes de terminar la noche.

### Mecánicas Deshabilitadas (Noche 1)
Para evitar la sobrecarga de información, las siguientes mecánicas estarán desactivadas:
*   **Guía de Clientes:** Todos los clientes de la Noche 1 serán de la misma raza.
*   **Menú de Materiales (Tienda):** Se funcionará exclusivamente con los recursos base.
*   **Comida:** Desactivada al no haber acceso al Menú de Materiales.
*   **Sistemas Avanzados:** Heat Imperial, Reputación y Busca y Captura estarán inactivos.

---

## NOCHE 2: Tutorial Avanzado
Se mantiene el formato de tutorial (Ventanas de texto en el HUD e Indicadores de triángulos), pero introduciendo las mecánicas complejas.

### Fase 1: Pre-Apertura
*   **Menú de Materiales (Tienda):** Ventana de texto explicando su funcionamiento, objetos disponibles y utilidad. Se **obligará** al jugador a comprar comida para poder avanzar.
*   **Guía de Clientes y Ruedas de Afinidades:** Tras comprar comida y cerrar la tienda, una ventana de texto explicará estos sistemas. Un triángulo señalará el menú para abrirlo. Al cerrarlo, otra ventana explicará las consecuencias (qué ocurre al ubicar ciertos clientes juntos, las peleas, la mecánica de sangre y sus penalizaciones).
*   **Sistema de Heat Imperial:** Un triángulo señalará la barra del Imperio en la interfaz. A continuación, una ventana de texto explicará cómo sube y baja esta barra.
*   **Sistema de Busca y Captura:** Ventana de texto explicando la mecánica, qué ocurre durante la noche y las opciones de interacción. Un triángulo señalará el cartel de "Se Busca" obligando al jugador a interactuar para ver el objetivo actual.
*   **Sistema de Reputación:** Un triángulo señalará la barra de Reputación. Una ventana de texto explicará los factores que la aumentan o la disminuyen.

### Fase 2: Nocturna
La dificultad general, flujo de clientes y tiempos siguen siendo permisivos.
*   **Cocina (Comida):** El juego se pausará al recibir el primer pedido de comida. Una ventana de texto explicará el uso de la parrilla. Un triángulo señalará la ubicación de la parrilla para forzar la interacción.
*   **Servicio Normal:** Tras enseñar la cocina, el servicio continuará con normalidad para evaluar la comprensión del jugador hasta que el temporizador finalice.

---

## NOCHES 3, 4 y 5: Escalado de Dificultad
El tutorial ha finalizado. La clave del diseño para estas noches será el **ajuste paramétrico de la dificultad**.

*   **Progresión:** Aumento exponencial de la dificultad.
*   **Rol del Agente IA:** El agente deberá equilibrar los parámetros (frecuencia de clientes, tiempos de espera, probabilidad de eventos como Busca y Captura o peleas) para lograr un flujo de juego tenso pero justo.
*   **Objetivo de Experiencia (UX):** El jugador debe sentir que encuentra el "control dentro del caos", viéndose en la obligación de utilizar de forma simultánea y estratégica todas las mecánicas aprendidas en las Noches 1 y 2.