/**
 * Insert missing admin.ui / account.ui locale trees into es.json and en.json.
 * Run: node scripts/seed-admin-account-locales.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Full ES / EN leaf translations keyed by dotted path under admin.ui / account.ui
const translations = {
  'account.ui.cuenta.deleteAccount.confirm': {
    es: '¿Confirma eliminar esta cuenta? Esta acción no se puede deshacer.',
    en: 'Confirm deleting this account? This action cannot be undone.',
  },
  'account.ui.cuenta.deleteAccount.errors.emptyField': {
    es: 'Ingrese el login o la cédula de la cuenta a eliminar.',
    en: 'Enter the login or ID number of the account to delete.',
  },
  'account.ui.cuenta.deleteAccount.errors.forbidden': {
    es: 'No tiene permiso para eliminar esta cuenta.',
    en: 'You do not have permission to delete this account.',
  },
  'account.ui.cuenta.deleteAccount.errors.generic': {
    es: 'No se pudo eliminar la cuenta.',
    en: 'The account could not be deleted.',
  },
  'account.ui.cuenta.deleteAccount.errors.notFound': {
    es: 'No se encontró la cuenta.',
    en: 'Account not found.',
  },
  'account.ui.cuenta.deleteAccount.errors.unauthorized': {
    es: 'Sesión no autorizada. Inicie sesión de nuevo.',
    en: 'Unauthorized session. Please sign in again.',
  },
  'account.ui.cuenta.deleteAccount.label': {
    es: 'Login o cédula',
    en: 'Login or ID number',
  },
  'account.ui.cuenta.deleteAccount.placeholder': {
    es: 'Ingrese login o cédula',
    en: 'Enter login or ID number',
  },
  'account.ui.cuenta.deleteAccount.submit': {
    es: 'Eliminar cuenta',
    en: 'Delete account',
  },
  'account.ui.cuenta.deleteAccount.submitting': {
    es: 'Eliminando…',
    en: 'Deleting…',
  },
  'account.ui.cuenta.deleteAccount.success': {
    es: 'Cuenta eliminada correctamente.',
    en: 'Account deleted successfully.',
  },
  'account.ui.cuenta.tabs.agregar': { es: 'Agregar', en: 'Add' },
  'account.ui.cuenta.tabs.cambiarContrasena': {
    es: 'Cambiar contraseña',
    en: 'Change password',
  },
  'account.ui.cuenta.tabs.editar': { es: 'Editar', en: 'Edit' },
  'account.ui.cuenta.tabs.eliminar': { es: 'Eliminar', en: 'Delete' },
  'account.ui.cuenta.title': { es: 'Cuenta', en: 'Account' },

  'admin.ui.documentos.accessRestricted.details': {
    es: 'Si cree que debería tener acceso, contacte al administrador.',
    en: 'If you believe you should have access, contact the administrator.',
  },
  'admin.ui.documentos.accessRestricted.noPermission': {
    es: 'No tiene permiso para gestionar documentos.',
    en: 'You do not have permission to manage documents.',
  },
  'admin.ui.documentos.accessRestricted.title': {
    es: 'Acceso restringido',
    en: 'Access restricted',
  },
  'admin.ui.documentos.checkingAccess': {
    es: 'Verificando acceso…',
    en: 'Checking access…',
  },
  'admin.ui.documentos.editarPerfil.errors.loadFailed': {
    es: 'No se pudo cargar el perfil.',
    en: 'Could not load the profile.',
  },
  'admin.ui.documentos.editarPerfil.externalUpdateSuccess': {
    es: 'Perfil externo actualizado correctamente.',
    en: 'External profile updated successfully.',
  },
  'admin.ui.documentos.editarPerfil.updateFailed': {
    es: 'No se pudo actualizar el perfil.',
    en: 'Could not update the profile.',
  },
  'admin.ui.documentos.editarPerfil.updateSuccess': {
    es: 'Perfil actualizado correctamente.',
    en: 'Profile updated successfully.',
  },
  'admin.ui.documentos.lista.cannotPreview': {
    es: 'No se puede previsualizar este tipo de archivo.',
    en: 'This file type cannot be previewed.',
  },
  'admin.ui.documentos.lista.confirmDelete': {
    es: '¿Eliminar el documento "{{name}}"?',
    en: 'Delete document "{{name}}"?',
  },
  'admin.ui.documentos.lista.delete': { es: 'Eliminar', en: 'Delete' },
  'admin.ui.documentos.lista.deleteFailed': {
    es: 'No se pudo eliminar el documento.',
    en: 'Could not delete the document.',
  },
  'admin.ui.documentos.lista.deleteSuccess': {
    es: 'Documento eliminado.',
    en: 'Document deleted.',
  },
  'admin.ui.documentos.lista.downloadFailed': {
    es: 'No se pudo descargar el documento.',
    en: 'Could not download the document.',
  },
  'admin.ui.documentos.lista.downloadToView': {
    es: 'Descargue el archivo para verlo.',
    en: 'Download the file to view it.',
  },
  'admin.ui.documentos.lista.editTitle': {
    es: 'Editar documento',
    en: 'Edit document',
  },
  'admin.ui.documentos.lista.fileType': {
    es: 'Tipo de archivo',
    en: 'File type',
  },
  'admin.ui.documentos.lista.forbidden': {
    es: 'Acceso denegado para {{login}}.',
    en: 'Access denied for {{login}}.',
  },
  'admin.ui.documentos.lista.imageLoadFailed': {
    es: 'No se pudo cargar la imagen.',
    en: 'Could not load the image.',
  },
  'admin.ui.documentos.lista.loadFailed': {
    es: 'No se pudieron cargar los documentos.',
    en: 'Could not load documents.',
  },
  'admin.ui.documentos.lista.loading': {
    es: 'Cargando documentos…',
    en: 'Loading documents…',
  },
  'admin.ui.documentos.lista.noDocuments': {
    es: 'No hay documentos.',
    en: 'No documents.',
  },
  'admin.ui.documentos.lista.openInNewTab': {
    es: 'Abrir en nueva pestaña',
    en: 'Open in new tab',
  },
  'admin.ui.documentos.lista.pageOf': {
    es: 'Página {{page}} de {{total}}',
    en: 'Page {{page}} of {{total}}',
  },
  'admin.ui.documentos.lista.pdfDocument': {
    es: 'Documento PDF',
    en: 'PDF document',
  },
  'admin.ui.documentos.lista.pdfOpenOrDownload': {
    es: 'Abra o descargue el PDF para verlo.',
    en: 'Open or download the PDF to view it.',
  },
  'admin.ui.documentos.lista.preview': { es: 'Vista previa', en: 'Preview' },
  'admin.ui.documentos.lista.previewFailed': {
    es: 'No se pudo generar la vista previa.',
    en: 'Could not generate the preview.',
  },
  'admin.ui.documentos.lista.routeNotFound': {
    es: 'Ruta de documentos no encontrada.',
    en: 'Documents route not found.',
  },
  'admin.ui.documentos.lista.searchPlaceholder': {
    es: 'Buscar documentos…',
    en: 'Search documents…',
  },
  'admin.ui.documentos.lista.tagsCommaSeparated': {
    es: 'Etiquetas separadas por coma',
    en: 'Comma-separated tags',
  },
  'admin.ui.documentos.lista.title': {
    es: 'Documentos ({{count}})',
    en: 'Documents ({{count}})',
  },
  'admin.ui.documentos.lista.unauthenticated': {
    es: 'Debe iniciar sesión.',
    en: 'You must sign in.',
  },
  'admin.ui.documentos.lista.updateFailed': {
    es: 'No se pudo actualizar el documento.',
    en: 'Could not update the document.',
  },
  'admin.ui.documentos.lista.updateSuccess': {
    es: 'Documento actualizado.',
    en: 'Document updated.',
  },
  'admin.ui.documentos.lista.videoNotSupported': {
    es: 'Su navegador no soporta la reproducción de este video.',
    en: 'Your browser does not support playing this video.',
  },
  'admin.ui.documentos.pageDescription': {
    es: 'Gestione perfiles y documentos del personal.',
    en: 'Manage staff profiles and documents.',
  },
  'admin.ui.documentos.pageTitle': {
    es: 'Gestión de documentos',
    en: 'Document management',
  },
  'admin.ui.documentos.perfiles.addPerson': {
    es: 'Agregar persona',
    en: 'Add person',
  },
  'admin.ui.documentos.perfiles.addPersonModalTitle': {
    es: 'Nueva persona (perfil externo)',
    en: 'New person (external profile)',
  },
  'admin.ui.documentos.perfiles.backToAll': {
    es: 'Volver a todos',
    en: 'Back to all',
  },
  'admin.ui.documentos.perfiles.confirmDeleteExternal': {
    es: '¿Eliminar el perfil externo de {{name}}?',
    en: 'Delete the external profile for {{name}}?',
  },
  'admin.ui.documentos.perfiles.confirmHide': {
    es: '¿Ocultar a {{name}} solo en esta vista?',
    en: 'Hide {{name}} only in this view?',
  },
  'admin.ui.documentos.perfiles.createPersonFailed': {
    es: 'No se pudo crear la persona.',
    en: 'Could not create the person.',
  },
  'admin.ui.documentos.perfiles.deleteFromListTitle': {
    es: 'Eliminar de la lista',
    en: 'Remove from list',
  },
  'admin.ui.documentos.perfiles.deletePersonFailed': {
    es: 'No se pudo eliminar la persona.',
    en: 'Could not delete the person.',
  },
  'admin.ui.documentos.perfiles.deletedBadge': {
    es: 'Eliminado',
    en: 'Deleted',
  },
  'admin.ui.documentos.perfiles.editTitle': {
    es: 'Editar perfil',
    en: 'Edit profile',
  },
  'admin.ui.documentos.perfiles.externalProfile': {
    es: 'Perfil externo',
    en: 'External profile',
  },
  'admin.ui.documentos.perfiles.externalProfileDeleted': {
    es: 'Perfil externo eliminado',
    en: 'External profile deleted',
  },
  'admin.ui.documentos.perfiles.fields.address': { es: 'Dirección', en: 'Address' },
  'admin.ui.documentos.perfiles.fields.birthDate': {
    es: 'Fecha de nacimiento',
    en: 'Date of birth',
  },
  'admin.ui.documentos.perfiles.fields.bloodType': {
    es: 'Tipo de sangre',
    en: 'Blood type',
  },
  'admin.ui.documentos.perfiles.fields.branch': { es: 'Sucursal', en: 'Branch' },
  'admin.ui.documentos.perfiles.fields.company': { es: 'Empresa', en: 'Company' },
  'admin.ui.documentos.perfiles.fields.contractType': {
    es: 'Tipo de contrato',
    en: 'Contract type',
  },
  'admin.ui.documentos.perfiles.fields.emails': {
    es: 'Correos adicionales',
    en: 'Additional emails',
  },
  'admin.ui.documentos.perfiles.fields.hireDate': {
    es: 'Fecha de ingreso',
    en: 'Hire date',
  },
  'admin.ui.documentos.perfiles.fields.idNumber': {
    es: 'Cédula / documento',
    en: 'ID number',
  },
  'admin.ui.documentos.perfiles.fields.landline': {
    es: 'Teléfono fijo',
    en: 'Landline',
  },
  'admin.ui.documentos.perfiles.fields.mobile': { es: 'Celular', en: 'Mobile' },
  'admin.ui.documentos.perfiles.fields.mobileShort': {
    es: 'Celular',
    en: 'Mobile',
  },
  'admin.ui.documentos.perfiles.fields.name': { es: 'Nombre', en: 'Name' },
  'admin.ui.documentos.perfiles.fields.position': { es: 'Cargo', en: 'Position' },
  'admin.ui.documentos.perfiles.fields.salary': { es: 'Salario', en: 'Salary' },
  'admin.ui.documentos.perfiles.hiddenInThisView': {
    es: 'Oculto en esta vista',
    en: 'Hidden in this view',
  },
  'admin.ui.documentos.perfiles.hiddenPlatform': {
    es: 'Ocultos de plataforma',
    en: 'Hidden from platform',
  },
  'admin.ui.documentos.perfiles.hideFailed': {
    es: 'No se pudo ocultar el perfil.',
    en: 'Could not hide the profile.',
  },
  'admin.ui.documentos.perfiles.hideOnlyHereTitle': {
    es: 'Ocultar solo aquí',
    en: 'Hide only here',
  },
  'admin.ui.documentos.perfiles.idAbbrev': { es: 'CC', en: 'ID' },
  'admin.ui.documentos.perfiles.loadingUsers': {
    es: 'Cargando usuarios…',
    en: 'Loading users…',
  },
  'admin.ui.documentos.perfiles.noName': {
    es: 'Sin nombre',
    en: 'No name',
  },
  'admin.ui.documentos.perfiles.noUsersFound': {
    es: 'No se encontraron usuarios.',
    en: 'No users found.',
  },
  'admin.ui.documentos.perfiles.notAvailable': {
    es: 'No disponible',
    en: 'Not available',
  },
  'admin.ui.documentos.perfiles.restore': { es: 'Restaurar', en: 'Restore' },
  'admin.ui.documentos.perfiles.restoreExternalTitle': {
    es: 'Restaurar perfil externo',
    en: 'Restore external profile',
  },
  'admin.ui.documentos.perfiles.restorePersonFailed': {
    es: 'No se pudo restaurar la persona.',
    en: 'Could not restore the person.',
  },
  'admin.ui.documentos.perfiles.restoreVisibilityFailed': {
    es: 'No se pudo restaurar la visibilidad.',
    en: 'Could not restore visibility.',
  },
  'admin.ui.documentos.perfiles.savePerson': {
    es: 'Guardar persona',
    en: 'Save person',
  },
  'admin.ui.documentos.perfiles.searchPlaceholder': {
    es: 'Buscar por nombre, cédula o correo…',
    en: 'Search by name, ID or email…',
  },
  'admin.ui.documentos.perfiles.showAgainTitle': {
    es: 'Mostrar de nuevo',
    en: 'Show again',
  },
  'admin.ui.documentos.perfiles.thisPerson': {
    es: 'esta persona',
    en: 'this person',
  },
  'admin.ui.documentos.perfiles.view': { es: 'Ver', en: 'View' },
  'admin.ui.documentos.perfiles.viewDocumentsTitle': {
    es: 'Ver documentos',
    en: 'View documents',
  },
  'admin.ui.documentos.perfiles.viewOnlyDeleted': {
    es: 'Ver solo eliminados',
    en: 'View deleted only',
  },
  'admin.ui.documentos.subir.description': {
    es: 'Descripción',
    en: 'Description',
  },
  'admin.ui.documentos.subir.descriptionPlaceholder': {
    es: 'Descripción del documento',
    en: 'Document description',
  },
  'admin.ui.documentos.subir.documentName': {
    es: 'Nombre del documento',
    en: 'Document name',
  },
  'admin.ui.documentos.subir.file': { es: 'Archivo', en: 'File' },
  'admin.ui.documentos.subir.selectFile': {
    es: 'Seleccionar archivo',
    en: 'Select file',
  },
  'admin.ui.documentos.subir.selectFileFirst': {
    es: 'Seleccione un archivo primero.',
    en: 'Select a file first.',
  },
  'admin.ui.documentos.subir.tags': { es: 'Etiquetas', en: 'Tags' },
  'admin.ui.documentos.subir.tagsExample': {
    es: 'Ej.: contrato, hoja de vida',
    en: 'E.g.: contract, résumé',
  },
  'admin.ui.documentos.subir.tagsPlaceholder': {
    es: 'Etiquetas (separadas por coma)',
    en: 'Tags (comma-separated)',
  },
  'admin.ui.documentos.subir.title': {
    es: 'Subir documento',
    en: 'Upload document',
  },
  'admin.ui.documentos.subir.uploadFailed': {
    es: 'No se pudo subir el documento.',
    en: 'Could not upload the document.',
  },
  'admin.ui.documentos.subir.uploadSuccess': {
    es: 'Documento subido correctamente.',
    en: 'Document uploaded successfully.',
  },
  'admin.ui.documentos.subir.uploading': {
    es: 'Subiendo…',
    en: 'Uploading…',
  },
  'admin.ui.documentos.verUsuario.defaultUser': {
    es: 'Usuario',
    en: 'User',
  },
  'admin.ui.documentos.verUsuario.noDocumentsForUser': {
    es: 'Este usuario no tiene documentos.',
    en: 'This user has no documents.',
  },
  'admin.ui.documentos.verUsuario.noDocumentsFound': {
    es: 'No se encontraron documentos.',
    en: 'No documents found.',
  },
  'admin.ui.documentos.verUsuario.searchPlaceholder': {
    es: 'Buscar en documentos del usuario…',
    en: 'Search this user’s documents…',
  },
  'admin.ui.documentos.verUsuario.title': {
    es: 'Documentos de {{name}}',
    en: 'Documents for {{name}}',
  },

  'admin.ui.editarPerfilUsuario.accessDenied.debugInfo': {
    es: 'Información de depuración',
    en: 'Debug information',
  },
  'admin.ui.editarPerfilUsuario.accessDenied.message': {
    es: 'Solo administradores o soporte pueden editar perfiles de usuario.',
    en: 'Only administrators or support can edit user profiles.',
  },
  'admin.ui.editarPerfilUsuario.accessDenied.notAvailable': {
    es: 'No disponible',
    en: 'Not available',
  },
  'admin.ui.editarPerfilUsuario.accessDenied.notDefined': {
    es: 'No definido',
    en: 'Not defined',
  },
  'admin.ui.editarPerfilUsuario.accessDenied.title': {
    es: 'Acceso denegado',
    en: 'Access denied',
  },
  'admin.ui.editarPerfilUsuario.accessDenied.user': {
    es: 'Usuario',
    en: 'User',
  },
  'admin.ui.editarPerfilUsuario.errors.loginRequired': {
    es: 'El login es obligatorio.',
    en: 'Login is required.',
  },
  'admin.ui.editarPerfilUsuario.errors.searchFailed': {
    es: 'No se pudo buscar el usuario.',
    en: 'Could not search for the user.',
  },
  'admin.ui.editarPerfilUsuario.errors.updateFailed': {
    es: 'No se pudo actualizar el usuario.',
    en: 'Could not update the user.',
  },
  'admin.ui.editarPerfilUsuario.fields.activeQuestion': {
    es: '¿Activo?',
    en: 'Active?',
  },
  'admin.ui.editarPerfilUsuario.fields.name': { es: 'Nombre', en: 'Name' },
  'admin.ui.editarPerfilUsuario.fields.phone': { es: 'Teléfono', en: 'Phone' },
  'admin.ui.editarPerfilUsuario.fields.selectRole': {
    es: 'Seleccione un rol',
    en: 'Select a role',
  },
  'admin.ui.editarPerfilUsuario.info.appliedImmediately': {
    es: 'Los cambios se aplican de inmediato.',
    en: 'Changes apply immediately.',
  },
  'admin.ui.editarPerfilUsuario.info.changeFields': {
    es: 'Puede modificar nombre, rol, teléfono y estado.',
    en: 'You can change name, role, phone and status.',
  },
  'admin.ui.editarPerfilUsuario.info.onlyAdminSoporte': {
    es: 'Solo Admin y Soporte.',
    en: 'Admin and Support only.',
  },
  'admin.ui.editarPerfilUsuario.info.searchByLogin': {
    es: 'Busque el usuario por su login.',
    en: 'Search for the user by login.',
  },
  'admin.ui.editarPerfilUsuario.infoTitle': {
    es: 'Información',
    en: 'Information',
  },
  'admin.ui.editarPerfilUsuario.no': { es: 'No', en: 'No' },
  'admin.ui.editarPerfilUsuario.saveChanges': {
    es: 'Guardar cambios',
    en: 'Save changes',
  },
  'admin.ui.editarPerfilUsuario.saving': { es: 'Guardando…', en: 'Saving…' },
  'admin.ui.editarPerfilUsuario.searchPlaceholder': {
    es: 'Login del usuario',
    en: 'User login',
  },
  'admin.ui.editarPerfilUsuario.searchTitle': {
    es: 'Buscar usuario',
    en: 'Search user',
  },
  'admin.ui.editarPerfilUsuario.searching': {
    es: 'Buscando…',
    en: 'Searching…',
  },
  'admin.ui.editarPerfilUsuario.title': {
    es: 'Editar usuarios',
    en: 'Edit users',
  },
  'admin.ui.editarPerfilUsuario.updateSuccess': {
    es: 'Usuario actualizado correctamente.',
    en: 'User updated successfully.',
  },
  'admin.ui.editarPerfilUsuario.userFound': {
    es: 'Usuario encontrado',
    en: 'User found',
  },
  'admin.ui.editarPerfilUsuario.userFoundTitle': {
    es: 'Datos del usuario',
    en: 'User details',
  },
  'admin.ui.editarPerfilUsuario.yes': { es: 'Sí', en: 'Yes' },

  'admin.ui.sessionSettings.adminOnly': {
    es: 'Solo administradores pueden modificar esta configuración.',
    en: 'Only administrators can change these settings.',
  },
  'admin.ui.sessionSettings.save': { es: 'Guardar', en: 'Save' },
  'admin.ui.sessionSettings.sessionDuration': {
    es: 'Duración de sesión (minutos)',
    en: 'Session duration (minutes)',
  },
  'admin.ui.sessionSettings.sessionDurationHelp': {
    es: 'Tiempo máximo de inactividad antes del cierre automático.',
    en: 'Maximum idle time before automatic logout.',
  },
  'admin.ui.sessionSettings.summaryExpires': {
    es: 'La sesión expira tras {{minutes}} minutos.',
    en: 'The session expires after {{minutes}} minutes.',
  },
  'admin.ui.sessionSettings.summaryExtend': {
    es: 'Puede extender la sesión desde el aviso.',
    en: 'You can extend the session from the warning prompt.',
  },
  'admin.ui.sessionSettings.summaryTitle': {
    es: 'Resumen',
    en: 'Summary',
  },
  'admin.ui.sessionSettings.summaryWarning': {
    es: 'Se mostrará un aviso {{minutes}} minutos antes.',
    en: 'A warning will appear {{minutes}} minutes before.',
  },
  'admin.ui.sessionSettings.title': {
    es: 'Configuración de sesión',
    en: 'Session settings',
  },
  'admin.ui.sessionSettings.updated': {
    es: 'Configuración actualizada.',
    en: 'Settings updated.',
  },
  'admin.ui.sessionSettings.warningDuration': {
    es: 'Aviso previo (minutos)',
    en: 'Advance warning (minutes)',
  },
  'admin.ui.sessionSettings.warningDurationHelp': {
    es: 'Minutos antes del cierre para mostrar el aviso.',
    en: 'Minutes before logout to show the warning.',
  },

  'admin.ui.usuarios.changePassword.button': {
    es: 'Cambiar contraseña',
    en: 'Change password',
  },
  'admin.ui.usuarios.changePassword.modalTitle': {
    es: 'Cambiar contraseña',
    en: 'Change password',
  },
  'admin.ui.usuarios.changePassword.newPasswordFor': {
    es: 'Nueva contraseña para {{login}}',
    en: 'New password for {{login}}',
  },
  'admin.ui.usuarios.changePassword.newPasswordPlaceholder': {
    es: 'Nueva contraseña',
    en: 'New password',
  },
  'admin.ui.usuarios.changePassword.yourLogin': {
    es: 'Su login (admin)',
    en: 'Your login (admin)',
  },
  'admin.ui.usuarios.changePassword.yourLoginPlaceholder': {
    es: 'Su login',
    en: 'Your login',
  },
  'admin.ui.usuarios.changePassword.yourPassword': {
    es: 'Su contraseña actual',
    en: 'Your current password',
  },
  'admin.ui.usuarios.changePassword.yourPasswordPlaceholder': {
    es: 'Contraseña actual',
    en: 'Current password',
  },
  'admin.ui.usuarios.errors.allFieldsRequired': {
    es: 'Todos los campos son obligatorios.',
    en: 'All fields are required.',
  },
  'admin.ui.usuarios.errors.changePasswordFailed': {
    es: 'No se pudo cambiar la contraseña.',
    en: 'Could not change the password.',
  },
  'admin.ui.usuarios.errors.loadFailed': {
    es: 'No se pudieron cargar los usuarios.',
    en: 'Could not load users.',
  },
  'admin.ui.usuarios.table.active': { es: 'Activo', en: 'Active' },
  'admin.ui.usuarios.table.email': { es: 'Correo', en: 'Email' },
  'admin.ui.usuarios.table.inactive': { es: 'Inactivo', en: 'Inactive' },
  'admin.ui.usuarios.table.login': { es: 'Login', en: 'Login' },
  'admin.ui.usuarios.table.onVacation': {
    es: 'En vacaciones',
    en: 'On vacation',
  },
  'admin.ui.usuarios.table.role': { es: 'Rol', en: 'Role' },
  'admin.ui.usuarios.table.status': { es: 'Estado', en: 'Status' },
  'admin.ui.usuarios.table.user': { es: 'Usuario', en: 'User' },
  'admin.ui.usuarios.title': {
    es: 'Gestión de usuarios',
    en: 'User management',
  },
  'admin.ui.usuarios.vacations.confirmPause': {
    es: '¿Marcar vacaciones para este usuario?',
    en: 'Mark this user as on vacation?',
  },
  'admin.ui.usuarios.vacations.confirmResume': {
    es: '¿Reanudar actividad de este usuario?',
    en: 'Resume activity for this user?',
  },
  'admin.ui.usuarios.vacations.pause': {
    es: 'Poner en vacaciones',
    en: 'Set on vacation',
  },
  'admin.ui.usuarios.vacations.pauseTitle': {
    es: 'Vacaciones',
    en: 'Vacation',
  },
  'admin.ui.usuarios.vacations.resume': {
    es: 'Reanudar',
    en: 'Resume',
  },
  'admin.ui.usuarios.vacations.resumeTitle': {
    es: 'Reanudar actividad',
    en: 'Resume activity',
  },
  'admin.ui.usuarios.vacations.toggleFailed': {
    es: 'No se pudo actualizar el estado de vacaciones.',
    en: 'Could not update vacation status.',
  },
};

function setPath(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function mergeLocale(file, lang) {
  const full = path.join(root, file);
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));
  for (const [key, vals] of Object.entries(translations)) {
    setPath(data, key, vals[lang]);
  }
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('updated', file, Object.keys(translations).length, 'keys');
}

mergeLocale('src/locales/es.json', 'es');
mergeLocale('src/locales/en.json', 'en');
