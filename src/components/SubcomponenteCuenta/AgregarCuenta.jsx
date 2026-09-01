import React, { useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { BASE_URL } from "../../config/apiConfig.js";
import { sanitizeUploadFileName } from "../../utils/sanitizeUploadFileName.js";

export default function AgregarCuenta() {
  const { t } = useTranslation();
  const rol = localStorage.getItem("rol");
  const puedeAgregar = rol === "admin" || rol === "soporte";

  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    celular: "",
    fechaNacimiento: "",
    cedula: "",
    foto: null,
    rol: "usuario",
    password: ""
  });

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    return regex.test(password);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "foto") {
      setFormData({ ...formData, foto: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
      if (name === "password") {
        if (!validatePassword(value)) {
          setPasswordError(t('account.ui.cuenta.agregar.passwordError'));
        } else {
          setPasswordError("");
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    try {
      const token = localStorage.getItem("token");

      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value instanceof File) {
          form.append(key, value, sanitizeUploadFileName(value.name, key === 'foto' ? 'foto.jpg' : 'archivo'));
        } else if (value !== null && value !== undefined) {
          form.append(key, value);
        }
      });

      await axios.post(`${BASE_URL}/api/secur-auth/register`, form, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setMensaje(t('account.ui.cuenta.agregar.success'));
      setFormData({
        nombre: "",
        correo: "",
        celular: "",
        fechaNacimiento: "",
        cedula: "",
        foto: null,
        rol: "usuario",
        password: ""
      });
    } catch (err) {
      setError(err.response?.data?.message || t('account.ui.cuenta.agregar.error'));
    }
  };

  if (!puedeAgregar) {
    return (
      <div className="text-red-600 font-bold">
        {t('account.ui.cuenta.agregar.noPermission')}
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4">{t('account.ui.cuenta.agregar.title')}</h3>
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">

        {mensaje && <p className="text-green-600 text-xs sm:text-sm">{mensaje}</p>}
        {error && <p className="text-red-600 text-xs sm:text-sm">{error}</p>}

        <div>
          <label htmlFor="nombre" className="block text-xs sm:text-sm font-medium mb-1">{t('account.ui.cuenta.fields.nombreCompleto')}</label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="correo" className="block text-xs sm:text-sm font-medium mb-1">{t('account.ui.cuenta.fields.correo')}</label>
          <input
            id="correo"
            type="email"
            name="correo"
            value={formData.correo}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="celular" className="block text-xs sm:text-sm font-medium mb-1">{t('account.ui.cuenta.fields.celular')}</label>
          <input
            id="celular"
            type="text"
            name="celular"
            value={formData.celular}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="cedula" className="block text-xs sm:text-sm font-medium mb-1">
            {t('account.ui.cuenta.agregar.cedulaHintPrefix')} <span className="text-red-500">*</span> {t('account.ui.cuenta.agregar.cedulaHintSuffix')}
          </label>
          <input
            id="cedula"
            type="text"
            name="cedula"
            value={formData.cedula}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
            required
            placeholder={t('account.ui.cuenta.agregar.cedulaPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="fechaNacimiento" className="block text-xs sm:text-sm font-medium mb-1">{t('account.ui.cuenta.fields.fechaNacimiento')}</label>
          <input
            id="fechaNacimiento"
            type="date"
            name="fechaNacimiento"
            value={formData.fechaNacimiento}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="rol" className="block text-xs sm:text-sm font-medium mb-1">{t('account.ui.cuenta.fields.rolUsuario')}</label>
          <select
            id="rol"
            name="rol"
            value={formData.rol}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
          >
            <option value="usuario">{t('account.ui.cuenta.roles.usuario')}</option>
            <option value="ajustador_lider">{t('roles.ajustador_lider')}</option>
            <option value="ajustador">{t('roles.ajustador')}</option>
            <option value="inspector">{t('roles.inspector')}</option>
            <option value="visualizador">{t('account.ui.cuenta.roles.visualizador')}</option>
            <option value="puertos">{t('account.ui.cuenta.roles.puertos')}</option>
            <option value="contractor_zurich">{t('account.ui.cuenta.roles.contractor_zurich')}</option>
            <option value="contractor_solo_zurich">{t('account.ui.cuenta.roles.contractor_solo_zurich')}</option>
            <option value="contractor_solo_bbva">{t('account.ui.cuenta.roles.contractor_solo_bbva')}</option>
            <option value="contractor_solo_equidad">{t('account.ui.cuenta.roles.contractor_solo_equidad', 'Equidad FDM')}</option>
            <option value="contractor_solo_equidad_cat">{t('account.ui.cuenta.roles.contractor_solo_equidad_cat', 'Equidad CAT')}</option>
            <option value="contractor_solo_previsora">{t('account.ui.cuenta.roles.contractor_solo_previsora', 'Previsora')}</option>
            <option value="contractor_catastroficos">{t('account.ui.cuenta.roles.contractor_catastroficos', 'Catastróficos')}</option>
            <option value="soporte">{t('account.ui.cuenta.roles.soporte')}</option>
            <option value="admin">{t('account.ui.cuenta.roles.admin')}</option>
          </select>
        </div>

        <div>
          <label htmlFor="foto" className="block text-xs sm:text-sm font-medium mb-1">{t('account.ui.cuenta.fields.foto')}</label>
          <input
            id="foto"
            type="file"
            name="foto"
            accept="image/*"
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">{t('account.ui.cuenta.fields.password')}</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border rounded px-3 sm:px-4 py-2 text-xs sm:text-sm"
            required
          />
          {passwordError && <p className="text-red-600 text-xs sm:text-sm mt-1">{passwordError}</p>}
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-blue-700 text-xs sm:text-sm font-medium transition-colors"
          disabled={!!passwordError}
        >
          {t('account.ui.cuenta.agregar.submit')}
        </button>
      </form>
    </div>
  );
}
