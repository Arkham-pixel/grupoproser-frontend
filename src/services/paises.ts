import api from './api';

export interface Pais {
  codigo_pais: string;
  nombre: string;
  iso_alpha_3: string;
  activo: boolean;
}

export const getPaises = async (): Promise<Pais[]> => {
  const response = await api.get<Pais[]>('/paises');
  return response.data;
};
