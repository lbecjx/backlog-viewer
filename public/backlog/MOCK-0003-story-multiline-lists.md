# MOCK-0003 · Rediseñar el flujo de checkout

| Field | Value |
|---|---|
| **Code** | MOCK-0003 |
| **Type** | Story |
| **Priority** | High |
| **Status** | Not Started |
| **Labels** | checkout, ui, conversion |
| **Created** | 2026-08-15 |
| **Updated** | 2026-08-15 |

---

## Descripción

El checkout actual tiene una tasa de abandono del 63% en el paso de pago. Esta story
existe para regressionar el bug real ya encontrado una vez: un ítem de lista cuyo texto
sigue en la línea de abajo (continuación, sin viñeta propia) no debe crear un ítem nuevo
ni renumerar la lista — debe absorberse como parte del ítem anterior.

## Acceptance Criteria

1. El formulario de pago valida el número de tarjeta con el algoritmo de Luhn antes de
   enviar el formulario, mostrando un error inline si falla la validación sin esperar
   la respuesta del servidor
2. Se muestra un resumen del carrito colapsable en mobile, expandido por default en
   desktop, con el subtotal, envío, impuestos y total desglosados en líneas separadas
3. El botón de "Confirmar compra" queda deshabilitado mientras la validación de tarjeta
   está en curso, y muestra un spinner inline en vez de reemplazar el texto del botón
   para no generar un salto de layout (CLS)

## Notas técnicas

- Casos a cubrir en el parser de Markdown de este visor:
  - Un párrafo de continuación (sin viñeta, indentado o no) que sigue inmediatamente
    después de la línea de un ítem de lista debe absorberse en ese mismo ítem
  - Una lista numerada no debe perder la numeración correcta después de una
    continuación multi-línea como las de arriba

## Definition of Done

- [ ] Acceptance Criteria cumplidos
- [ ] Verificado visualmente que ningún ítem de lista se corta ni se renumera mal

---

> Story de prueba (mock) para desarrollo del visor — regressiona a propósito el bug de
> listas multi-línea ya resuelto una vez en la versión Python del generador.
