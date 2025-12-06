import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { IActivity } from '../types';

interface StatsChartProps {
  activities: IActivity[]; // Expects pre-filtered completed activities
  theme: 'dark' | 'light';
  period: 'week' | 'month';
}

export const StatsChart: React.FC<StatsChartProps> = ({ activities, theme, period }) => {
  // Prepare Pie Data (Distribution by Activity Title)
  const pieDataMap = activities.reduce((acc, curr) => {
    const minutes = curr.elapsedSeconds / 60;
    // Changed from curr.tag to curr.title per user request
    acc[curr.title] = (acc[curr.title] || 0) + minutes;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(pieDataMap).map(key => ({
    name: key,
    value: Math.round(pieDataMap[key] * 10) / 10
  }));

  // Prepare Line Data
  let lineData: { name: string; minutes: number }[] = [];

  if (period === 'week') {
    // Minutes per Day of Week (Mon-Sun)
    const daysOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    lineData = daysOrder.map(day => {
      const minutes = activities
        .filter(a => a.day === day)
        .reduce((sum, curr) => sum + (curr.elapsedSeconds / 60), 0);
      return { name: day.substring(0, 3), fullDay: day, minutes: Math.round(minutes) };
    });
  } else {
    // Minutes per Day of Month (1-31)
    const now = new Date();
    // Assuming we are showing the current month based on the filter logic in parent
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const minutes = activities
        .filter(a => {
           // a.date is YYYY-MM-DD
           const dayOfMonth = parseInt(a.date.split('-')[2], 10);
           return dayOfMonth === i;
        })
        .reduce((sum, curr) => sum + (curr.elapsedSeconds / 60), 0);
      lineData.push({ name: i.toString(), minutes: Math.round(minutes) });
    }
  }

  // Colors
  const COLORS = ['#00BCD4', '#4CAF50', '#FF5252', '#9f7aea', '#FFC107', '#3b82f6', '#ec4899', '#8b5cf6'];
  const textColor = theme === 'dark' ? '#E8EAED' : '#374151';
  const gridColor = theme === 'dark' ? '#2D3139' : '#e5e7eb';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: theme === 'dark' ? '#0F1419' : '#fff',
          border: '1px solid ' + gridColor,
          padding: '8px',
          borderRadius: '8px',
          color: textColor
        }}>
          <p className="font-bold text-sm">{payload[0].payload.fullDay || `Dia ${label}`}</p>
          <p className="text-sm text-[#00BCD4]">{`${payload[0].value} min`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1A1F26] border-[#2D3139]' : 'bg-white border-gray-200'} shadow-sm`}>
        <h3 className="text-lg font-semibold mb-4 text-center">Distribuição por Atividade (Min)</h3>
        <div className="h-64">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend wrapperStyle={{ color: textColor }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center opacity-50 text-sm">
              Sem dados para este período
            </div>
          )}
        </div>
      </div>

      <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-[#1A1F26] border-[#2D3139]' : 'bg-white border-gray-200'} shadow-sm`}>
        <h3 className="text-lg font-semibold mb-4 text-center">
          {period === 'week' ? 'Minutos por Dia (Semana)' : 'Minutos por Dia (Mês)'}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="name" 
                stroke={textColor} 
                fontSize={12} 
                tickLine={false} 
                interval={period === 'month' ? 2 : 0} // Skip labels on month view to avoid clutter
              />
              <YAxis stroke={textColor} fontSize={12} tickLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="minutes" 
                stroke="#00BCD4" 
                strokeWidth={2}
                dot={{ fill: '#00BCD4', r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};