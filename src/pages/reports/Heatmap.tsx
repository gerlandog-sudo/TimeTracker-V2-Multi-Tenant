import React, { useState, useEffect } from 'react';
import { Calendar, Users, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { motion } from 'motion/react';
import { format, addDays, startOfWeek, subWeeks, addWeeks, startOfMonth, endOfMonth, subMonths, addMonths, endOfWeek } from 'date-fns';
import { es, enUS, ptBR, pt } from 'date-fns/locale';
import api from '../../lib/api';
import { useTranslation } from 'react-i18next';

interface HeatmapData {
  user_id: number;
  user_name: string;
  weekly_capacity: number;
  days: {
    date: string;
    hours: number;
    capacity: number;
    saturation: number;
  }[];
  weeks?: {
    label: string;
    hours: number;
    capacity: number;
    saturation: number;
  }[];
}

const HeatmapPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  const dateLocales: Record<string, any> = {
    es_AR: es,
    es_ES: es,
    en_US: enUS,
    en_GB: enUS,
    pt_BR: ptBR,
    pt_PT: pt
  };

  const currentLocale = dateLocales[i18n.language] || es;

  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [currentDate, setCurrentDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHeatmapData = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      if (viewMode === 'weekly') {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      } else {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        startDate = format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        endDate = format(endOfWeek(monthEnd, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      }
      
      const response = await api.get(`/reports/heatmap?start_date=${startDate}&end_date=${endDate}&t=${Date.now()}`);
      
      let processedData = Array.isArray(response.data) ? response.data : [];
      
      // Recalculate daily saturation based on 8 hours
      processedData = processedData.map((user: any) => {
        const days = Array.isArray(user.days) ? user.days.map((day: any) => ({
          ...day,
          saturation: (day.hours / 8) * 100
        })) : [];
        return { ...user, days };
      });

      if (viewMode === 'monthly') {
        processedData = processedData.map((user: any) => {
          const weeks: any[] = [];
          let currentWeek: any = { hours: 0, capacity: user.weekly_capacity, saturation: 0, days: [] };
          
          const days = Array.isArray(user.days) ? user.days : [];
          days.forEach((day: any, index: number) => {
            currentWeek.hours += day.hours;
            currentWeek.days.push(day);
            
            if (index % 7 === 6 || index === days.length - 1) {
              currentWeek.saturation = user.weekly_capacity > 0 ? (currentWeek.hours / user.weekly_capacity) * 100 : 0;
              const startDay = currentWeek.days[0]?.date || startDate;
              const endDay = currentWeek.days[currentWeek.days.length - 1]?.date || endDate;
              currentWeek.label = `${format(new Date(startDay + 'T00:00:00'), 'd MMM', { locale: currentLocale })} - ${format(new Date(endDay + 'T00:00:00'), 'd MMM', { locale: currentLocale })}`;
              weeks.push(currentWeek);
              currentWeek = { hours: 0, capacity: user.weekly_capacity, saturation: 0, days: [] };
            }
          });
          
          return { ...user, weeks, days };
        });
      }
      
      setData(processedData);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData();
  }, [currentDate, viewMode]);

  const handlePrev = () => {
    if (viewMode === 'weekly') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'weekly') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const weekDays = viewMode === 'weekly' 
    ? Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i))
    : [];


  const getColorClass = (saturation: number) => {
    if (saturation === 0) return 'bg-gray-50 text-gray-400 border-gray-100';
    if (saturation <= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (saturation <= 100) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200 font-bold';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('reports.heatmap_title')}</h1>
          <p className="text-gray-500">{t('reports.heatmap_subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                viewMode === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
              {t('reports.weekly')}
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                viewMode === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              {t('reports.monthly')}
            </button>
          </div>

          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 font-medium text-gray-700 min-w-[200px] justify-center">
              <Calendar className="w-4 h-4 text-primary" />
              {viewMode === 'weekly' ? (
                <>{format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: currentLocale })} - {format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "d MMM, yyyy", { locale: currentLocale })}</>
              ) : (
                <span className="capitalize">{format(currentDate, "MMMM yyyy", { locale: currentLocale })}</span>
              )}
            </div>
            <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">{t('reports.avail_high')}</p>
            <p className="text-lg font-bold text-gray-900">0% - 80%</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">{t('reports.capacity_optimal')}</p>
            <p className="text-lg font-bold text-gray-900">81% - 100%</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">{t('reports.overload_risk')}</p>
            <p className="text-lg font-bold text-gray-900">&gt; 100%</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50/95 backdrop-blur z-10 border-r border-gray-100 min-w-[120px] max-w-[150px]">
                  {t('reports.team_member')}
                </th>
                {viewMode === 'weekly' ? (
                  weekDays.map((day, i) => (
                    <th key={i} className="px-4 py-4 text-center border-r border-gray-100 last:border-0 min-w-[120px]">
                      <div className="text-xs font-semibold text-gray-500 uppercase">{format(day, 'EEEE', { locale: currentLocale })}</div>
                      <div className="text-sm font-bold text-gray-900">{format(day, 'd MMM', { locale: currentLocale })}</div>
                    </th>
                  ))
                ) : (
                  data[0]?.weeks?.map((week, i) => (
                    <th key={i} className="px-4 py-4 text-center border-r border-gray-100 last:border-0 min-w-[140px]">
                      <div className="text-xs font-semibold text-gray-500 uppercase">{t('reports.week')} {i + 1}</div>
                      <div className="text-sm font-bold text-gray-900">{week.label}</div>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
                    />
                    {t('reports.loading_capacity')}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {t('reports.no_user_data')}
                  </td>
                </tr>
              ) : (
                data.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 sticky left-0 bg-white z-10 border-r border-gray-100 max-w-[150px] truncate">
                      <div className="font-medium text-gray-900 truncate" title={user.user_name}>{user.user_name}</div>
                      <div className="text-xs text-gray-500">Capacidad: {user.weekly_capacity}h/sem</div>
                    </td>
                    {viewMode === 'weekly' ? (
                      user.days.map((day, i) => (
                        <td key={i} className="p-2 border-r border-gray-100 last:border-0">
                          <div className={`h-full w-full rounded-xl border p-3 flex flex-col items-center justify-center transition-all ${getColorClass(day.saturation)}`}>
                            <span className="text-lg font-bold">{day.hours.toFixed(1)}h</span>
                            <span className="text-[10px] uppercase tracking-wider opacity-80 mt-1">
                              {day.saturation.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      ))
                    ) : (
                      user.weeks?.map((week, i) => (
                        <td key={i} className="p-2 border-r border-gray-100 last:border-0">
                          <div className={`h-full w-full rounded-xl border p-3 flex flex-col items-center justify-center transition-all ${getColorClass(week.saturation)}`}>
                            <span className="text-lg font-bold">{week.hours.toFixed(1)}h</span>
                            <span className="text-[10px] uppercase tracking-wider opacity-80 mt-1">
                              {week.saturation.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      ))
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HeatmapPage;
