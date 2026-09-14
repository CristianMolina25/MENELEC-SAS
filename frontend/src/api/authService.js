import axios from 'axios';

// API URL dinámica basada en el hostname actual
const API_URL = `${window.location.protocol}//${window.location.hostname}:8080/api`;

export const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/login`, { email, password });
    return response.data;
};