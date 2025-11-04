export interface HealthRecord {
  time: string;
  value: number | null;
  medication: string[];
  comments: string;
}

export interface DailyData {
  date: string;
  records: HealthRecord[];
}

export interface StandardMedPattern {
  [time: string]: string[];
}

export interface AppState {
  allData: Record<string, DailyData>;
  medicationList: string[];
  standardMedPattern: StandardMedPattern;
}

export type AppAction =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'SAVE_DAY'; payload: DailyData }
  | { type: 'UPDATE_MEDICATION_LIST'; payload: string[] }
  | { type: 'UPDATE_STANDARD_MED_PATTERN'; payload: StandardMedPattern };