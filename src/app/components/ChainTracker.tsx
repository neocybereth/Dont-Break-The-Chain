'use client';

import { useState, useMemo } from 'react';

type ViewMode = 'daily' | 'weekly';

interface DayData {
  date: Date;
  checked: boolean;
}

const DAYS_TO_DISPLAY = 42; // 6 weeks of tracking history
const MILLISECONDS_PER_DAY = 86400000;

export default function ChainTracker() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  
  // Initialize days data using useMemo to avoid effect dependency
  const initialDays = useMemo(() => {
    const today = new Date();
    const daysData: DayData[] = [];
    
    for (let i = DAYS_TO_DISPLAY - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      daysData.push({
        date,
        checked: false,
      });
    }
    
    return daysData;
  }, []);
  
  const [days, setDays] = useState<DayData[]>(initialDays);

  const toggleDay = (index: number) => {
    setDays(prev => {
      const newDays = [...prev];
      newDays[index].checked = !newDays[index].checked;
      return newDays;
    });
  };

  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / MILLISECONDS_PER_DAY;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getWeekRange = (weekStart: Date): string => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const formatDate = (d: Date) => {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  const groupByWeeks = (): Array<{ weekNumber: number; weekStart: Date; days: DayData[] }> => {
    const weeks: Array<{ weekNumber: number; weekStart: Date; days: DayData[] }> = [];
    let currentWeek: DayData[] = [];
    let currentWeekStart: Date | null = null;

    days.forEach((day, index) => {
      const dayOfWeek = day.date.getDay();
      
      // Start a new week on Sunday (0) or if it's the first day
      if (dayOfWeek === 0 || index === 0) {
        if (currentWeek.length > 0 && currentWeekStart) {
          weeks.push({
            weekNumber: getWeekNumber(currentWeekStart),
            weekStart: currentWeekStart,
            days: currentWeek,
          });
        }
        currentWeek = [day];
        currentWeekStart = day.date;
      } else {
        currentWeek.push(day);
      }
    });

    // Add the last week
    if (currentWeek.length > 0 && currentWeekStart) {
      weeks.push({
        weekNumber: getWeekNumber(currentWeekStart),
        weekStart: currentWeekStart,
        days: currentWeek,
      });
    }

    return weeks;
  };

  const renderDailyView = () => {
    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-zinc-600 dark:text-zinc-400 pb-2">
            {day}
          </div>
        ))}
        {days.map((day, index) => (
          <div
            key={index}
            className="aspect-square flex flex-col items-center justify-center"
          >
            <button
              onClick={() => toggleDay(index)}
              className={`w-full h-full rounded-lg border-2 transition-all hover:scale-105 ${
                day.checked
                  ? 'bg-green-500 border-green-600 text-white'
                  : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500'
              }`}
              title={day.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            >
              <div className="text-xs font-medium">
                {day.date.getDate()}
              </div>
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderWeeklyView = () => {
    const weeks = groupByWeeks();
    
    return (
      <div className="space-y-3">
        {weeks.map((week, weekIndex) => {
          const allChecked = week.days.every(d => d.checked);
          const someChecked = week.days.some(d => d.checked);
          const checkedCount = week.days.filter(d => d.checked).length;
          
          return (
            <div
              key={weekIndex}
              className="group relative"
            >
              <div
                className={`p-4 rounded-lg border-2 transition-all ${
                  allChecked
                    ? 'bg-green-500 border-green-600 text-white'
                    : someChecked
                    ? 'bg-yellow-100 dark:bg-yellow-900 border-yellow-400 dark:border-yellow-600'
                    : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-lg font-semibold">
                      Week {week.weekNumber}
                    </div>
                    <div className="text-sm opacity-75">
                      {checkedCount} of {week.days.length} days
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {allChecked ? '✓' : someChecked ? '◐' : '○'}
                  </div>
                </div>
              </div>
              
              {/* Hover tooltip */}
              <div className="absolute left-0 right-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-zinc-900 text-white p-3 rounded-lg shadow-lg">
                  <div className="text-sm font-semibold mb-2">
                    {getWeekRange(week.weekStart)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {week.days.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                          day.checked
                            ? 'bg-green-500'
                            : 'bg-zinc-700'
                        }`}
                        title={day.date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      >
                        {day.date.getDate()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">
          Don&apos;t Break The Chain
        </h1>
        
        <div className="flex items-center gap-4 mb-4">
          <label htmlFor="view-selector" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            View:
          </label>
          <select
            id="view-selector"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="px-4 py-2 rounded-lg border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {viewMode === 'daily' 
            ? 'Click on a day to mark it as complete. Build your chain!' 
            : 'Hover over a week to see the dates. Complete all days in a week to mark it complete!'}
        </p>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl shadow-sm">
        {viewMode === 'daily' ? renderDailyView() : renderWeeklyView()}
      </div>
    </div>
  );
}
