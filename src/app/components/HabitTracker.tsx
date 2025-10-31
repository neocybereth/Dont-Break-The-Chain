'use client';

import { useState } from 'react';

type ViewMode = 'daily' | 'weekly';

interface DayInfo {
  date: Date;
  dayOfMonth: number;
  isToday: boolean;
  checked: boolean;
}

interface WeekInfo {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  checked: boolean;
}

export default function HabitTracker() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [checkedDays, setCheckedDays] = useState<Set<string>>(new Set());
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  // Generate dates for the current month
  const generateDays = (): DayInfo[] => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const days: DayInfo[] = [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = d === now.getDate();
      days.push({
        date,
        dayOfMonth: d,
        isToday,
        checked: checkedDays.has(dateStr),
      });
    }

    return days;
  };

  // Generate weeks for the current month
  const generateWeeks = (): WeekInfo[] => {
    const days = generateDays();
    const weeks: WeekInfo[] = [];
    let currentWeek: DayInfo[] = [];
    let weekNumber = 1;

    days.forEach((day, index) => {
      const dayOfWeek = day.date.getDay();
      
      // Start a new week on Monday (or if it's the first day)
      if (dayOfWeek === 1 || index === 0) {
        if (currentWeek.length > 0) {
          const startDate = currentWeek[0].date;
          const endDate = currentWeek[currentWeek.length - 1].date;
          const allChecked = currentWeek.every(d => d.checked);
          weeks.push({
            weekNumber,
            startDate,
            endDate,
            checked: allChecked,
          });
          weekNumber++;
          currentWeek = [];
        }
      }
      
      currentWeek.push(day);

      // Add the last week
      if (index === days.length - 1 && currentWeek.length > 0) {
        const startDate = currentWeek[0].date;
        const endDate = currentWeek[currentWeek.length - 1].date;
        const allChecked = currentWeek.every(d => d.checked);
        weeks.push({
          weekNumber,
          startDate,
          endDate,
          checked: allChecked,
        });
      }
    });

    return weeks;
  };

  const toggleDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const newChecked = new Set(checkedDays);
    if (newChecked.has(dateStr)) {
      newChecked.delete(dateStr);
    } else {
      newChecked.add(dateStr);
    }
    setCheckedDays(newChecked);
  };

  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = startDate.toLocaleDateString('en-US', options);
    const end = endDate.toLocaleDateString('en-US', options);
    return `${start} - ${end}`;
  };

  const days = generateDays();
  const weeks = generateWeeks();

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-zinc-900 dark:text-white">
          Don&apos;t Break The Chain
        </h1>

        {/* View Mode Selector */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700 p-1 bg-zinc-100 dark:bg-zinc-800">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'daily'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Daily View */}
        {viewMode === 'daily' && (
          <div className="grid grid-cols-7 gap-3">
            {days.map((day) => (
              <button
                key={day.date.toISOString()}
                onClick={() => toggleDay(day.date)}
                className={`aspect-square flex items-center justify-center rounded-lg font-semibold text-lg transition-all ${
                  day.checked
                    ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                    : day.isToday
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border-2 border-blue-500 hover:bg-blue-200 dark:hover:bg-blue-800'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {day.dayOfMonth}
              </button>
            ))}
          </div>
        )}

        {/* Weekly View */}
        {viewMode === 'weekly' && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
            {weeks.map((week) => (
              <div
                key={week.weekNumber}
                className="relative"
                onMouseEnter={() => setHoveredWeek(week.weekNumber)}
                onMouseLeave={() => setHoveredWeek(null)}
              >
                <div
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg font-semibold text-lg transition-all cursor-default ${
                    week.checked
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Week</div>
                  <div className="text-2xl">{week.weekNumber}</div>
                </div>
                
                {/* Hover Tooltip */}
                {hoveredWeek === week.weekNumber && (
                  <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-700 text-white text-sm rounded-lg shadow-lg whitespace-nowrap">
                    {formatDateRange(week.startDate, week.endDate)}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-700"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 text-center text-zinc-600 dark:text-zinc-400">
          <p className="text-sm">
            Current Streak: <span className="font-bold text-zinc-900 dark:text-white">{checkedDays.size}</span> days
          </p>
        </div>
      </div>
    </div>
  );
}
