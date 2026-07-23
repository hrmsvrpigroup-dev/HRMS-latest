import api from './axios'

export const monitoringApi = {
  screenshots: () => api.get('/monitoring/screenshots'),
}
