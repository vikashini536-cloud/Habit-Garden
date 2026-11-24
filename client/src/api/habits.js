import { apiRequest } from './client.js';

export const listHabits = () => apiRequest('/habits');
export const createHabit = (habit) => apiRequest('/habits', { method: 'POST', body: habit });
export const checkInHabit = (habitId) => apiRequest(`/habits/${habitId}/checkins`, { method: 'POST' });
export const getHabit = (habitId) => apiRequest(`/habits/${habitId}`);
export const updateHabit = (habitId, habit) => apiRequest(`/habits/${habitId}`, { method: 'PUT', body: habit });
export const deleteHabit = (habitId) => apiRequest(`/habits/${habitId}`, { method: 'DELETE' });
export const undoCheckIn = (habitId, date) => apiRequest(`/habits/${habitId}/checkins/${date}`, { method: 'DELETE' });
