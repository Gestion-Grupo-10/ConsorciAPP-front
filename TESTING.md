# Testing con `VITE_BUILD_TEST`

Este proyecto incluye un modo de testing que se activa con la variable de entorno `VITE_BUILD_TEST=true`.

## Cuándo usarlo

Usalo cuando necesites validar comportamiento funcional de la app sin depender de la fecha real del sistema, por ejemplo para probar:

- vigencia de tasa de mora,
- vencimientos,
- cierres de período,
- selección de períodos en el detalle del consorcio,
- defaults de formularios que usan la fecha actual.

## Cómo activarlo

### Desarrollo

```bash
VITE_BUILD_TEST=true npm run dev
```

### Build de testing

```bash
VITE_BUILD_TEST=true npm run build
```

### Build normal

```bash
npm run build
```

## Qué cambia al activarlo

Cuando `VITE_BUILD_TEST=true`:

- aparece un panel de fecha de testing en la app,
- podés elegir una fecha simulada,
- la fecha efectiva usada por la app se persiste localmente,
- los flujos que dependen de "hoy" usan esa fecha simulada.

Cuando `VITE_BUILD_TEST` no está definido o vale `false`:

- el panel no se muestra,
- la app usa la fecha real del sistema,
- no hay persistencia de fecha simulada.

## Qué validar manualmente

1. Abrí la app con `VITE_BUILD_TEST=true`.
2. Cambiá la fecha del panel a un mes actual, anterior y futuro.
3. Verificá que el detalle del consorcio actualice el período visible.
4. Revisá que la mora mostrada corresponda a la fecha seleccionada.
5. Abrí el diálogo de edición de mora y comprobá que la vigencia propuesta use la fecha de testing.
6. Ejecutá vencimientos y confirmá que se aplica la tasa vigente del período.

## Fuente de fecha

La lógica de fecha vive en una sola capa compartida: [src/lib/appDate.ts](src/lib/appDate.ts).

Esa utilidad expone la fecha efectiva de la app y evita que cada componente lea la hora por su cuenta.

## Nota

Si necesitás volver a la fecha real del sistema, usá la acción de restaurar del panel de testing.
