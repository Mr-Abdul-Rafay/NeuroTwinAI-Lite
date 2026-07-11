// frontend/src/api/health.js
import api from './client';

export const healthApi = {
  check: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      throw error;
    }
  },
};
