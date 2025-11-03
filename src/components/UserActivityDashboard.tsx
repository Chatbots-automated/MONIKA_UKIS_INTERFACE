import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, Users, TrendingUp, Clock, BarChart3, Award } from 'lucide-react';
import { translateAction } from '../lib/actionTranslations';

interface ActivityStats {
  totalActions: number;
  uniqueUsers: number;
  todayActions: number;
  weekActions: number;
  mostActiveUser: { email: string; count: number } | null;
  mostUsedFeature: { action: string; count: number } | null;
  peakHour: number;
  hourlyActivity: Array<{ hour: number; count: number }>;
  actionBreakdown: Array<{ action: string; count: number }>;
  recentActivity: Array<any>;
}

export function UserActivityDashboard() {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data: logs, error } = await supabase
        .from('user_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: usersData } = await supabase.auth.admin.listUsers();

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const todayActions = logs.filter(l => new Date(l.created_at) >= todayStart).length;
      const weekActions = logs.filter(l => new Date(l.created_at) >= weekStart).length;
      const uniqueUsers = new Set(logs.map(l => l.user_id)).size;

      const userCounts: { [key: string]: number } = {};
      logs.forEach(log => {
        userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
      });

      const mostActiveUserId = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];
      const mostActiveUser = mostActiveUserId
        ? {
            email: usersData?.users.find(u => u.id === mostActiveUserId[0])?.email || 'Unknown',
            count: mostActiveUserId[1]
          }
        : null;

      const actionCounts: { [key: string]: number } = {};
      logs.forEach(log => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });

      const mostUsedAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
      const mostUsedFeature = mostUsedAction
        ? { action: mostUsedAction[0], count: mostUsedAction[1] }
        : null;

      const hourCounts: { [key: number]: number } = {};
      logs.forEach(log => {
        const hour = new Date(log.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const peakHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
      const peakHour = peakHourEntry ? parseInt(peakHourEntry[0]) : 0;

      const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourCounts[i] || 0
      }));

      const actionBreakdown = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const recentActivity = logs.slice(0, 10).map(log => ({
        ...log,
        user_email: usersData?.users.find(u => u.id === log.user_id)?.email || 'Unknown'
      }));

      setStats({
        totalActions: logs.length,
        uniqueUsers,
        todayActions,
        weekActions,
        mostActiveUser,
        mostUsedFeature,
        peakHour,
        hourlyActivity,
        actionBreakdown,
        recentActivity
      });

    } catch (error: any) {
      console.error('Error loading stats:', error);
      alert('Klaida kraunant statistiką: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const maxHourlyCount = Math.max(...stats.hourlyActivity.map(h => h.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Viso veiksmų</p>
              <p className="text-3xl font-bold mt-2">{stats.totalActions.toLocaleString()}</p>
            </div>
            <Activity className="h-12 w-12 text-red-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Aktyvūs vartotojai</p>
              <p className="text-3xl font-bold mt-2">{stats.uniqueUsers}</p>
            </div>
            <Users className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Šiandien</p>
              <p className="text-3xl font-bold mt-2">{stats.todayActions.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Šią savaitę</p>
              <p className="text-3xl font-bold mt-2">{stats.weekActions.toLocaleString()}</p>
            </div>
            <Clock className="h-12 w-12 text-orange-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Aktyviausias vartotojas
          </h3>
          {stats.mostActiveUser ? (
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div>
                <p className="font-medium text-gray-900">{stats.mostActiveUser.email}</p>
                <p className="text-sm text-gray-600">{stats.mostActiveUser.count} veiksmų</p>
              </div>
              <div className="text-3xl">🏆</div>
            </div>
          ) : (
            <p className="text-gray-500">Nėra duomenų</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Populiariausia funkcija
          </h3>
          {stats.mostUsedFeature ? (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-medium text-gray-900">{translateAction(stats.mostUsedFeature.action)}</p>
                <p className="text-sm text-gray-600">{stats.mostUsedFeature.count} kartų</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          ) : (
            <p className="text-gray-500">Nėra duomenų</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Aktyvumas pagal valandas (paskutinės 24 val)
        </h3>
        <div className="flex items-end justify-between h-48 gap-1">
          {stats.hourlyActivity.map(({ hour, count }) => (
            <div key={hour} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t transition-all hover:from-red-600 hover:to-red-500"
                style={{
                  height: maxHourlyCount > 0 ? `${(count / maxHourlyCount) * 100}%` : '0%',
                  minHeight: count > 0 ? '4px' : '0px'
                }}
                title={`${hour}:00 - ${count} veiksmų`}
              />
              <span className="text-xs text-gray-500">{hour}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-4 text-center">
          Didžiausias aktyvumas: {stats.peakHour}:00 val.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-red-500" />
          Top 10 veiksmų
        </h3>
        <div className="space-y-3">
          {stats.actionBreakdown.map((item, index) => (
            <div key={item.action} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{translateAction(item.action)}</span>
                  <span className="text-sm text-gray-600">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-400 h-2 rounded-full transition-all"
                    style={{ width: `${(item.count / stats.totalActions) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
