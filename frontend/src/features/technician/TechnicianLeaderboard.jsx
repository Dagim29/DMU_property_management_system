import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Trophy, Star, Award, CheckCircle, Zap, RefreshCw, Medal } from 'lucide-react';

const BADGE_ICONS = {
  emergency_responder: '🚨',
  five_star:           '⭐',
  speed_demon:         '⚡',
  reliable:            '🏆',
  century_club:        '💯',
  first_complete:      '🎯',
  team_player:         '🤝',
  veteran:             '🎖',
};

const RANK_STYLES = [
  'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-200',
  'bg-gradient-to-r from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-200',
  'bg-gradient-to-r from-orange-400 to-amber-600 text-white shadow-lg shadow-orange-200',
];

export default function TechnicianLeaderboard() {
  const { token } = useSelector((state) => state.auth);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('leaderboard');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [lbRes, badgeRes] = await Promise.all([
        axios.get('http://localhost:8000/api/technician/performance/leaderboard/', { headers }),
        axios.get('http://localhost:8000/api/technician/performance/my-badges/', { headers }),
      ]);
      setLeaderboard(lbRes.data.leaderboard || []);
      setMyBadges(badgeRes.data.badges || []);
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const myEntry = leaderboard.find(e => e.is_me);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-yellow-50 to-amber-50">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-yellow-500 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-yellow-50 to-amber-50 p-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 rounded-2xl shadow-2xl p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-28 translate-x-28"></div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <Trophy className="w-8 h-8" />
              Leaderboard & Badges
            </h1>
            <p className="text-yellow-100 text-sm">Compete, earn badges, and track your achievements</p>
          </div>
          <button onClick={fetchData} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors self-start">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* My Rank Banner */}
      {myEntry && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-yellow-300 p-5 mb-6 flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${
            myEntry.rank <= 3 ? RANK_STYLES[myEntry.rank - 1] : 'bg-gray-100 text-gray-700'
          }`}>
            {myEntry.rank <= 3 ? ['🥇','🥈','🥉'][myEntry.rank - 1] : `#${myEntry.rank}`}
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-0.5">Your current ranking</p>
            <p className="font-bold text-gray-900 text-lg">#{myEntry.rank} — {myEntry.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                {myEntry.total_ratings} {myEntry.total_ratings === 1 ? 'rating' : 'ratings'}
              </span>
              <span className="text-sm text-gray-600">·</span>
              <span className="text-sm text-gray-600">{myEntry.total_completed} completed</span>
              <span className="text-sm text-gray-600">·</span>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-purple-500" />
                {myEntry.badge_count} {myEntry.badge_count === 1 ? 'badge' : 'badges'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-yellow-500">{Math.round(myEntry.performance_score || 0)}</p>
            <p className="text-xs text-gray-400">/ 100 score</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl shadow-lg border border-gray-100 p-1 mb-6 gap-1">
        {[
          { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          { key: 'badges', label: `My Badges (${myBadges.length})`, icon: Award },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === key ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'leaderboard' ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Top 3 podium */}
          {leaderboard.length >= 3 && (
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6 border-b border-gray-100">
              <div className="flex items-end justify-center gap-4">
                {/* 2nd */}
                <PodiumCard entry={leaderboard[1]} rank={2} />
                {/* 1st */}
                <PodiumCard entry={leaderboard[0]} rank={1} tall />
                {/* 3rd */}
                <PodiumCard entry={leaderboard[2]} rank={3} />
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="divide-y divide-gray-50">
            {leaderboard.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                  entry.is_me ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'hover:bg-gray-50'
                }`}
              >
                {/* Rank */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                  entry.rank === 2 ? 'bg-gray-100 text-gray-600' :
                  entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : `#${entry.rank}`}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold truncate ${entry.is_me ? 'text-yellow-700' : 'text-gray-900'}`}>
                      {entry.name} {entry.is_me && <span className="text-xs font-normal">(You)</span>}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">{entry.specialization} · {entry.total_completed} completed</p>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-medium">{entry.total_ratings}</span>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Award className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">{entry.badge_count}</span>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0 min-w-[80px]">
                  <p className={`text-2xl font-bold ${
                    entry.performance_score >= 70 ? 'text-green-600' :
                    entry.performance_score >= 40 ? 'text-yellow-600' : 'text-gray-500'
                  }`}>{Math.round(entry.performance_score || 0)}</p>
                  <p className="text-xs text-gray-400">/ 100 score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Badges Tab */
        <div>
          {myBadges.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <Award className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-lg">No badges yet</p>
              <p className="text-gray-400 text-sm mt-2">Complete work orders and earn great ratings to unlock badges!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {myBadges.map((badge) => (
                <div key={badge.badge_type} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center hover:shadow-xl transition-all">
                  <div className="text-5xl mb-3">{BADGE_ICONS[badge.badge_type] || '🏅'}</div>
                  <p className="font-bold text-gray-900 mb-1">{badge.label}</p>
                  <p className="text-xs text-gray-500 mb-3">{badge.description}</p>
                  <p className="text-xs text-gray-400">
                    Earned {new Date(badge.awarded_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Locked badges */}
          <div className="mt-6">
            <h3 className="text-base font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Medal className="w-5 h-5 text-gray-400" />
              Badges to Unlock
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(BADGE_ICONS)
                .filter(([type]) => !myBadges.find(b => b.badge_type === type))
                .map(([type, icon]) => {
                  const descriptions = {
                    emergency_responder: 'Complete 5+ emergency work orders',
                    five_star:           'Achieve average rating ≥ 4.5 stars',
                    speed_demon:         'Average completion time under 2 hours',
                    reliable:            'Complete 20+ work orders total',
                    century_club:        'Reach performance score of 80+',
                    first_complete:      'Complete your first work order',
                    team_player:         'Receive 5+ ratings from owners',
                    veteran:             'Complete 50+ work orders total',
                  };
                  const labels = {
                    emergency_responder: '🚨 Emergency Responder',
                    five_star:           '⭐ 5-Star Technician',
                    speed_demon:         '⚡ Speed Demon',
                    reliable:            '🏆 Reliable',
                    century_club:        '💯 Century Club',
                    first_complete:      '🎯 First Complete',
                    team_player:         '🤝 Team Player',
                    veteran:             '🎖 Veteran',
                  };
                  return (
                    <div key={type} className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center opacity-60">
                      <div className="text-5xl mb-3 grayscale">{icon}</div>
                      <p className="font-semibold text-gray-600 mb-1 text-sm">{labels[type]}</p>
                      <p className="text-xs text-gray-400">{descriptions[type]}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumCard({ entry, rank, tall }) {
  const heights = { 1: 'h-28', 2: 'h-20', 3: 'h-16' };
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className={`flex flex-col items-center ${tall ? 'scale-110' : ''}`}>
      <div className="text-3xl mb-1">{medals[rank - 1]}</div>
      <p className={`text-sm font-bold text-gray-900 mb-1 text-center ${entry.is_me ? 'text-yellow-700' : ''}`}>
        {entry.name.split(' ')[0]}
      </p>
      <div className="flex items-center gap-1 mb-2">
        <p className="text-lg font-bold text-gray-700">{Math.round(entry.performance_score || 0)}</p>
        <p className="text-xs text-gray-400">/ 100</p>
      </div>
      <div className={`w-20 ${heights[rank]} rounded-t-xl flex items-end justify-center pb-2 ${
        rank === 1 ? 'bg-gradient-to-t from-yellow-400 to-amber-300' :
        rank === 2 ? 'bg-gradient-to-t from-gray-300 to-gray-200' :
        'bg-gradient-to-t from-orange-400 to-amber-300'
      }`}>
        <span className="text-white font-bold text-lg">#{rank}</span>
      </div>
    </div>
  );
}
