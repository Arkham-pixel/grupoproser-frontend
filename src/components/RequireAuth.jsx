// src/components/RequireAuth.jsx
import React from 'react'
import { Navigate } from 'react-router-dom'

export default function RequireAuth({ children }) {
  const isAuth = !!localStorage.getItem('token')
  return isAuth ? children : <Navigate to="/login" replace />
}
