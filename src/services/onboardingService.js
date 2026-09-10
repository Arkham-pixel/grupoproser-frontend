import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function crearInvitacionRemota(payload) {
  const { data } = await axios.post(`${BASE_URL}/api/onboarding/invitar`, payload, {
    headers: authHeaders(),
  });
  return data;
}

export async function cancelarInvitacionOnboarding({ id, cedula, correo } = {}) {
  if (id) {
    const { data } = await axios.post(
      `${BASE_URL}/api/onboarding/invitaciones/${id}/cancelar`,
      {},
      { headers: authHeaders() }
    );
    return data;
  }
  const { data } = await axios.post(
    `${BASE_URL}/api/onboarding/cancelar`,
    { cedula, correo },
    { headers: authHeaders() }
  );
  return data;
}

export async function listarInvitacionesOnboarding() {
  const { data } = await axios.get(`${BASE_URL}/api/onboarding/invitaciones`, {
    headers: authHeaders(),
  });
  return data;
}

export async function reenviarInvitacionOnboarding(id) {
  const { data } = await axios.post(
    `${BASE_URL}/api/onboarding/invitaciones/${id}/reenviar`,
    {},
    { headers: authHeaders() }
  );
  return data;
}

export async function completarDatosOnboarding(token, payload) {
  const { data } = await axios.post(`${BASE_URL}/api/onboarding/public/${token}/datos`, payload);
  return data;
}

export async function obtenerOnboardingPublico(token) {
  const { data } = await axios.get(`${BASE_URL}/api/onboarding/public/${token}`);
  return data;
}

export function urlPlantillaOnboarding(token, tipo) {
  return `${BASE_URL}/api/onboarding/public/${token}/plantilla/${tipo}`;
}

export async function firmarAcuerdoOnboarding(token, { tipo, firmaImagen }) {
  const { data } = await axios.post(`${BASE_URL}/api/onboarding/public/${token}/firmar`, {
    tipo,
    firmaImagen,
  });
  return data;
}

export async function registrarCuentaOnboarding(token, { password, fechaNacimiento, politicaPdf, confidencialidadPdf }) {
  const form = new FormData();
  form.append('password', password);
  if (fechaNacimiento) form.append('fechaNacimiento', fechaNacimiento);
  if (politicaPdf) form.append('politicaPdf', politicaPdf, 'politica-firmada.pdf');
  if (confidencialidadPdf) {
    form.append('confidencialidadPdf', confidencialidadPdf, 'acuerdo-confidencialidad-firmado.pdf');
  }
  const { data } = await axios.post(`${BASE_URL}/api/onboarding/public/${token}/registrar`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function subirDocumentoHrOnboarding(token, { tipo, archivo }) {
  const form = new FormData();
  form.append('tipo', tipo);
  form.append('archivo', archivo);
  const { data } = await axios.post(`${BASE_URL}/api/onboarding/public/${token}/documentos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
