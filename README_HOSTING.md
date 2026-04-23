# Guía de Despliegue (Hosting)

Esta aplicación es un stack completo (Full-Stack) con React en el frontend y Node.js (Express) en el backend. Sigue estos pasos para desplegarla en tu hosting.

## Requisitos Previos

- **Node.js**: Versión 24 o superior.
- **Base de Datos**: 
  - Por defecto usa **SQLite** (un archivo local `.db`).
  - Recomendado para producción: **MySQL**.

## Pasos para el Despliegue

### 1. Preparar los Archivos
Si estás usando el botón "Download ZIP" de AI Studio, ya tienes todo lo necesario. Si no, asegúrate de tener los archivos en tu servidor.

### 2. Instalar Dependencias
En la raíz del proyecto, ejecuta:
```bash
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo `.env.example` a un nuevo archivo llamado `.env` y completa los valores:
```bash
cp .env.example .env
```
Asegúrate de configurar:
- `JWT_SECRET`: Una cadena aleatoria larga para la seguridad de las sesiones.
- `USE_MYSQL`: Cámbialo a `true` si vas a usar MySQL.
- Credenciales de DB (`DB_HOST`, `DB_USER`, etc.) si usas MySQL.

### 4. Construir la Aplicación
Ejecuta el comando de build para generar los archivos de producción tanto del cliente como del servidor:
```bash
npm run build
```
Esto creará dos carpetas:
- `dist/`: Contiene el frontend (React).
- `dist-server/`: Contiene el servidor compilado.

### 5. Iniciar el Servidor
Para iniciar la aplicación en producción:
```bash
npm start
```

## Notas Adicionales

### Uso de PM2 (Recomendado)
Para mantener la aplicación corriendo en segundo plano y que se reinicie automáticamente si falla:
```bash
npm install -g pm2
pm2 start dist-server/index.js --name "timesheet-app"
```

### Configuración de MySQL
Si decides usar MySQL, asegúrate de crear la base de datos antes de iniciar la aplicación. El servidor intentará crear las tablas automáticamente en el primer inicio si tiene los permisos adecuados.

### Puertos
La aplicación corre por defecto en el puerto `3000`. Puedes cambiarlo en el archivo `.env` añadiendo `PORT=tu_puerto`.

### SSL/HTTPS
Se recomienda usar un proxy inverso como **Nginx** o **Apache** para manejar el SSL y redirigir el tráfico al puerto 3000.
