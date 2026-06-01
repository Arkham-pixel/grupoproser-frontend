import React, { useState } from "react";
import axios from "axios";

export default function AgregarCuenta() {
  const rol = localStorage.getItem("rol");

  if (rol !== "admin" && rol !== "soporte") {
    return (
      <div className="text-red-600 font-bold">
        No tienes permisos para agregar cuentas.
      </div>
    );
  }

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
    // Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial
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
          setPasswordError("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.");
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
        form.append(key, value);
      });

      await axios.post("/api/secur-auth/register", form, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      setMensaje("Usuario creado exitosamente");
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
      setError(err.response?.data?.message || "Error al crear el usuario");
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3 sm:mb-4">Agregar Cuenta</h3>
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">

        {mensaje && <p className="text-green-600 text-xs sm:text-sm">{mensaje}</p>}
        {error && <p className="text-red-600 text-xs sm:text-sm">{error}</p>}

        <div>
          <label htmlFor="nombre" className="block text-xs sm:text-sm font-medium mb-1">Nombre completo</label>
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
          <label htmlFor="correo" className="block text-xs sm:text-sm font-medium mb-1">Correo electrónico</label>
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
          <label htmlFor="celular" className="block text-xs sm:text-sm font-medium mb-1">Celular</label>
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
            Cédula <span className="text-red-500">*</span> (Se usará como login)
          </label>
          <input
            id="cedula"
            type="text"
            name="cedula"
            value={formData.cedula}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
            required
            placeholder="La cédula será el login del usuario"
          />
        </div>

        <div>
          <label htmlFor="fechaNacimiento" className="block text-xs sm:text-sm font-medium mb-1">Fecha de nacimiento</label>
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
          <label htmlFor="rol" className="block text-xs sm:text-sm font-medium mb-1">Rol del usuario</label>
          <select
            id="rol"
            name="rol"
            value={formData.rol}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 rounded border text-xs sm:text-sm"
          >
            <option value="usuario">Usuario</option>
            <option value="visualizador">Visualizador</option>
            <option value="soporte">Soporte</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div>
          <label htmlFor="foto" className="block text-xs sm:text-sm font-medium mb-1">Foto de perfil</label>
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
          <label className="block text-xs sm:text-sm font-medium mb-1">Contraseña</label>
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
          Agregar
        </button>
      </form>
    </div>
  );
}
