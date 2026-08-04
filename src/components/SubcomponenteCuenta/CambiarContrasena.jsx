import React, { useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

export default function CambiarContrasena() {
  const { t } = useTranslation();
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
      setPasswordError(t('account.ui.cuenta.cambiarContrasena.errors.required'));
      return;
    }
    if (!validatePassword(newPassword)) {
      setPasswordError(t('account.ui.cuenta.cambiarContrasena.errors.weak'));
      return;
    }
    if (newPassword !== verifyPassword) {
      setPasswordError(t('account.ui.cuenta.cambiarContrasena.errors.mismatch'));
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
      setSuccessMsg(t('account.ui.cuenta.cambiarContrasena.success'));
      if (res.data.user && res.data.user.login) {
        localStorage.setItem('login', res.data.user.login);
      }
      setOldPassword("");
      setNewPassword("");
      setVerifyPassword("");
    } catch (err) {
      setPasswordError(err.response?.data?.message || err.response?.data?.mensaje || t('account.ui.cuenta.cambiarContrasena.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-4 sm:mt-6 lg:mt-8 p-3 sm:p-4 lg:p-6 bg-white rounded shadow">
      <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4">{t('account.ui.cuenta.cambiarContrasena.title')}</h2>
      <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">{t('account.ui.cuenta.cambiarContrasena.oldPassword')}</label>
          <input
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            className="w-full border rounded px-3 sm:px-4 py-2 text-xs sm:text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">{t('account.ui.cuenta.cambiarContrasena.newPassword')}</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full border rounded px-3 sm:px-4 py-2 text-xs sm:text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">{t('account.ui.cuenta.cambiarContrasena.verifyPassword')}</label>
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
          {loading ? t('account.ui.cuenta.cambiarContrasena.submitting') : t('account.ui.cuenta.cambiarContrasena.submit')}
        </button>
      </form>
    </div>
  );
}
