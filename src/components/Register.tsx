import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { registrarUsuario } from '../services/userService'; // ✅ Usa servicio centralizado

export default function Register() {
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
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      await registrarUsuario(formData); // ✅ Usa servicio
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Error al registrar");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white px-2 sm:px-4">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-4 sm:p-6 lg:p-8 rounded shadow-md w-full max-w-sm sm:max-w-md">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-4 sm:mb-6">Registro</h1>

        <input name="nombre" type="text" placeholder="Nombre" className="input text-xs sm:text-sm" value={formData.nombre} onChange={handleChange} required />
        <input name="cedula" type="text" placeholder="Cédula" className="input text-xs sm:text-sm" value={formData.cedula} onChange={handleChange} required />
        <input name="celular" type="tel" placeholder="Número de celular" className="input text-xs sm:text-sm" value={formData.celular} onChange={handleChange} required />
        <input name="correo" type="email" placeholder="Correo electrónico" className="input text-xs sm:text-sm" value={formData.correo} onChange={handleChange} required />
        <input name="contrasena" type="password" placeholder="Contraseña" className="input text-xs sm:text-sm" value={formData.contrasena} onChange={handleChange} required />
        <input name="confirmarContrasena" type="password" placeholder="Confirmar contraseña" className="input text-xs sm:text-sm" value={formData.confirmarContrasena} onChange={handleChange} required />

        {error && <p className="text-red-400 text-xs sm:text-sm mb-3 sm:mb-4">{error}</p>}

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded mb-3 sm:mb-4 text-xs sm:text-sm">
          Registrarse
        </button>
        <button type="button" onClick={() => navigate("/login")} className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded text-xs sm:text-sm">
          Volver
        </button>
      </form>
    </div>
  );
}
