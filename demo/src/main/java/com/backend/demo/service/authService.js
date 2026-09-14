  import axios from 'axios';

  const API_BASE = 'http://10.187.227.59:8080';

  export const authService = {
    async login(email, password) {
      const response = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
      const { token } = response.data;
      if (token) {
        localStorage.setItem('token', token);
        this.setAuthToken(token);
      }
      return response.data;
    },

    logout() {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    },

    setAuthToken(token) {
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } else {
        delete axios.defaults.headers.common['Authorization'];
      }
    },

    getToken() {
      return localStorage.getItem('token');
    },

    isAuthenticated() {
      return !!this.getToken();
    }
  };