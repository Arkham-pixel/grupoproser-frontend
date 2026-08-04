import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import EditarCuentas from "./EditarCuenta";
import AgregarCuenta from "./AgregarCuenta";
import api from "../../services/api";
import MiCuenta from "./miCuenta";
import CambiarContrasena from "./CambiarContrasena";

// Puedes mover esto a su propio archivo si luego creces
function EliminarCuenta() {
  const { t } = useTranslation();
  return <div>{t('account.ui.cuenta.deleteAccountHere')}</div>;
}
// Eliminar cualquier referencia visual o lógica a activar/desactivar 2FA o "seguridad de la cuenta"

// Simulación de usuario actual (puedes reemplazarlo con props, context o Firebase)
const user = {
  nombre: "Daniel",
  rol: "admin", // Cambia a "admin" o "soporte" para ver las pestañas adicionales
};

export default function Cuenta() {
  const { t } = useTranslation();
  // Verificar si hay una pestaña guardada en localStorage (desde el menú de administración)
  const tabGuardada = localStorage.getItem("cuentaTab");
  const [pestana, setPestana] = useState(tabGuardada || "editar");
  const rol = localStorage.getItem("rol");
  const esAdminOSoporte = rol === "admin" || rol === "soporte";
  
  // Limpiar la pestaña guardada después de usarla
  useEffect(() => {
    if (tabGuardada) {
      localStorage.removeItem("cuentaTab");
    }
  }, [tabGuardada]);
  const [usuarioEliminar, setUsuarioEliminar] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const handleEliminarCuenta = async (e) => {
    e.preventDefault();
    if (!usuarioEliminar.trim()) {
      setMensaje(t('account.ui.cuenta.deleteAccount.errors.emptyField'));
      return;
    }
    if (!window.confirm(t('account.ui.cuenta.deleteAccount.confirm'))) return;
    setEliminando(true);
    setMensaje("");
    try {
      // Llama al endpoint real de eliminación (el interceptor maneja automáticamente el token)
      await api.delete(`/api/secur-auth/usuarios?loginOrEmail=${encodeURIComponent(usuarioEliminar.trim())}`);
      setMensaje(t('account.ui.cuenta.deleteAccount.success'));
      setUsuarioEliminar("");
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      if (err.response?.status === 401) {
        setMensaje(t('account.ui.cuenta.deleteAccount.errors.unauthorized'));
      } else if (err.response?.status === 403) {
        setMensaje(t('account.ui.cuenta.deleteAccount.errors.forbidden'));
      } else if (err.response?.status === 404) {
        setMensaje(t('account.ui.cuenta.deleteAccount.errors.notFound'));
      } else {
        setMensaje(err.response?.data?.message || t('account.ui.cuenta.deleteAccount.errors.generic'));
      }
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-4 lg:p-6 bg-white rounded shadow">
      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4">{t('account.ui.cuenta.title')}</h2>

      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
        <button
          className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium ${pestana === "editar" ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
          onClick={() => setPestana("editar")}
        >
          {t('account.ui.cuenta.tabs.editar')}
        </button>
        <button
          className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium ${pestana === "micuenta" ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
          onClick={() => setPestana("micuenta")}
        >
          {t('account.ui.cuenta.tabs.cambiarContrasena')}
        </button>
        {esAdminOSoporte && (
          <button
            className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium ${pestana === "agregar" ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
            onClick={() => setPestana("agregar")}
          >
            {t('account.ui.cuenta.tabs.agregar')}
          </button>
        )}
        {esAdminOSoporte && (
          <button
            className={`px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium ${pestana === "eliminar" ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
            onClick={() => setPestana("eliminar")}
          >
            {t('account.ui.cuenta.tabs.eliminar')}
          </button>
        )}
      </div>

      <div>
        {pestana === "editar" && <EditarCuentas />}
        {pestana === "micuenta" && <CambiarContrasena />}
        {pestana === "agregar" && esAdminOSoporte && <AgregarCuenta />}
        {pestana === "eliminar" && esAdminOSoporte && (
          <div className="mt-4 sm:mt-6">
            <form onSubmit={handleEliminarCuenta} className="space-y-2 sm:space-y-3">
              <label className="block text-xs sm:text-sm font-medium">{t('account.ui.cuenta.deleteAccount.label')}</label>
              <input
                type="text"
                value={usuarioEliminar}
                onChange={e => setUsuarioEliminar(e.target.value)}
                className="border px-2 sm:px-3 py-2 w-full rounded text-xs sm:text-sm"
                placeholder={t('account.ui.cuenta.deleteAccount.placeholder')}
                disabled={eliminando}
              />
              <button
                type="submit"
                className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 text-xs sm:text-sm font-medium transition-colors"
                disabled={eliminando}
              >
                {eliminando ? t('account.ui.cuenta.deleteAccount.submitting') : t('account.ui.cuenta.deleteAccount.submit')}
              </button>
              {mensaje && <p className="mt-2 text-xs sm:text-sm text-red-600">{mensaje}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
