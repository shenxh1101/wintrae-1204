import { AppState } from '@/types';
import { mockData } from '@/data/mockData';

const STORAGE_KEY = 'wedding_planner_data';

export const loadFromStorage = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...mockData,
        ...parsed,
        giftRecords: parsed.giftRecords || mockData.giftRecords || [],
      };
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return mockData;
};

export const saveToStorage = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
};

export const clearStorage = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const resetToMockData = (): AppState => {
  clearStorage();
  return mockData;
};
