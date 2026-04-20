
import { DateCell } from '../types';

/**
 * Formatea una fecha a YYYY-MM-DD respetando el tiempo local
 */
export const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getDaysArray = (start: Date, count: number): DateCell[] => {
  const arr: DateCell[] = [];
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dayIndex = d.getDay();
    arr.push({
      date: new Date(d),
      dateStr: formatDateToISO(d),
      isWeekend: dayIndex === 0 || dayIndex === 6,
      dayName: days[dayIndex],
      dayNumber: d.getDate(),
      monthName: months[d.getMonth()]
    });
  }
  return arr;
};

/**
 * Retorna todos los días incluyendo el de salida (para renderizado)
 */
export const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const dates = [];
  let curr = new Date(startDate.replace(/-/g, '/'));
  const last = new Date(endDate.replace(/-/g, '/'));
  
  while (curr <= last) {
    dates.push(formatDateToISO(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

/**
 * Retorna solo las noches (excluye el día de salida) para el cálculo de precios
 */
export const getNightsInRange = (startDate: string, endDate: string): string[] => {
  const dates = [];
  let curr = new Date(startDate.replace(/-/g, '/'));
  const last = new Date(endDate.replace(/-/g, '/'));
  
  while (curr < last) { 
    dates.push(formatDateToISO(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

export const isBetween = (date: string, start: string, end: string) => {
  return date >= start && date <= end;
};

/**
 * Días totales en el grid (incluye salida)
 */
export const getDaysDiff = (start: string, end: string) => {
  const s = new Date(start.replace(/-/g, '/'));
  const e = new Date(end.replace(/-/g, '/'));
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Noches reales (Check-out - Check-in)
 */
export const getNightsCount = (start: string, end: string) => {
  const s = new Date(start.replace(/-/g, '/'));
  const e = new Date(end.replace(/-/g, '/'));
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
};

/**
 * Verifica si un rango de estadía toca Enero o Febrero
 */
export const touchesHighSeason = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate.replace(/-/g, '/'));
  const end = new Date(endDate.replace(/-/g, '/'));
  let current = new Date(start);
  while (current < end) {
    if (current.getMonth() === 0 || current.getMonth() === 1) return true;
    current.setDate(current.getDate() + 1);
  }
  return false;
};

export const getDaysUntilEndOfYear = (startDate: Date, targetYear: number): number => {
  const endDate = new Date(targetYear, 11, 31);
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};
