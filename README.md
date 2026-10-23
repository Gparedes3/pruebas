# Citas Médico Familiar — Auditoría de caja blanca

Backend en Node.js (Express) + SQLite (`node:sqlite`, Node 22+) y frontend en Alpine.js. Las cuatro reglas de negocio viven aisladas en `src/reglas.js` para poder auditarlas con McCabe y cobertura.

```bash
npm install
npm start                       # http://localhost:3000
npm test                        # todas las suites (43 tests)
npm run test:zombi              # cobertura de la suite ingenua
npm run test:auditor            # cobertura de la suite McCabe
npm run test:auditor-fronteras  # McCabe + valores frontera
npm run mutar                   # 18 mutantes contra las 3 suites
```

## Reglas implementadas

| Regla | Función | Comportamiento |
|---|---|---|
| Edad | `validarEdad(edad, especialidad)` | Pediatría solo < 18 años; medicina general solo ≥ 18 |
| Horarios | `validarHorario(fecha)` | L-V 08:00–17:00, sábado 08:00–12:00, domingo cerrado, 13:00–14:00 almuerzo |
| Choque | `hayChoque(citas, nueva)` | Mismo médico, cita activa y rangos solapados → rechazo (409) |
| Penalización | `calcularPenalizacion(inicio, cancelacion, esEmergencia)` | < 24 h y sin emergencia → $10 |

## Paso 1 — Complejidad ciclomática V(G) = P + 1

Cada condición atómica de un `&&` cuenta como nodo predicado (igual que en la regla de penalización del taller).

| Función | Nodos predicado | V(G) | Tests exigidos |
|---|---|---|---|
| `validarEdad` | `especialidad==='pediatria'`, `edad>=18`, `especialidad==='medicina_general'`, `edad<18` | 4 + 1 = **5** | 5 |
| `validarHorario` | `dia===0`, `hora<8`, `dia===6`, `hora>=12`, `hora>=17`, `hora===13` | 6 + 1 = **7** | 7 |
| `hayChoque` | `for…of`, `medicoId!==`, `estado==='cancelada'`, `nueva.inicio<c.fin`, `c.inicio<nueva.fin` | 5 + 1 = **6** | 6 |
| `calcularPenalizacion` | `cancelacionTardia`, `!esEmergencia` | 2 + 1 = **3** | 3 |
| **Total** | | | **21** |

Comprobación con E − N + 2 en `calcularPenalizacion`: nodos {inicio, cancelacionTardia?, !esEmergencia?, penalizar, no penalizar, fin} = 6; aristas = 7 → 7 − 6 + 2 = 3.

Ninguna función pasa de V(G) = 10, así que no hace falta refactorizar (paso 5 del framework).

Hallazgo del camino C5 de `validarEdad`: una especialidad que no sea pediatría ni medicina general pasa sin validación. En la app lo frena el `CHECK` de SQLite, pero la función por sí sola no lo controla.

## Paso 2 — El falso 100 %

`tests/zombi.test.js` es lo que sale del prompt ingenuo: recorre las líneas y solo comprueba `toBeDefined()`, `toBeTruthy()` o el tipo de dato.

| Suite | Tests | Stmts | Branch | Mutantes muertos |
|---|---|---|---|---|
| Zombi (prompt ingenuo) | 4 | 100 % | 96.87 % | **0 / 18 (0 %)** |
| Auditor (V(G) caminos) | 21 | 100 % | 100 % | **10 / 18 (56 %)** |
| Auditor + fronteras | 34 | 100 % | 100 % | **18 / 18 (100 %)** |

La suite zombi reporta 100 % de líneas y no detecta ni un solo fallo inyectado. Además, Jest marca como cubierta la condición `cancelacionTardia && !esEmergencia` aunque la suite nunca prueba el caso de emergencia: la cobertura de ramas de Istanbul cuenta que cada operando se evaluó, no que tomó los valores true y false. Eso es justamente lo que mide MC/DC y Jest no.

## Paso 3 — Re-prompting del auditor

Prompt usado para la suite `auditor.test.js`:

> Actúa como Ingeniero de QA. He calculado la complejidad ciclomática de cada función de `reglas.js`: validarEdad V(G)=5, validarHorario V(G)=7, hayChoque V(G)=6, calcularPenalizacion V(G)=3. Genera exactamente un test por cada camino independiente (21 en total) en Jest, con aserciones estrictas `toEqual`/`toBe` sobre el objeto devuelto, incluido el mensaje de rechazo y el monto de la penalización.

## Paso 4 — Mutaciones

Los 8 mutantes que sobreviven a la suite McCabe cambian `<` por `<=` o `>=` por `>`: errores de frontera (18 años, 08:00, 12:00 del sábado, 17:00, citas contiguas, 24 h exactas). V(G) dice cuántos caminos probar, pero no qué valor usar en cada uno. `tests/fronteras.test.js` agrega 13 casos de valor límite y mata los 18. Detalle por mutante en `resultados-mutacion.json`.

## Cuestionario de auditoría

1. **¿Conozco V(G) antes de leer los tests de la IA?** Sí. Lo calculé primero (5, 7, 6 y 3) y con eso exigí 21 tests en el prompt.
2. **¿El 100 % de cobertura incluye oráculos fuertes?** En la suite zombi no: 100 % de líneas y 0 de 18 mutantes detectados. La suite del auditor compara el objeto completo devuelto.
3. **¿Están evaluadas todas las condiciones o solo las líneas?** Con la suite McCabe sí, cada condición atómica tiene un camino. La herramienta por sí sola no lo garantiza: dio por cubierta la condición de emergencia sin haberla probado en falso.
4. **¿Forcé mutaciones?** Sí, 18. La suite McCabe mató 10; las 8 restantes eran fronteras y obligaron a añadir pruebas de valor límite.
5. **¿Conviene refactorizar en vez de testear?** No en este caso. La función más compleja es `validarHorario` con V(G) = 7, por debajo del umbral de 10.
