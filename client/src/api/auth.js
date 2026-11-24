import { apiRequest } from './client.js';

export const getCurrentUser = () => apiRequest('/auth/me');
export const login = (email, password) => apiRequest('/auth/login', { method: 'POST', body: { email, password } });
export const signup = (fields) => apiRequest('/auth/signup', { method: 'POST', body: fields });
export const logout = () => apiRequest('/auth/logout', { method: 'POST' });
export const changePassword = (currentPassword, newPassword) =>
  apiRequest('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
export const deleteAccount = (password) => apiRequest('/auth/account', { method: 'DELETE', body: { password } });
