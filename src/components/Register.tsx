import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { registrarUsuario } from '../services/userService'; // ✅ Usa servicio centralizado

export default function Register() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    nombre: "",
    cedula: "",
    celular: "",
    correo: "",
    contrasena: "",
    confirmarContrasena: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.contrasena !== formData.confirmarContrasena) {
      setError(t('auth.register.passwordsMismatch'));
      return;
    }

    try {
      await registrarUsuario(formData); // ✅ Usa servicio
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || t('auth.register.registerError'));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white px-2 sm:px-4">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-4 sm:p-6 lg:p-8 rounded shadow-md w-full max-w-sm sm:max-w-md">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-4 sm:mb-6">{t('auth.register.title')}</h1>

        <input name="nombre" type="text" placeholder={t('auth.register.name')} className="input text-xs sm:text-sm" value={formData.nombre} onChange={handleChange} required />
        <input name="cedula" type="text" placeholder={t('auth.register.idNumber')} className="input text-xs sm:text-sm" value={formData.cedula} onChange={handleChange} required />
        <input name="celular" type="tel" placeholder={t('auth.register.mobile')} className="input text-xs sm:text-sm" value={formData.celular} onChange={handleChange} required />
        <input name="correo" type="email" placeholder={t('auth.register.email')} className="input text-xs sm:text-sm" value={formData.correo} onChange={handleChange} required />
        <input name="contrasena" type="password" placeholder={t('auth.register.password')} className="input text-xs sm:text-sm" value={formData.contrasena} onChange={handleChange} required />
        <input name="confirmarContrasena" type="password" placeholder={t('auth.register.confirmPassword')} className="input text-xs sm:text-sm" value={formData.confirmarContrasena} onChange={handleChange} required />

        {error && <p className="text-red-400 text-xs sm:text-sm mb-3 sm:mb-4">{error}</p>}

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded mb-3 sm:mb-4 text-xs sm:text-sm">
          {t('auth.register.submit')}
        </button>
        <button type="button" onClick={() => navigate("/login")} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded text-xs sm:text-sm">
          {t('auth.register.back')}
        </button>
      </form>
    </div>
  );
}
