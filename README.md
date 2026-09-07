# Aforo con Molinete — aplicación web móvil

Aplicación estática (HTML/CSS/JavaScript) para usar desde Android, iPhone, tablet o computadora sin instalar una app.

## Fuente de velocidades
Las tablas se copiaron directamente de `Tablas_Molinetes_Calibracion_2026.xlsx`. La aplicación hace búsqueda exacta por **molinete + suspensión + tiempo + revoluciones**. No usa ecuaciones ni interpolación.

## Cómo probar en una computadora
En esta carpeta ejecute `python -m http.server 8000` y abra `http://localhost:8000`.

## Cómo publicarla sin instalar app
Suba todos los archivos de esta carpeta a un hosting estático con HTTPS (por ejemplo GitHub Pages, Netlify o un servidor institucional). Después solo se comparte la URL.

## Uso sin señal
Al abrirla una vez desde una URL HTTPS, el service worker guarda los archivos básicos en caché. El aforo en curso se conserva en `localStorage` del dispositivo.

## Flujo
1. Configuración: ancho, sección, observaciones, método, molinete y suspensión.
2. Captura: todos los puntos llevan profundidad; los pares 2,4,6... llevan revoluciones/tiempo.
3. Cálculo: anchura = distancia del impar siguiente - impar anterior; profundidad media = (Dant + 2·Dpar + Dsig)/4; área = anchura × profundidad media; Q = área × velocidad.
4. Resultados: m³/s, L/s, área, velocidad media, CSV y PDF mediante impresión del navegador.


## Versión 3
Las distancias de los puntos se generan y almacenan redondeadas a 2 decimales (0.01 m). Los cálculos de anchura de sección usan esas distancias redondeadas.


## Corrección v4
Las distancias generadas, las distancias recuperadas del almacenamiento local y las distancias editadas manualmente se normalizan a 2 decimales. La interfaz las muestra siempre con dos cifras decimales y los cálculos usan esos valores redondeados. Se actualizó la caché PWA a `aforo-v4-redondeo-corregido`.
