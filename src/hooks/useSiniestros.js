import { useState, useEffect } from "react";
import {
  getSiniestros,
  getSiniestroById,
  createSiniestro,
  updateSiniestro,
  deleteSiniestro,
} from "../services/siniestrosApi";

export function useSiniestros(params = {}) {
  const [data, setData] = useState({ siniestros: [], total: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSiniestros = async (params = {}) => {
    setLoading(true);
    try {
      const res = await getSiniestros(params);
      setData(res);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSiniestros(params);
    // eslint-disable-next-line
  }, [JSON.stringify(params)]);

  return { ...data, loading, error, refetch: fetchSiniestros };
} 