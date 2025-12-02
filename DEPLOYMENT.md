# Guía de Deployment a GitHub Pages

## ✅ Pasos Completados Automáticamente

1. ✅ Configurado `vite.config.js` con base path
2. ✅ Agregados scripts de deploy a `package.json`
3. ✅ Instalado paquete `gh-pages`

## 📋 Pasos que Debes Hacer Manualmente

### 1. Crear Repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Click en el botón **"+"** (arriba derecha) → **"New repository"**
3. Configuración:
   - **Repository name**: `royal` (o el nombre que prefieras)
   - **Description**: "Royal Car - Sistema de Gestión de Flota"
   - **Visibility**: Public (recomendado para GitHub Pages gratis)
   - ❌ **NO** marques "Add a README file"
   - ❌ **NO** agregues .gitignore ni license
4. Click **"Create repository"**
5. **Copia la URL** del repositorio (ej: `https://github.com/tu-usuario/royal.git`)

### 2. Actualizar Vite Config (si cambiaste el nombre)

Si tu repositorio NO se llama "royal", edita `vite.config.js`:

```javascript
base: '/nombre-de-tu-repo/', // Cambia esto
```

### 3. Inicializar Git y Subir Código

Abre la terminal en la carpeta del proyecto y ejecuta:

```bash
# Inicializar git
git init

# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "Initial commit - Royal Car app"

# Cambiar a rama main
git branch -M main

# Agregar el repositorio remoto (usa TU URL)
git remote add origin https://github.com/TU-USUARIO/royal.git

# Subir el código
git push -u origin main
```

### 4. Hacer el Deploy

Una vez que el código esté en GitHub, ejecuta:

```bash
npm run deploy
```

Este comando:
- Construye la app (`npm run build`)
- Sube la carpeta `dist` a la rama `gh-pages`

### 5. Configurar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (⚙️)
3. En el menú izquierdo, click en **Pages**
4. En "Source":
   - Branch: **gh-pages**
   - Folder: **/ (root)**
5. Click **Save**

### 6. Acceder a tu App

Espera 1-2 minutos y tu app estará disponible en:

```
https://TU-USUARIO.github.io/royal/
```

## 🔄 Actualizar la App

Cuando hagas cambios:

```bash
git add .
git commit -m "Descripción de los cambios"
git push
npm run deploy
```

## ⚠️ Notas Importantes

- **Firebase**: La app seguirá usando Firebase, así que funcionará online
- **Autenticación**: Los usuarios deberán tener cuentas creadas en Firebase
- **Datos**: Los datos se guardan en Firebase, no en GitHub
- **URL Pública**: Cualquiera con el link puede acceder (pero necesita login)

## 🆘 Problemas Comunes

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin TU-URL
```

### Error 404 en GitHub Pages
- Verifica que el `base` en `vite.config.js` coincida con el nombre del repo
- Espera unos minutos (puede tardar en actualizar)
- Verifica que la rama `gh-pages` exista

### La app carga pero sin estilos
- El `base` en `vite.config.js` debe terminar con `/`
- Ejemplo correcto: `base: '/royal/'`
