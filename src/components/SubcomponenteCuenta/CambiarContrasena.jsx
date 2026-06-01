import React, { useState } from "react";
import axios from "axios";

export default function CambiarContrasena() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    return regex.test(password);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setSuccessMsg("");
    if (!oldPassword || !newPassword || !verifyPassword) {
      setPasswordError("Todos los campos son obligatorios.");
      return;
    }
    if (!validatePassword(newPassword)) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.");
      return;
    }
    if (newPassword !== verifyPassword) {
      setPasswordError("La nueva contraseña y la verificación no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/secur-auth/cambiar-password-propia",
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg("Contraseña cambiada correctamente");
      if (res.data.user && res.data.user.login) {
        localStorage.setItem('login', res.data.user.login);
      }
      setOldPassword("");
      setNewPassword("");
      setVerifyPassword("");
    } catch (err) {
      setPasswordError(err.response?.data?.message || err.response?.data?.mensaje || "Error al cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 lg:p-6 bg-white rounded shadow">
      <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4">Cambiar contraseña</h2>
      <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">Contraseña antigua</label>
          <input
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            className="w-full border rounded px-3 sm:px-4 py-2 text-xs sm:text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">Nueva contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full border rounded px-3 sm:px-4 py-2 text-xs sm:text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">Verifica tu nueva contraseña</label>
          <input
            type="password"
            value={verifyPassword}
            onChange={e => setVerifyPassword(e.target.value)}
            className="w-full border rounded px-3 sm:px-4 py-2 text-xs sm:text-sm"
            required
          />
        </div>
        {passwordError && <p className="text-red-600 text-xs sm:text-sm mt-1">{passwordError}</p>}
        {successMsg && <p className="text-green-600 text-xs sm:text-sm mt-1">{successMsg}</p>}
        <button
          type="submit"
          className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-blue-700 text-xs sm:text-sm font-medium transition-colors"
          disabled={loading}
        >
          {loading ? "Cambiando..." : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
} 