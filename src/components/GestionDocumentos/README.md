# Gestión de Documentos

Sistema de gestión de documentos con acceso restringido a solo 3 usuarios autorizados.

## Características

- ✅ Subir archivos (sin límite de tamaño)
- ✅ Buscar documentos por nombre, descripción o etiquetas
- ✅ Filtrar por etiquetas
- ✅ Descargar documentos
- ✅ Editar metadatos (nombre, descripción, etiquetas)
- ✅ Eliminar documentos (soft delete)
- ✅ Control de acceso restringido a 3 usuarios

## Configuración de Usuarios Permitidos

Para configurar qué usuarios tienen acceso, edita el archivo:

`backend/controllers/documentoController.js`

Y modifica la constante `USUARIOS_PERMITIDOS` con los logins de los usuarios autorizados:

```javascript
const USUARIOS_PERMITIDOS = [
  'login_usuario_1',
  'login_usuario_2',
  'login_usuario_3'
];
```

**Importante:** Los logins deben coincidir exactamente con el campo `login` del usuario en la base de datos.

## Estructura de Componentes

```
GestionDocumentos/
├── GestionDocumentos.jsx    # Componente principal
├── SubirDocumento.jsx      # Subcomponente para subir archivos
└── ListaDocumentos.jsx      # Subcomponente para listar, buscar y descargar
```

## Uso

1. Importa el componente en tu ruta:

```jsx
import GestionDocumentos from './components/GestionDocumentos/GestionDocumentos';

// En tu router
<Route path="/documentos" element={<GestionDocumentos />} />
```

2. Asegúrate de que el usuario esté autenticado y tenga acceso (el middleware verifica automáticamente).

## API Endpoints

- `POST /api/documentos/subir` - Subir un documento
- `GET /api/documentos/listar` - Listar documentos (con búsqueda y filtros)
- `GET /api/documentos/etiquetas` - Obtener todas las etiquetas disponibles
- `GET /api/documentos/:id` - Obtener un documento por ID
- `GET /api/documentos/:id/descargar` - Descargar un documento
- `PUT /api/documentos/:id` - Actualizar metadatos de un documento
- `DELETE /api/documentos/:id` - Eliminar un documento (soft delete)

## Modelo de Datos

El modelo `Documento` incluye:
- Información del archivo (nombre, ruta, tamaño, tipo MIME)
- Metadatos (nombre, descripción, etiquetas)
- Información del usuario que subió el archivo
- Fechas de subida y modificación
- Estado activo/inactivo (para soft delete)

## Notas

- Los archivos se almacenan en `backend/uploads/documentos/`
- No hay límite de tamaño de archivo configurado
- Todos los endpoints requieren autenticación JWT
- Solo los usuarios en `USUARIOS_PERMITIDOS` pueden acceder

