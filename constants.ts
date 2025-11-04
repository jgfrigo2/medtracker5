import type { AppState, HealthRecord } from './types';

export const TIME_SLOTS: string[] = Array.from({ length: (23 - 8) * 2 + 1 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

export const getInitialRecords = (): HealthRecord[] =>
  TIME_SLOTS.map(time => ({
    time,
    value: null,
    medication: [],
    comments: '',
  }));

export const INITIAL_APP_STATE: AppState = {
  allData: {},
  medicationList: ['Paracetamol 1g', 'Ibuprofeno 600mg', 'Metformina 850mg'],
  standardMedPattern: {},
};