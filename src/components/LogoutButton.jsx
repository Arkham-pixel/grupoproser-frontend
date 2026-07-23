// src/components/LogoutButton.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FaSignOutAlt } from 'react-icons/fa'
import { apiRequest } from '../config/apiConfig.js'
import { limpiarSesionLocal } from '../utils/limpiarSesionLocal.js'

export default function LogoutButton({ variant = 'default', label = 'Cerrar sesión' }) {
  const navigate = useNavigate()
  const isSidebar = variant === 'sidebar'
  const isCompact = variant === 'compact'

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Intentar registrar el logout en el servidor
        try {
          await apiRequest('/secur-auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (error) {
// Continuar con el logout aunque falle el registro
        }
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      limpiarSesionLocal();
      navigate('/login', { replace: true });
    }
  }

  if (isCompact) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
      >
        <FaSignOutAlt className="text-sm" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button 
      onClick={handleLogout}
      className={
        isSidebar
          ? 'w-full flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:border-red-500/50 hover:bg-gray-800 hover:text-white'
          : 'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-fenix transition-all duration-200 font-body font-medium text-sm'
      }
      style={
        isSidebar
          ? undefined
          : {
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              color: '#DC2626',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }
      }
      onMouseEnter={
        isSidebar
          ? undefined
          : (e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.15)';
              e.currentTarget.style.borderColor = '#DC2626';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.2)';
            }
      }
      onMouseLeave={
        isSidebar
          ? undefined
          : (e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }
      }
    >
      <FaSignOutAlt className="text-sm" />
      <span>{label}</span>
    </button>
  )
}
