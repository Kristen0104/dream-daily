import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDreamStorage } from '../hooks/useDreamStorage';
import { Dream } from '../types';
import '../styles/HistoryPage.css';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dreams: Dream[];
}

function getCalendarDays(year: number, month: number, dreams: Dream[]): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDay = (firstDay.getDay() + 6) % 7; // Monday = 0

  const days: CalendarDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Previous month days
  const prevMonth = new Date(year, month, 0);
  for (let i = startingDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonth.getDate() - i);
    days.push({
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: false,
      isToday: false,
      dreams: getDreamsForDate(date, dreams),
    });
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    const isToday = date.getTime() === today.getTime();
    days.push({
      date,
      dayNumber: i,
      isCurrentMonth: true,
      isToday,
      dreams: getDreamsForDate(date, dreams),
    });
  }

  // Next month days to fill the grid
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: false,
      dreams: getDreamsForDate(date, dreams),
    });
  }

  return days;
}

function getDreamsForDate(date: Date, dreams: Dream[]): Dream[] {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return dreams.filter(dream => {
    const dreamDate = new Date(dream.createdAt);
    return dreamDate >= startOfDay && dreamDate <= endOfDay;
  });
}

function generateMonthlySummary(year: number, month: number, dreams: Dream[]): string {
  const monthDreams = dreams.filter(dream => {
    const date = new Date(dream.createdAt);
    return date.getFullYear() === year && date.getMonth() === month;
  });

  if (monthDreams.length === 0) {
    return `${MONTHS[month]} ${year}: No dreams recorded this month.`;
  }

  // Collect all core imagery
  const allImagery = monthDreams.flatMap(d => d.coreImagery);
  const imageryCount: Record<string, number> = {};
  allImagery.forEach(img => {
    imageryCount[img] = (imageryCount[img] || 0) + 1;
  });

  const topImagery = Object.entries(imageryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([img]) => img);

  const summaries = [
    `This month you had ${monthDreams.length} ${monthDreams.length === 1 ? 'dream' : 'dreams'}. ${topImagery.length > 0 ? `${topImagery.join(' and ')} were recurring themes in your subconscious.` : ''}`,
    `${MONTHS[month]} ${year}: ${monthDreams.length} moments captured from the dream world. ${topImagery.length > 0 ? `Your mind kept returning to ${topImagery.join(' and ')}.` : ''}`,
  ];

  return summaries[Math.floor(Math.random() * summaries.length)];
}

export function HistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dreams } = useDreamStorage();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() =>
    getCalendarDays(year, month, dreams),
    [year, month, dreams]
  );

  const monthlySummary = useMemo(() =>
    generateMonthlySummary(year, month, dreams),
    [year, month, dreams]
  );

  // Initialize with today or first day with dreams
  useEffect(() => {
    if (!selectedDay) {
      const today = calendarDays.find(d => d.isToday);
      const firstDreamDay = calendarDays.find(d => d.dreams.length > 0);
      if (today && today.dreams.length > 0) {
        setSelectedDay(today);
      } else if (firstDreamDay) {
        setSelectedDay(firstDreamDay);
      } else if (today) {
        setSelectedDay(today);
      }
    }
  }, [calendarDays, selectedDay]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.isCurrentMonth) {
      setSelectedDay(day);
    }
  };

  const handleDreamClick = (dreamId: string) => {
    navigate(`/dream/${dreamId}`, { state: { from: location.pathname } });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPreviewText = (text: string) => {
    return text.length > 60 ? text.slice(0, 60) + '...' : text;
  };

  return (
    <div className="history-page">
      <div className="fog-overlay"></div>

      <div className="history-layout">
        {/* Left Panel - 2/3 Calendar */}
        <div className="calendar-panel">
          {/* Top bar with back button only */}
          <div className="top-bar-only">
            <button onClick={() => navigate('/')} className="back-button">
              ←
            </button>
            <div className="header-spacer"></div>
          </div>

          <div className="calendar-header">
            <div className="month-selector">
              <button onClick={prevMonth} className="month-arrow">
                ‹
              </button>
              <span className="month-title">
                {MONTHS[month]} {year}
              </span>
              <button onClick={nextMonth} className="month-arrow">
                ›
              </button>
            </div>
          </div>

          <div className="calendar-container">
            <div className="weekdays">
              {WEEKDAYS.map(day => (
                <div key={day} className="weekday">
                  {day}
                </div>
              ))}
            </div>

            <div className="calendar-grid">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''} ${day.dreams.length > 0 ? 'has-dream' : ''} ${selectedDay?.date.getTime() === day.date.getTime() ? 'selected' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  <span className="day-number">
                    {day.dayNumber}
                  </span>
                  {day.dreams.length > 0 && (
                    <span className="dream-star">✦</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="monthly-summary">
            <p>{monthlySummary}</p>
          </div>
        </div>

        {/* Right Panel - 1/3 Dreams */}
        <div className="dreams-panel">
          {selectedDay && (
            <>
              <div className="panel-header">
                <span className="panel-date">
                  {selectedDay.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isTodayOrPast = selectedDay.date.getTime() <= today.getTime();
                  return (
                    <button
                      className={`write-button ${!isTodayOrPast ? 'disabled' : ''}`}
                      disabled={!isTodayOrPast}
                      onClick={() => {
                        if (isTodayOrPast) {
                          navigate('/input', { state: { selectedDate: selectedDay.date.getTime() } });
                        }
                      }}
                    >
                      WRITE
                    </button>
                  );
                })()}
              </div>

              <div className="panel-content">
                {selectedDay.dreams.length > 0 ? (
                  selectedDay.dreams.map((dream, index) => (
                    <div
                      key={dream.id}
                      className="dream-card-sidebar"
                      onClick={() => handleDreamClick(dream.id)}
                    >
                      <div className="card-glow" style={{ animationDelay: `${index * 0.1}s` }}></div>
                      <div className="card-content">
                        <p className="card-date">{formatDate(dream.createdAt)}</p>
                        <p className="card-title">{dream.dreamTitle || 'Untitled dream'}</p>
                        <p className="card-text">{getPreviewText(dream.originalText)}</p>
                        <p className="card-count">
                          {dream.story.length} {dream.story.length === 1 ? 'moment' : 'moments'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-day">
                    <div className="empty-day-icon">🌙</div>
                    <p>No dreams recorded on this day</p>
                  </div>
                )}
              </div>
            </>
          )}
          {!selectedDay && (
            <div className="empty-day">
              <div className="empty-day-icon">✨</div>
              <p>Select a day to view your dreams</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
