// Detectar IP automáticamente - usar el mismo hostname que el frontend
const hostname = window.location.hostname;
const protocol = window.location.protocol;
export const API_BASE_URL = `${protocol}//${hostname}:8080`;
export const API_MERCADO_URL = `${API_BASE_URL}/api/mercado`;
export const API_ARCHIVOS_URL = `${API_BASE_URL}/api/archivos`;