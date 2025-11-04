import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceDot, Area } from 'recharts';
import type { DailyData, HealthRecord, StandardMedPattern } from '../types';
import { TIME_SLOTS, getInitialRecords } from '../constants';

// --- SVGs ---
const PillIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-indigo-500"><path d="M16.25 7.75a6.25 6.25 0 10-12.5 0 6.25 6.25 0 0012.5 0zM8.5 0a8.5 8.5 0 000 17 8.5 8.5 0 000-17z"></path><path d="M15.5 0a8.5 8.5 0 100 17 8.5 8.5 0 000-17z"></path></svg>;
const CommentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

// --- Helper Functions ---
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // By setting the time to noon, we avoid issues where the date could shift
  // to the previous day due to timezone differences at midnight.
  return new Date(year, month - 1, day, 12);
};

// --- Calendar Component ---
const Calendar: React.FC<{
  selectedDate: string;
  onDateChange: (date: string) => void;
  dataDays: Set<string>;
}> = ({ selectedDate, onDateChange, dataDays }) => {
  const [currentMonth, setCurrentMonth] = useState(parseDate(selectedDate));

  const changeMonth = (offset: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const weeks = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));

    const calendarWeeks: Date[][] = [];
    for (let i = 0; i < 6; i++) {
      const week: Date[] = [];
      for (let j = 0; j < 7; j++) {
        week.push(new Date(startDate));
        startDate.setDate(startDate.getDate() + 1);
      }
      calendarWeeks.push(week);
      if (startDate > lastDay && i > 3) break;
    }
    return calendarWeeks;
  }, [currentMonth]);

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><ChevronLeftIcon /></button>
        <h3 className="font-semibold text-center capitalize">{currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><ChevronRightIcon /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => (
          <div key={day} className="font-medium text-gray-500 dark:text-gray-400">{day}</div>
        ))}
        {weeks.flat().map((day) => {
          const dateStr = formatDate(day);
          const isSelected = dateStr === selectedDate;
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const hasData = dataDays.has(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onDateChange(dateStr)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-200 relative
                ${isCurrentMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}
                ${isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}
              `}
            >
              {hasData && !isSelected && <span className="absolute w-1.5 h-1.5 bg-green-500 rounded-full top-1 right-1"></span>}
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- Custom Chart Tooltip ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg text-sm transition-all duration-200">
                <p className="font-bold text-gray-800 dark:text-gray-100 mb-2">{`Hora: ${label}`}</p>
                <p className={`font-semibold ${data.value > 8 ? 'text-green-600 dark:text-green-400' : data.value > 3 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {`Valor: ${data.value !== null ? data.value : 'N/A'}`}
                </p>
                {data.medication.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="font-semibold text-indigo-500 dark:text-indigo-400">Medicación:</p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                            {data.medication.map((med: string) => <li key={med}>{med}</li>)}
                        </ul>
                    </div>
                )}
                {data.comments && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="font-semibold text-amber-500 dark:text-amber-400">Comentarios:</p>
                        <p className="max-w-xs whitespace-normal text-gray-600 dark:text-gray-300">{data.comments}</p>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

// --- Custom Chart Dot ---
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const hasMedication = payload.medication && payload.medication.length > 0;
  const hasComments = payload.comments && payload.comments.length > 0;

  if (hasMedication || hasComments) {
    return (
      <g>
        <ReferenceDot {...props} r={5} fill="#3b82f6" stroke="white" />
        {hasMedication && <circle cx={cx} cy={cy} r={8} fill="rgba(99, 102, 241, 0.5)" />}
        {hasComments && <circle cx={cx} cy={cy} r={11} fill="rgba(245, 158, 11, 0.4)" stroke="rgba(245, 158, 11, 0.8)" strokeWidth={1} />}
      </g>
    );
  }
  return <ReferenceDot {...props} r={3} fill="#3b82f6" stroke="none" />;
};


// --- DailyLog Main Component ---
interface DailyLogProps {
  allData: Record<string, DailyData>;
  medicationList: string[];
  standardMedPattern: StandardMedPattern;
  onSave: (data: DailyData) => void;
}

const DailyLog: React.FC<DailyLogProps> = ({ allData, medicationList, standardMedPattern, onSave }) => {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [dailyRecords, setDailyRecords] = useState<HealthRecord[]>(getInitialRecords());
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const dataDays = useMemo(() => new Set(Object.keys(allData)), [allData]);
  
  const selectedDayData = useMemo(() => allData[selectedDate], [allData, selectedDate]);

  useEffect(() => {
    setDailyRecords(selectedDayData?.records || getInitialRecords());
  }, [selectedDate, selectedDayData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };
    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendar]);


  const handleRecordChange = (time: string, field: keyof HealthRecord, value: any) => {
    setDailyRecords(prev =>
      prev.map(rec => (rec.time === time ? { ...rec, [field]: value } : rec))
    );
  };
  
  const handleMedicationChange = (time: string, selectedOptions: HTMLCollection) => {
    const values = Array.from(selectedOptions).map((option: any) => option.value);
    handleRecordChange(time, 'medication', values);
  };

  const applyStandardPattern = () => {
    setDailyRecords(prev =>
      prev.map(rec => ({
        ...rec,
        medication: standardMedPattern[rec.time] || rec.medication,
      }))
    );
  };

  const handleSave = () => {
    onSave({ date: selectedDate, records: dailyRecords });
    alert(`Datos guardados para el día ${selectedDate}`);
  };

  const chartData = useMemo(() => {
    return selectedDayData?.records.filter(r => r.value !== null) || [];
  }, [selectedDayData]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Registro del Día: <span className="text-blue-600 dark:text-blue-400">{selectedDate}</span>
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {showCalendar ? 'Ocultar' : 'Mostrar'} Calendario
            </button>
            {showCalendar && (
              <div ref={calendarRef} className="absolute top-full left-0 mt-2 z-20 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
                <Calendar 
                  selectedDate={selectedDate} 
                  onDateChange={(date) => {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }} 
                  dataDays={dataDays} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {selectedDayData && chartData.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-center">Gráfico Diario</h3>
            <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} />
                        <XAxis dataKey="time" tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 10]} allowDecimals={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }} />
                        <ReferenceArea y1={0} y2={3} fill="#ef4444" fillOpacity={0.1} label={{ value: 'Bajo', position: 'insideTopLeft', fill: '#b91c1c', fontSize: 12, dy: 10, dx: 10, opacity: 0.8 }} />
                        <ReferenceArea y1={3} y2={8} fill="#f59e0b" fillOpacity={0.08} label={{ value: 'Normal', position: 'insideTopLeft', fill: '#a16207', fontSize: 12, dy: 10, dx: 10, opacity: 0.8 }} />
                        <ReferenceArea y1={8} y2={10.5} fill="#22c55e" fillOpacity={0.1} label={{ value: 'Alto', position: 'insideTopLeft', fill: '#15803d', fontSize: 12, dy: 10, dx: 10, opacity: 0.8 }} />
                        {/* FIX: The 'stroke' prop expects a string, not a boolean. Changed from `false` to `"none"` to disable the stroke. */}
                        <Area type="monotone" dataKey="value" stroke="none" fill="url(#colorValue)" />
                        <Line isAnimationActive={false} type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={<CustomDot/>} activeDot={{ r: 8, stroke: 'white', strokeWidth: 2, fill: '#3b82f6' }} connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center items-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500/50"></span>Medicación</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500/40"></span>Comentario</div>
            </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Formulario de Entrada</h3>
            <div>
              <button onClick={applyStandardPattern} className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors mr-2">Aplicar Patrón</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Guardar Día</button>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-4 py-3">Hora</th>
                <th scope="col" className="px-4 py-3">Valor (0-10)</th>
                <th scope="col" className="px-4 py-3">Medicación</th>
                <th scope="col" className="px-4 py-3">Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {dailyRecords.map(record => (
                <tr key={record.time} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600/50">
                  <td className="px-4 py-2 font-medium">{record.time}</td>
                  <td className="px-4 py-2">
                    <select
                      value={record.value === null ? '' : record.value}
                      onChange={e => handleRecordChange(record.time, 'value', e.target.value === '' ? null : Number(e.target.value))}
                      className="w-20 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1.5 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-</option>
                      {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      multiple
                      value={record.medication}
                      onChange={e => handleMedicationChange(record.time, e.target.selectedOptions)}
                      className="w-48 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1.5 focus:ring-blue-500 focus:border-blue-500 h-24"
                    >
                      {medicationList.map(med => <option key={med} value={med}>{med}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={record.comments}
                      onChange={e => handleRecordChange(record.time, 'comments', e.target.value)}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-1.5 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyLog;