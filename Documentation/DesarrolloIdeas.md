
## 1. Mapa Mental de Arquitectura del Juego (Validación Técnica)

Para que todos tus sistemas convivan sin abrumar a un solo jugador, el juego se estructura en **3 Escenas/Fases conectadas por un Ciclo Día/Noche**:

```
[FASE DIURNA: EXTERIOR (Sin límite de tiempo estresante)]
   ├── 1. HUB: Plaza de Mos Eisley (Comercio, Misiones, Contratación de Personal)
   └── 2. INCURSIÓN (1 al día): Desierto de Tatooine (Combate/Recolección de Ingredientes y Chatarra)
          │
          ▼ (Al caer los dos soles)
[FASE PRE-APERTURA: LA CANTINA (Modo Edición / Preparación)]
   ├── Modo Construcción (Grid Tiled): Mover mesas, sillas, barriles y estaciones
   └── Libro de Gestión: Elegir menú de la noche según stock y pagar por adelantado (o preparar) mejoras
          │
          ▼ (Abrir puertas - Turno de 3 a 4 minutos)
[FASE NOCTURNA: SERVICIO CAÓTICO]
   └── Bucle: Entrada (Detector Droides) ➔ Sentar (Cuidar Afinidad Racial) ➔ Atender (Bebida/Comida/Música) ➔ Cobrar (Evitar Ratas) ➔ Eventos (Peleas / Imperio) ➔ Salida

```

---

## 2. Validación y Desarrollo de tus Ideas Clave

### A. Disposición en Cuadrícula (*Tiled*), Mobiliario y Reglas de Sillas

Tu idea del uso de *tiles* para las mesas y la barra es **100% viable y brillante a nivel estratégico** para Phaser 4:

* **Estado Inicial:** El jugador (controlando a **Wuher**) empieza con la barra en "U", **2 mesas y 4 sillas por mesa** (8 asientos en mesa).


* **Lógica de Validación de Sillas (En código):**
* Cada *tile* del mapa guarda su estado (`VACIO`, `MESA`, `BARRA`, `SILLA_ACTIVA`, `SILLA_INACTIVA`).
* **Regla de Mesa:** Una mesa de 1x1 o 2x2 *tiles* solo admite sillas en sus *tiles* ortogonales adyacentes (máximo 4 sillas para mesa pequeña).


* **Regla de Barra (Trade-off estratégico):** Si colocas una silla pegada a un *tile* exterior de la barra en "U", esa silla se vuelve `SILLA_ACTIVA`, pero **bloquea el *tile* correspondiente del mostrador de la barra**. Es decir: ganas un asiento rápido cerca de los barriles, pero pierdes un espacio de encimera donde dejar vasos preparados, platos o máquinas.


* **Sillas Huérfanas:** Cualquier silla que no tenga una `MESA` o `BARRA` en su *tile* adyacente queda marcada con un icono de advertencia (`SILLA_INACTIVA`) y no permite asignar clientes.




* **Flujo de Puertas (Entrada y Salida):**
* **Puerta Principal (Norte/Oeste):** Con el **Detector de Droides** en el umbral. Ahí se forma la cola de entrada donde esperan a que Wuher los reciba y les asigne asiento.


* **Puerta Trasera / Callejón (Sur/Este):** Una vez que el cliente consume y lanza los créditos al aire, camina directamente hacia la puerta de salida, evitando chocar con los que están entrando y facilitando el *pathfinding* (A* sobre la cuadrícula de *Tiled*).





---

### B. ¿Opción de Comida y Bebidas? (Resolución de Investigación)

En tu documento planteas revisar los barriles de bebida y si meter **comida**. Veredicto: SÍ a ambos. Si solo hay bebida y música, a partir del Día 3 el juego se vuelve repetitivo; la comida (como en *Meadgard*) es lo que justifica salir a cazar al desierto por el día.

#### 1. Los Barriles de Bebida en la Barra (Torre Dispensadora):

En lugar de barriles de madera vikingos, son **Cilindros Presurizados conectados a la Torre IG** en el centro de la barra:

* **Leche Azul (*Bantha Milk*):** Bebida básica inicial (barata, rápida de servir).
* **Juri Juice:** Bebida morada espumosa (favorita de alienígenas pacíficos).
* **Black Fizzer:** Licor oscuro y fuerte (favorito de criminales y cazarrecompensas).
* **Funcionamiento:** Se sirven en **Vasos Metálicos** manteniendo presionado `Espacio`. Cuando un cilindro se vacía, Wuher debe ir al almacén a cargar un tanque de repuesto (caminando lento) o destilar más con recursos del exterior.



#### 2. ¿Qué Comida se sirve en la Cantina de Mos Eisley? (Lore Real de Star Wars):

Aunque la cantina es famosa por sus tragos, en el lore de Tatooine y *Galaxy's Edge* se sirven snacks de cantina que Wuher prepara en una **Parrilla de Fusión / Estación de Corte**:

* **Brochetas de Rata Womp (*Womp Rat Skewers*):** Carne cazada en el exterior + Hongos de vaporizador.
* **filetes de Bantha Ahumados (*Bantha Steaks*):** Carne pesada de Bantha + Especia del desierto.
* **Bocadillos de Escarabajo Gorg / Peka Empanada:** Snacks crujientes favoritos de especies como los Rodianos o Chadra-Fan.
* **Sal Cristalina de Tatooine:** Servida en cuencos (droga legal para los Arcona).

---

### C. La Rueda de Afinidades Raciales y Consecuencias de las Peleas

Esta es **la mejor mecánica original de tu documento**. En *Meadgard* puedes sentar a cualquiera con cualquiera, pero meter una **Rueda de Afinidades** convierte el acto de sentar clientes en un puzle táctico en tiempo real.

#### 1. Rueda de Afinidades de Star Wars (5 Arquetipos de Razas):

Para que el jugador la memorice fácilmente de un vistazo por el color y forma del sprite, usamos **5 razas icónicas de la Cantina**:

| Raza / Cliente | Se lleva MAL con (Acelera enfado x2)

 | Razón en el Lore de Star Wars |
| --- | --- | --- |
| **1. Wookiees** (ej. Chewbacca) | **Trandoshanos** (Lagartos tipo Bossk) y **Humanos Contrabandistas** | Los Trandoshanos cazan Wookiees por sus pieles; viejas deudas de juego. |
| **2. Trandoshanos** | **Wookiees** y **Rodianos** | Rivalidad feroz entre gremios de cazarrecompensas. |
| **3. Rodianos** (ej. Greedo) | **Humanos Contrabandistas** (ej. Han Solo) y **Aqualish** | Los Rodianos cobran recompensas de Jabba sobre los contrabandistas humanos.

 |
| **4. Aqualish** (ej. Ponda Baba) | **Humanos** y **Ithorianos** | Los Aqualish son matones agresivos que odian a los pacíficos Ithorianos y buscan pelea con humanos. |
| **5. Ithorianos** (Hammerhead) | **Aqualish** y **Trandoshanos** | Amantes de la paz; se estresan rápidamente si tienen matones agresivos al lado. |

* **Regla en el Grid:** Si sientas a dos razas incompatibles en la **misma mesa** o en **sillas de barra contiguas** (distancia de 1 *tile*), aparece un icono de rayos rojos entre ellos y su temporizador de paciencia baja el doble de rápido.



#### 2. ¿Qué pasa cuando se agota el tiempo y estalla la pelea?



Cuando el reloj llega a cero entre dos razas rivales, se levantan de la silla y entran en estado `PELEA` (nube de golpes o disparos de bláster):

* **Opción 1: Wuher interviene a tiempo:** Te acercas con `Espacio` (dándoles un golpe con el garrote detrás de la barra o gritando *"¡Sin blásters!"*) o activas a la banda de música para calmar el ambiente. Se separan, pero pierdes la propina.


* Opción 2: ¿Qué pasa si NO los paramos y se matan entre sí? (Respuesta a tu pregunta):
Si dejas que la pelea termine, **uno mata al otro de un disparo de bláster o golpe letal**, generando **4 consecuencias en cadena** muy jugables:


1. **Cero ingresos:** El muerto obviamente no paga, y el asesino huye corriendo por la puerta trasera sin pagar su cuenta.
2. **Destrozo de mobiliario:** La silla o mesa donde peleaban queda rota (estado `DESTRUIDO`), inutilizando esos asientos por el resto de la noche hasta que los repares con chatarra (*scraps*).
3. **Charco y Cadáver / Brazo amputado:** Queda un cadáver o un charco de sangre en esos *tiles*. Ningún cliente nuevo querrá sentarse cerca hasta que Wuher (o el conserje) lo limpie, reduciendo el humor de los clientes cercanos.
4. **Aumento del Nivel de Alerta Imperial (Heat):** Un asesinato con bláster dentro del local sube la barra de alerta del Imperio, provocando una inspección inmediata de *Sandtroopers*.
*(Toque de humor oscuro del lore: Al limpiar el cadáver de un alienígena, Wuher puede obtener un ingrediente secreto para destilar su famoso "Trago Especial" que se vende al doble de precio).*





---

### D. La Banda Musical, el Cobro y las Ratas Ladronas

* **La Banda (*Figrin D'an y los Modal Nodes*):** Están en su tarima lateral. Tienen un bote de propinas/pago frente al escenario. Cuando uno o varios clientes piden música (icono de corchea), Wuher va al escenario, **paga una pequeña tarifa en créditos con `Espacio**` y la banda toca su tema clásico durante 20-30 segundos. Mientras suenan:


* Se completan automáticamente todos los pedidos de música activos en el bar.


* Se ralentiza un 25% la caída de paciencia de todos los clientes (mitigando las malas afinidades raciales).




* **El Dinero en el Aire y las Ratas del Planeta:**
* Al terminar su consumición, el cliente lanza los **Créditos Imperiales** por los aires y caen en un *tile* cercano del suelo.


* Si no los recoges en unos segundos, de las rejillas de ventilación o la puerta salen **Scurriers** (las ratas ladronas de Mos Eisley que se ven en las películas) o pequeñas **Ratas Womp**. Corren hacia las monedas brillantes, se las llevan en la boca y huyen a su madriguera si no las golpeas antes.





---

### E. El Imperio: Inspectores, Busca y Captura, y Reputación

Tus preguntas sobre el Imperio dan pie a una mecánica de **Riesgo / Recompensa moral** buenísima:

1. **Los Inspectores Imperiales (Sandtroopers):**
* Una o dos veces por noche, entra un oficial de *Sandtroopers* por la puerta principal. Camina inspeccionando las mesas buscando dos cosas: **contrabando/cadáveres sin limpiar** o **clientes en Busca y Captura**.




2. **Clientes en Busca y Captura (*Wanted*):**
* En la pared al lado de la barra tienes un **Póster Holográfico de Buscados** que cambia cada día (ej. *"Hoy se busca a un Rodiano con cicatriz o al Dr. Evazan - Recompensa: 150 Créditos"*).


* Cuando ese cliente entra al bar, tú decides qué hacer:


* **Opción A (Lealtad Criminal):** Lo sientas en una alcoba oscura/alejada para que los *Sandtroopers* no lo vean. Si sobrevive sin ser visto, te deja una **propina enorme** y sube tu **Reputación del Bajo Mundo (Jabba)**.
* **Opción B (Delatar al Imperio):** Te acercas al *Sandtrooper* (o activas el transmisor de **Garindan**, el espía de trompa larga en la esquina) con `Espacio` para señalar la mesa del fugitivo. Los soldados lo arrestan y te pagan la jugosa recompensa imperial en el acto.






3. ¿Qué pasa si los demás clientes te ven conspirar con el Imperio? (Respuesta a tu pregunta):


* **Consecuencia Inmediata (Si te ven):** Si delatas a alguien mientras hay clientes sentados en un radio de 3 *tiles* mirándote, les sale el icono de **"¡Soplón!"**: se indignan, se levantan de golpe, tiran sus bebidas al suelo y **abandonan el bar sin pagar**.


* **Consecuencia a Largo Plazo (Barra de Reputación):** Si abusas de entregar gente al Imperio a la vista de todos, baja tu reputación criminal. Al día siguiente **vienen menos clientes ricos** (los contrabandistas que mejor pagan dejan de ir por miedo) y Jabba el Hutt puede enviarte matones a cobrar "impuestos" o sabotear tus barriles.


* *¿Cómo delatar sin perder clientes?:* Esperar a que las mesas cercanas estén vacías, usar la música de la banda como distracción para que todos miren al escenario, o usar el transmisor oculto detrás de la barra cuando nadie esté sentado en los taburetes de la barra.



---

### F. División del Mundo Exterior y Contratación de Personal

#### 1. ¿Cómo dividimos el mundo de fuera?



Tu propuesta de dividirlo en dos zonas conectadas es la más limpia y óptima para Phaser 4:

* Zona 1: La Calle Comercial de Mos Eisley (Justo al salir de la puerta de la Cantina):
Un mapa seguro sin combate donde están los puestos del puerto espacial:


* **Chatarra de Watto / Toydariano (Carpintería/Mecánica):** Le entregas chatarra (*scraps*) y créditos para comprar más mesas, sillas, barriles adicionales, la parrilla de comida o mejorar el Detector de Droides.


* **Puesto del Mercado Negro:** Compra de vasos extra, barriles de bebidas exóticas y decoración.


* **Agencia de Mercenarios / Muelle de Embarque:** Donde hablas con NPCs para aceptar misiones o **contratar personal de apoyo** para la cantina.




* Zona 2: Las Afueras / Desierto de Tatooine (Saliendo por el arco de la ciudad):
Al cruzar las puertas de Mos Eisley entras al mapa de acción/recolección (1 incursión por día, igual que en *Meadgard*):


* Cazas **Ratas Womp** y **Banthas** (carne y leche), recolectas **Hongos de vaporizadores de humedad** y **Frutas del desierto** (para destilar bebidas), y rompes cajas de **Jawas** o campamentos **Tusken** para obtener piezas mecánicas y objetos de misión.





#### 2. Contratación de Personal para Días Avanzados



Como bien apuntas, al ser un juego para **un solo jugador**, cuando en los días avanzados tengas 4 o 5 mesas llenas y los tiempos de paciencia sean más cortos, necesitarás automatizar tareas contratando personajes míticos del lore (a cambio de un pequeño sueldo diario de tus ganancias):

1. **Tork (El Portero / Bouncer):** Se queda patrullando el salón. Separa peleas automáticamente antes de que se maten, echa a las ratas ladronas de monedas y limpia los cadáveres/charcos.
2. **Ackmena (Camarera de Apoyo):** Recoge vasos vacíos tirados por el suelo, los lleva a la barra y sirve bebidas automáticamente a las mesas que ya estén sentadas.
3. **Bomo / Chef Ayudante:** Se queda fijo en la estación de cocina preparando los platos automáticamente para que Wuher solo tenga que recogerlos y entregarlos.

---

### G. Esquema de Controles Validado (Teclado + Ratón)

El esquema que definiste es sumamente cómodo y evita combinaciones complejas de teclas:

* **`W, A, S, D`:** Movimiento en 8 direcciones de Wuher (con un pequeño *Dash* opcional con `Shift` para emergencias).


* **`Espacio` (Contextual en 2 pasos):**
* **Manos vacías + `Espacio`:** Recoge el objeto frente a ti (vaso, plato, barril, moneda del suelo) o interactúa con un cliente en la puerta para acompañarlo a una silla.


* **Con objeto en mano + `Espacio`:** Usa el objeto según lo que tengas enfrente (si estás frente al barril con un vaso, lo llena; si estás frente al cliente que lo pidió, se lo entrega; si estás frente a una encimera vacía, lo deja apoyado).


* **Frente a pelea / rata + `Espacio`:** Da un golpe para detener la pelea o espantar a la rata.




* **`Ratón (Clic Izquierdo / Derecho)`:** Exclusivo para la interfaz de usuario (UI), el Libro de Gestión antes de abrir el turno, las tiendas de Mos Eisley y el modo de arrastrar y colocar mesas/sillas en la cuadrícula (*Tiled*).

