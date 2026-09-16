# PRD · La evolución en tres pasos — el rediseño de NEXT

**Estado**: las cuatro tandas construidas y verdes (16-sep-2026); falta la revisión campo por campo con Diego. **Dueño**: Diego Melo Villagrán.
**Escribe**: Claude, 16-sep-2026.
**Alcance**: el camino de registro de un turno. **Fuera**: el modelo de datos de
la rama episodio/turno (ya está y no se toca), la PWA y el login (hechos), la
planilla de producción (no se toca nunca).

**Mockup navegable**: https://claude.ai/artifact/2uroNmVyBSw5tHgyRFGo5D

---

## 1 · Hoy → después, en dos líneas

Hoy el registro de un turno es **un modal con 225 campos** donde conviven cuatro
cosas distintas: lo que pasó en el turno, lo que se midió, los eventos y el
relato que se escribe solo mientras llenas.

Después son **tres pasos, uno después del otro**: turno (con sus eventos),
evaluaciones, relato. Cada paso escribe en una sola casa de las que ya existen
en el esquema.

---

## 2 · Por qué, y qué NO es esto

El modelo de datos ya está segmentado desde la rama episodio/turno: episodio,
serie fechada, evento y turno. **La pantalla todavía no respeta ese corte.** El
campo `fMRC` es el ejemplo: vive dentro del formulario del turno y al guardar
escribe en tres lugares a la vez.

Esto **no** es una reorganización de datos —esa ya se hizo y quedó verde, la
mide `checks/episodio_turno.js` con 88 comprobaciones—. Es llevar el mismo corte
a la pantalla.

---

## 3 · La historia

**Antes.** Rodrigo abre la cama 7 y recibe un muro. El MRC está en algún lugar
entre los 225 campos y se lo salta sin darse cuenta; nadie se entera nunca. Del
turno anterior quedó dicho «pedir fonoaudiología antes de decanular», pero ese
recordatorio se guardó en la fila del turno de noche y **no se replica**: para
Rodrigo no existe. Mientras llena, el relato se va escribiendo solo al costado;
él le corrige una frase. Al final aprieta guardar y no sabe bien qué quedó.

**Después.** Rodrigo abre la cama 7 y lo primero que ve es lo que le dejaron
encargado: la fonoaudiología, y la Pimáx cuando baje la presión de soporte.
Cierra la primera ahí mismo. Registra el turno; la pregunta «¿qué pasó hoy con
la vía aérea?» está arriba y él marca «Nada». Avanza. El paso 2 le muestra las
escalas del episodio con quién las midió y cuándo: el FSS nunca se midió y sale
en ámbar. Hoy no midió nada, así que aprieta **«No medí nada este turno»** y
sigue de largo en un clic. Se guarda. El paso 3 le muestra el relato ya escrito,
el plan, y le ofrece dejar pendiente justo lo que quedó en ámbar.

---

## 4 · Las decisiones de Diego (16-sep-2026)

| # | Decisión | Consecuencia |
|---|---|---|
| D1 | **Modal secuencial de tres pasos**: turno (con eventos) → evaluaciones → relato | Reemplaza, no apila: en el teléfono no hay modal sobre modal |
| D2 | **El relato se puede retocar a mano** — «es solo narrativo» | Sigue existiendo `TEXTO_MANUAL`; el dato nunca sale del relato |
| D3 | **Al volver atrás y corregir, el relato se regenera** | Si había retoque, se avisa antes de pisarlo (ver §6) |
| D4 | **Cualquiera del equipo cierra un pendiente** | Se guarda quién lo cerró, pero no se exige que sea quien lo abrió |
| D5 | **El plan va en el paso 3**, junto al relato | Tres pasos, no cuatro: un clic menos por cama |
| D6 | **Se elimina la regla del SBC** (KTM nivel 3 exigía un FSS del episodio) | Ver §7 — sale cuando exista el paso 2, no antes |

---

## 5 · Los tres pasos

### Paso 1 · Turno
1. **Lo que te dejaron pendiente**, arriba de todo, con su botón de cerrar.
   Es lo primero porque es lo que el turno anterior te encargó: se lee *antes*
   de decir qué hiciste.
2. **«¿Qué pasó hoy con la vía aérea?»** — ya existe y no se reescribe. El
   evento fija la vía aérea; sin evento, cuesta un motivo escrito.
3. El resto del turno: ventilación, sedación, hemodinamia, KTM, KTR.

### Paso 2 · Evaluaciones
Las escalas **del episodio**, cada una con su valor, su fecha y la firma de
quien midió. Las que faltan salen en ámbar.

🔴 **El paso 2 tiene que ser barato.** Las escalas no se miden todos los turnos
y son 12 a 20 camas por turno: si obliga a llenar algo, el equipo lo abandona en
tres días. Se cruza con **un botón** («No medí nada este turno») y aun así deja
visto lo que le falta al episodio.

**Aquí ocurre el guardado real.** En la UCI se sale corriendo: si suena una
alarma durante el paso 3, lo escrito ya está a salvo.

### Paso 3 · Relato
1. **«Guardado ✓»** con el turno y la fecha.
2. El relato ya escrito, **retocable** (D2).
3. El plan para el turno siguiente.
4. Los pendientes nuevos, ofrecidos desde lo que el paso 2 dejó en ámbar.

---

## 6 · El retoque y la regeneración (D2 + D3 juntas)

Las dos decisiones se cruzan en un punto: **si retocaste el relato y después
vuelves atrás a corregir un dato, la regeneración se lleva el retoque.** Es el
mismo problema que hoy tiene `TEXTO_MANUAL`, y con un botón «atrás» va a pasar
seguido.

**Regla**: regenerar es lo normal y no pregunta nada. Pero si el relato **tiene
retoque a mano**, antes de pisarlo se avisa en una línea y se puede conservar.
Nunca se borra trabajo escrito en silencio.

---

## 7 · La regla del SBC — cuándo sale

Hoy `validarSBC` rechaza un turno con KTM nivel 3 si el episodio no tiene ningún
FSS-ICU, en el cliente y en el servidor. Diego decidió eliminarla: con el camino
secuencial el FSS se mide en el paso 2, o sea **después** de marcar la KTM, así
que rechazar en el paso 1 sería rechazar algo que todavía no podía estar.

🪤 **Sale con la tanda que construya el paso 2, no antes.** Hoy el FSS está en el
mismo formulario que la KTM, así que el candado todavía se puede cumplir sin
fricción; sacarlo ahora dejaría la app sin la regla y sin su reemplazo.

Consecuencia clínica, dicha para que quede escrita: se podrá registrar SBC sin
ningún FSS en el episodio. Diego lo decidió sabiéndolo.

---

## 8 · Los datos que faltan

Todo lo demás ya existe. Lo único nuevo son los **pendientes**.

Hoy `PLAN_PENDIENTES` es una lista de chips en la fila del turno y el propio
esquema dice «NO se replican»: el pendiente muere a las 12 horas. Para poder
cerrarlo tiene que vivir en el **episodio**, como AET y UPOT — y necesita
estado, no solo texto:

| Qué | Para qué |
|---|---|
| texto | lo que hay que hacer |
| quién y cuándo lo abrió | procedencia, igual que la firma de una medición |
| quién y cuándo lo cerró | vacío = sigue abierto (D4: cualquiera cierra) |
| de qué episodio | para que muera con el alta, no con el turno |

`PLAN_PENDIENTES` del turno **no se toca**: sigue escribiéndose como hoy, para
que la entrega de turno y el REM no cambien de fuente.

---

## 9 · Pseudo-código como acuerdo

```
CUANDO se abre una cama
  → paso 1, y arriba los pendientes ABIERTOS del episodio

CUANDO se cierra un pendiente
  → queda quién lo cerró y cuándo; no se borra, no se exige que sea quien lo abrió

CUANDO se avanza del paso 1 al 2
  → nada se guarda todavía; los eventos ya fijaron la vía aérea

CUANDO se sale del paso 2 (midiendo o con «no medí nada»)
  → SE GUARDA: EVOLUCIONES + hitos + EVALUACIONES si midió algo
  → recién ahí se arma el relato

CUANDO se vuelve atrás desde el paso 3 y se corrige un dato
  → el relato se regenera
  → salvo que tenga retoque a mano: entonces se avisa antes de pisarlo

PROMESAS
  · las 396 columnas de EVOLUCIONES no se tocan
  · el REM no cambia de fuente
  · PLAN_PENDIENTES del turno se sigue escribiendo igual
  · nada se pega en la planilla de producción
```

---

## 10 · Orden de construcción

| Tanda | Qué | Por qué en ese orden |
|---|---|---|
| ~~**A**~~ ✅ | Los pendientes del episodio: dato, servicio, guardia | Sin esto los pasos 1 y 3 no tienen qué mostrar |
| ~~**B**~~ ✅ | El armazón de los tres pasos y el paso 1 | Es donde entra lo de la tanda A |
| ~~**C**~~ ✅ | El paso 2 de verdad: chips del episodio y la salida barata; salió la regla del SBC (§7) | El armazón ya está |
| ~~**D**~~ ✅ | El paso 3: guardado, relato, regeneración con aviso, plan y pendientes | Cierra el ciclo con los pendientes de A |
| **E** ← aquí | Revisión campo por campo con Diego | El camino ya funciona; ahora se afina el contenido |

Cada tanda con su guardia **escrita primero y vista roja**, como el resto de la
batería.
