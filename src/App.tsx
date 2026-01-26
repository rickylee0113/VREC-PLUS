
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, Play, RotateCcw, Save, Upload, FileJson, 
  ChevronLeft, ChevronRight, BarChart2, Video, 
  Eraser, Download, PieChart, Activity, AlertTriangle, Plus, Trash2, FileText, Zap, Dna, ClipboardList, Printer, Pencil, X, FolderHeart, RefreshCw, CheckCircle, Lock, ScrollText, LogOut, UserCircle
} from 'lucide-react';
import VideoPlayer from './components/VideoPlayer';
import CourtMap from './components/CourtMap';
import { 
  Team, Player, MatchMetadata, Lineup, TagEvent, 
  Zone, SkillType, ResultType, PlayerRole, TeamSide, 
  Coordinate, GradeType, SkillSubType 
} from '../types';

import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from './firebase';

// --- Constants & Exports ---

export const STORAGE_KEY = 'volleytag-pro-match-data-v1';

// 產生 UUID 的安全函式
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try {
            return crypto.randomUUID();
        } catch (e) {
            // fallback
        }
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const POSITIONS: Zone[] = [4, 3, 2, 5, 6, 1]; 
const AWAY_POSITIONS: Zone[] = [5, 6, 1, 4, 3, 2]; 

const ROLES: { id: PlayerRole; label: string }[] = [
  { id: 'OH', label: '大砲 (OH)' },
  { id: 'MB', label: '快攻 (MB)' },
  { id: 'OP', label: '舉對 (OP)' },
  { id: 'S', label: '舉球 (S)' },
  { id: 'L', label: '自由 (L)' },
  { id: 'DS', label: '防守 (DS)' },
  { id: '?', label: '未定' },
];

const SKILLS: { id: SkillType; label: string; color: string }[] = [
  { id: 'Serve', label: '發球', color: 'bg-blue-600' },
  { id: 'Receive', label: '接發', color: 'bg-amber-600' },
  { id: 'Set', label: '舉球', color: 'bg-yellow-500' },
  { id: 'Attack', label: '攻擊', color: 'bg-red-600' },
  { id: 'Block', label: '攔網', color: 'bg-purple-600' },
  { id: 'Dig', label: '防守', color: 'bg-emerald-600' },
  { id: 'Freeball', label: '修正', color: 'bg-cyan-600' },
  { id: 'Fault', label: '失誤', color: 'bg-slate-600' },
  { id: 'Substitution', label: '換人', color: 'bg-slate-500' },
];

const GRADES: { id: GradeType; label: string; color: string }[] = [
  { id: '#', label: '完美', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: '+', label: '到位', color: 'bg-green-100 text-green-800 border-green-300' },
  { id: '!', label: '普通', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { id: '-', label: '處理', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { id: '=', label: '失誤', color: 'bg-red-100 text-red-800 border-red-300' },
];

const ATTACK_SUBTYPES: {id: SkillSubType, label: string, color: string}[] = [
    {id: 'Open', label: '長攻', color: 'bg-red-500'}, 
    {id: 'QuickA', label: 'A快 (前快)', color: 'bg-orange-500'}, 
    {id: 'QuickB', label: 'B快 (前長)', color: 'bg-orange-500'},
    {id: 'QuickC', label: 'C快 (背快)', color: 'bg-orange-500'}, 
    {id: 'BackRow', label: '後排', color: 'bg-rose-500'}, 
    {id: 'Tip', label: '吊球', color: 'bg-pink-500'},
    {id: 'Tool', label: '打手', color: 'bg-red-400'}
];

const SERVE_SUBTYPES: {id: SkillSubType, label: string, color: string}[] = [
    {id: 'Float', label: '飄球', color: 'bg-sky-500'}, 
    {id: 'Spin', label: '強發', color: 'bg-blue-700'}
];

const FAULT_SUBTYPES: {id: SkillSubType, label: string, color: string}[] = [
    {id: 'NetTouch', label: '觸網', color: 'bg-slate-500'}, 
    {id: 'DoubleHit', label: '連擊', color: 'bg-slate-500'}, 
    {id: 'Violation', label: '違例', color: 'bg-slate-500'},
    {id: 'Out', label: '出界', color: 'bg-slate-500'},
    {id: 'Carry', label: '持球', color: 'bg-slate-500'},
    {id: 'Rotation', label: '輪轉', color: 'bg-slate-500'}
];

const SET_SUBTYPES: {id: SkillSubType, label: string, color: string}[] = [
    {id: 'SetA', label: 'A快 (前快)', color: 'bg-yellow-600'},
    {id: 'SetB', label: 'B快 (前長)', color: 'bg-yellow-600'},
    {id: 'SetC', label: 'C快 (背快)', color: 'bg-yellow-600'},
    {id: 'SetOpen', label: '長攻', color: 'bg-yellow-500'},
    {id: 'SetSlide', label: '背飛', color: 'bg-amber-500'}
];

// --- Helper Functions ---
const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg z-[100] animate-fade-in-down flex items-center gap-2">
        <AlertTriangle size={20} className="text-yellow-400" />
        <span className="font-bold">{message}</span>
    </div>
);

const ResetModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]">
        <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center">
            <AlertTriangle size={64} className="mx-auto text-red-500 mb-6" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">確定要開新比賽？</h2>
            <p className="text-slate-600 mb-8 font-bold">此動作將會清除所有紀錄、名單與設定，且無法復原。</p>
            <div className="flex gap-4 justify-center">
                <button onClick={onCancel} className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-lg">取消</button>
                <button onClick={onConfirm} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-lg shadow-lg shadow-red-200">確定重置</button>
            </div>
        </div>
    </div>
);

const LogModal = ({ events, metadata, onClose, onDelete }: { events: TagEvent[], metadata: MatchMetadata, onClose: () => void, onDelete: (id: string) => void }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150]">
            <div className="bg-white rounded-xl w-[800px] h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-bold flex items-center gap-2"><ScrollText /> 比賽紀錄明細 (Match Logs)</h3>
                    <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded"><X size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                    {events.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <ScrollText size={48} className="mb-2 opacity-50" />
                            <p>尚無紀錄</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10 font-bold shadow-sm text-sm">
                                <tr>
                                    <th className="p-3 border-b text-center w-16">局</th>
                                    <th className="p-3 border-b w-24">時間</th>
                                    <th className="p-3 border-b w-32">隊伍</th>
                                    <th className="p-3 border-b w-16 text-center">背號</th>
                                    <th className="p-3 border-b">動作</th>
                                    <th className="p-3 border-b w-20 text-center">結果</th>
                                    <th className="p-3 border-b w-16 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.slice().reverse().map((e, idx) => {
                                    const teamName = e.team === 'Home' ? metadata.homeTeam.name : metadata.awayTeam.name;
                                    const skillLabel = SKILLS.find(s => s.id === e.skill)?.label || e.skill;
                                    const subTypeLabel = e.subType ? ([...ATTACK_SUBTYPES, ...SERVE_SUBTYPES, ...FAULT_SUBTYPES, ...SET_SUBTYPES].find(s=>s.id===e.subType)?.label) : '';
                                    return (
                                        <tr key={e.id} className="border-b hover:bg-slate-50 text-sm">
                                            <td className="p-3 text-center font-bold text-slate-500">{e.set}</td>
                                            <td className="p-3 text-slate-500 font-mono">{e.matchTimeFormatted || '-'}</td>
                                            <td className={`p-3 font-bold ${e.team==='Home'?'text-blue-600':'text-red-600'}`}>{teamName}</td>
                                            <td className="p-3 text-center font-black">{e.playerNumber}</td>
                                            <td className="p-3">
                                                <span className="font-bold text-slate-700">{skillLabel}</span>
                                                {subTypeLabel && <span className="text-slate-400 text-xs ml-2">({subTypeLabel})</span>}
                                                {e.grade && <span className="ml-2 bg-slate-200 px-1 rounded text-xs">{e.grade}</span>}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${e.result==='Point'?'bg-green-100 text-green-700':e.result==='Error'?'bg-red-100 text-red-700':'bg-slate-100 text-slate-600'}`}>
                                                    {e.result === 'Point' ? '得分' : e.result === 'Error' ? '失誤' : '繼續'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button 
                                                    onClick={() => onDelete(e.id)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                    title="刪除 (無需確認)"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

const SubstitutionModal = ({ team, lineup, metadata, onClose, onConfirm }: any) => {
    const [outPlayer, setOutPlayer] = useState<Player|null>(null);
    const [inPlayer, setInPlayer] = useState<Player|null>(null);
    
    const roster = team === 'Home' ? metadata.homeTeam.roster : metadata.awayTeam.roster;
    const currentLineup = team === 'Home' ? lineup.home : lineup.away;
    const onCourtIds = Object.values(currentLineup).filter(p => p).map((p: any) => p.id);
    
    const starters = Object.values(currentLineup).filter((p): p is Player => p !== null).sort((a,b) => parseInt(a.number)-parseInt(b.number));
    const bench = roster.filter((p: Player) => !onCourtIds.includes(p.id)).sort((a: Player, b: Player) => parseInt(a.number)-parseInt(b.number));

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150]">
            <div className="bg-white rounded-xl w-[600px] overflow-hidden flex flex-col max-h-[80vh]">
                <div className={`p-4 text-white font-bold text-xl flex justify-between items-center ${team==='Home'?'bg-blue-600':'bg-red-600'}`}>
                    <span>{team === 'Home' ? metadata.homeTeam.name : metadata.awayTeam.name} - 換人</span>
                    <button onClick={onClose}>✕</button>
                </div>
                <div className="flex-1 overflow-auto p-6 grid grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-bold text-slate-500 mb-3 text-center">下場球員 (OUT)</h4>
                        <div className="space-y-2">
                            {starters.map(p => (
                                <button key={p.id} onClick={() => setOutPlayer(p)} className={`w-full p-3 rounded border font-bold flex items-center justify-between ${outPlayer?.id===p.id ? 'bg-red-50 border-red-500 ring-2 ring-red-200' : 'bg-white hover:bg-slate-50'}`}>
                                    <span className="bg-slate-800 text-white w-8 h-8 rounded flex items-center justify-center">{p.number}</span>
                                    <span>{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-500 mb-3 text-center">上場球員 (IN)</h4>
                        <div className="space-y-2">
                            {bench.map(p => (
                                <button key={p.id} onClick={() => setInPlayer(p)} className={`w-full p-3 rounded border font-bold flex items-center justify-between ${inPlayer?.id===p.id ? 'bg-green-50 border-green-500 ring-2 ring-green-200' : 'bg-white hover:bg-slate-50'}`}>
                                    <span className="bg-slate-800 text-white w-8 h-8 rounded flex items-center justify-center">{p.number}</span>
                                    <span>{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded">取消</button>
                    <button disabled={!outPlayer || !inPlayer} onClick={() => onConfirm(team, outPlayer, inPlayer)} className="px-6 py-2 bg-slate-800 text-white font-bold rounded disabled:opacity-50 hover:bg-slate-700">確認換人</button>
                </div>
            </div>
        </div>
    );
};

const MapLegend = () => (
    <div id="printable-legend" className="flex items-center justify-center gap-6 pb-2">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white ring-1 ring-green-600 shadow-sm"></div><span className="text-sm font-bold text-slate-600">得分 (Point)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white ring-1 ring-red-600 shadow-sm"></div><span className="text-sm font-bold text-slate-600">失誤 (Error)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white ring-1 ring-blue-600 shadow-sm"></div><span className="text-sm font-bold text-slate-600">發球失誤 (Serve Err)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white ring-1 ring-yellow-600 shadow-sm"></div><span className="text-sm font-bold text-slate-600">接發球 (Receive)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white ring-1 ring-gray-500 shadow-sm"></div><span className="text-sm font-bold text-slate-600">繼續 (Continue)</span></div>
    </div>
);

const StatsDashboard = ({ metadata, events, onClose, currentScore }: any) => {
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<TeamSide | null>(null);
    const [viewMode, setViewMode] = useState<'MatchSummary' | 'TeamStats' | 'PlayerStats' | 'MatchReport'>('MatchSummary');

    useEffect(() => {
        if (selectedPlayerId) {
            setViewMode('PlayerStats');
            setSelectedTeam(null);
        } else if (selectedTeam) {
            setViewMode('TeamStats');
            setSelectedPlayerId(null);
        } else if (viewMode !== 'MatchReport') {
            setViewMode('MatchSummary');
        }
    }, [selectedPlayerId, selectedTeam]);

    const setScores = useMemo(() => {
        const scores: { set: number, home: number, away: number }[] = [];
        const maxSet = Math.max(...events.map((e:TagEvent) => e.set), 1);
        
        for (let s = 1; s <= maxSet; s++) {
            let h = 0, a = 0;
            events.filter((e: TagEvent) => e.set === s).forEach((e: TagEvent) => {
                if (e.result === 'Point') e.team === 'Home' ? h++ : a++;
                if (e.result === 'Error') e.team === 'Home' ? a++ : h++;
            });
            scores.push({ set: s, home: h, away: a });
        }
        return scores;
    }, [events]);

    const summary = useMemo(() => {
        const stats = { Home: { points: 0, attackKills: 0, blocks: 0, aces: 0, opErrors: 0, selfErrors: 0 }, Away: { points: 0, attackKills: 0, blocks: 0, aces: 0, opErrors: 0, selfErrors: 0 } };
        events.forEach((e: TagEvent) => {
            const side = e.team;
            if (e.result === 'Point') {
                stats[side].points++;
                if (e.skill === 'Attack') stats[side].attackKills++;
                if (e.skill === 'Block') stats[side].blocks++;
                if (e.skill === 'Serve') stats[side].aces++;
            } else if (e.result === 'Error') {
                stats[side].selfErrors++;
                const opSide = side === 'Home' ? 'Away' : 'Home';
                stats[opSide].points++;
                stats[opSide].opErrors++;
            }
        });
        return stats;
    }, [events]);

    const filteredEvents = useMemo(() => {
        if (viewMode === 'PlayerStats' && selectedPlayerId) {
            return events.filter((e: TagEvent) => {
                const p = e.team === 'Home' ? metadata.homeTeam.roster.find((rp: Player) => rp.id === selectedPlayerId) : metadata.awayTeam.roster.find((rp: Player) => rp.id === selectedPlayerId);
                return p && e.playerNumber === p.number && e.team === (e.team === 'Home' ? 'Home' : 'Away'); 
            });
        } else if (viewMode === 'TeamStats' && selectedTeam) {
            return events.filter((e: TagEvent) => e.team === selectedTeam);
        }
        return [];
    }, [events, viewMode, selectedPlayerId, selectedTeam, metadata]);

    const calculateStats = (evs: TagEvent[]) => {
        let points = 0, errors = 0, attacks = 0, kills = 0, aces = 0, digs = 0, blocks = 0;
        evs.forEach(e => {
            if (e.result === 'Point') points++;
            if (e.result === 'Error') errors++;
            if (e.skill === 'Attack') { attacks++; if (e.result === 'Point') kills++; }
            if (e.skill === 'Serve' && e.result === 'Point') aces++;
            if (e.skill === 'Dig') digs++;
            if (e.skill === 'Block' && e.result === 'Point') blocks++;
        });
        return { points, errors, attacks, kills, aces, digs, blocks };
    };

    const currentStats = calculateStats(filteredEvents);

    const getHeatmapData = (skill: SkillType, teamSide?: TeamSide) => {
        let sourceEvents = events;
        if (viewMode === 'MatchSummary' && teamSide) {
             sourceEvents = events.filter((e: TagEvent) => e.team === teamSide);
        } else if (viewMode !== 'MatchSummary') {
             sourceEvents = filteredEvents;
        }

        const skillEvents = sourceEvents.filter((e: TagEvent) => e.skill === skill);
        
        const points = skillEvents
            .filter(e => e.endCoordinate && !e.startCoordinate)
            .map(e => ({ ...e.endCoordinate!, result: e.result, skill: e.skill })); 
            
        const trajectories = skillEvents
            .filter(e => e.startCoordinate && e.endCoordinate)
            .map(e => ({ start: e.startCoordinate!, end: e.endCoordinate!, result: e.result, skill: e.skill }));

        return { points, trajectories };
    };

    const renderNumericComparison = (label: string, homeVal: number, awayVal: number) => (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div className="text-2xl font-black text-blue-600 w-16 text-center">{homeVal}</div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-black text-red-600 w-16 text-center">{awayVal}</div>
        </div>
    );

    const activeTeamName = selectedTeam 
        ? (selectedTeam === 'Home' ? metadata.homeTeam.name : metadata.awayTeam.name)
        : (selectedPlayerId && metadata.homeTeam.roster.some((p:Player)=>p.id===selectedPlayerId) ? metadata.homeTeam.name : metadata.awayTeam.name);
    
    const activePlayer = selectedPlayerId 
        ? (metadata.homeTeam.roster.find((p:Player)=>p.id===selectedPlayerId) || metadata.awayTeam.roster.find((p:Player)=>p.id===selectedPlayerId)) 
        : null;

    const handlePrint = (title: string, elementId: string, stats?: any) => {
        const content = document.getElementById(elementId);
        const legend = document.getElementById('printable-legend');
        if (!content || !legend) return;

        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;

        const statsHtml = stats ? `
            <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 30px; border: 4px solid #ccc; padding: 25px; border-radius: 16px; background-color: #f9fafb; width: 100%;">
                <div style="text-align: center;"><div style="font-size: 18px; color: #666; font-weight: bold; margin-bottom: 5px;">總得分</div><div style="font-size: 48px; font-weight: 900; color: #333;">${stats.points}</div></div>
                <div style="text-align: center;"><div style="font-size: 18px; color: #666; font-weight: bold; margin-bottom: 5px;">總失誤</div><div style="font-size: 48px; font-weight: 900; color: #ef4444;">${stats.errors}</div></div>
                <div style="text-align: center;"><div style="font-size: 18px; color: #666; font-weight: bold; margin-bottom: 5px;">攻擊效率</div><div style="font-size: 48px; font-weight: 900; color: #3b82f6;">${stats.attacks > 0 ? Math.round(((stats.kills - stats.errors)/stats.attacks)*100)+'%' : '-'}</div></div>
                <div style="text-align: center;"><div style="font-size: 18px; color: #666; font-weight: bold; margin-bottom: 5px;">發球得分</div><div style="font-size: 48px; font-weight: 900; color: #333;">${stats.aces}</div></div>
                <div style="text-align: center;"><div style="font-size: 18px; color: #666; font-weight: bold; margin-bottom: 5px;">攔網得分</div><div style="font-size: 48px; font-weight: 900; color: #3b82f6;">${stats.blocks}</div></div>
            </div>
        ` : '';

        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @page { size: A4; margin: 10mm; }
                        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 20px; display: flex; flex-direction: column; align-items: center; }
                        h1 { text-align: center; margin-bottom: 20px; font-weight: 900; font-size: 48px !important; line-height: 1.1; color: #000; }
                        .legend-container { margin-bottom: 20px; transform: scale(1.5); }
                        .stats-container { width: 95%; max-width: 900px; margin-bottom: 30px; }
                        .print-content { width: 100%; height: 200mm; position: relative; page-break-inside: avoid; border: 4px solid #ddd; border-radius: 12px; overflow: hidden; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    </style>
                </head>
                <body class="bg-white">
                    <h1>${title}</h1>
                    <div class="legend-container">
                        ${legend.outerHTML}
                    </div>
                    <div class="stats-container">
                        ${statsHtml}
                    </div>
                    <div class="print-content">
                        ${content.innerHTML}
                    </div>
                    <script>
                        setTimeout(() => { window.print(); window.close(); }, 1500);
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const report = useMemo(() => {
        const home = summary.Home;
        const away = summary.Away;
        const winner = home.points > away.points ? metadata.homeTeam.name : (away.points > home.points ? metadata.awayTeam.name : '平手');
        
        const findMVP = (team: TeamSide) => {
            const roster = team === 'Home' ? metadata.homeTeam.roster : metadata.awayTeam.roster;
            let bestPlayer = null;
            let maxPoints = -1;
            roster.forEach((p: Player) => {
                const s = calculateStats(events.filter((e:TagEvent) => e.team === team && e.playerNumber === p.number));
                if(s.points > maxPoints) { maxPoints = s.points; bestPlayer = { ...p, stats: s }; }
            });
            return bestPlayer;
        };
        const homeMVP = findMVP('Home');
        const awayMVP = findMVP('Away');

        const getEff = (side: TeamSide) => {
            const evs = events.filter((e: TagEvent) => e.team === side && e.skill === 'Attack');
            const k = evs.filter((e:TagEvent)=>e.result==='Point').length;
            const err = evs.filter((e:TagEvent)=>e.result==='Error').length;
            const total = evs.length;
            return total > 0 ? Math.round(((k-err)/total)*100) : 0;
        };
        const homeEff = getEff('Home');
        const awayEff = getEff('Away');

        return {
            winner,
            homeMVP,
            awayMVP,
            homeEff,
            awayEff,
            homeWeakness: home.selfErrors > 10 ? '失誤過多，需加強穩定性' : home.blocks < 3 ? '攔網得分較少，需加強網前防守' : '表現尚可，保持節奏',
            awayWeakness: away.selfErrors > 10 ? '失誤過多，需加強穩定性' : away.blocks < 3 ? '攔網得分較少，需加強網前防守' : '表現尚可，保持節奏'
        };
    }, [summary, events, metadata]);

    return (
        <div className="absolute inset-0 bg-slate-50 z-[60] flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
                <h2 className="text-xl font-bold flex items-center gap-2"><BarChart2 /> 數據分析儀表板</h2>
                <div className="flex gap-4">
                    <button onClick={() => { setSelectedPlayerId(null); setSelectedTeam(null); setViewMode('MatchReport'); }} className={`px-4 py-2 rounded font-bold text-sm ${viewMode === 'MatchReport' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}><span className="flex items-center gap-1"><ClipboardList size={16}/> 賽後報告</span></button>
                    <button onClick={() => { setSelectedPlayerId(null); setSelectedTeam(null); setViewMode('MatchSummary'); }} className={`px-4 py-2 rounded font-bold text-sm ${viewMode === 'MatchSummary' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>比賽總結</button>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm">返回比賽</button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                <div className="w-64 bg-white border-r flex flex-col overflow-y-auto">
                    <button onClick={() => setSelectedTeam('Home')} className={`p-4 font-black text-lg border-b text-center hover:bg-blue-50 ${selectedTeam === 'Home' ? 'bg-blue-100 text-blue-800' : 'text-blue-600'}`}>{metadata.homeTeam.name}</button>
                    {metadata.homeTeam.roster.map((p: Player) => (
                        <button key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={`p-3 border-b flex items-center gap-3 hover:bg-slate-50 ${selectedPlayerId === p.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                            <span className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-sm">{p.number}</span>
                            <span className="font-bold text-slate-700 text-sm truncate">{p.name}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-slate-100 p-6 overflow-y-auto">
                    {viewMode === 'MatchReport' ? (
                        <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg print:shadow-none">
                            <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
                                <h1 className="text-3xl font-black text-slate-900 mb-2">排球賽後分析報告</h1>
                                <div className="text-slate-500 font-bold">{metadata.tournament} | {metadata.date}</div>
                                <div className="mt-4 text-xl font-bold flex justify-center gap-4 items-center">
                                    <span className="text-blue-600">{metadata.homeTeam.name}</span>
                                    <span className="bg-slate-800 text-white px-3 py-1 rounded">{summary.Home.points} - {summary.Away.points}</span>
                                    <span className="text-red-600">{metadata.awayTeam.name}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                    <h3 className="text-xl font-black text-blue-800 mb-4 flex items-center gap-2"><Activity size={20}/> {metadata.homeTeam.name} 表現</h3>
                                    <ul className="space-y-3 text-slate-700">
                                        <li className="flex justify-between border-b border-blue-200 pb-1"><span>攻擊效率</span> <span className="font-bold">{report.homeEff}%</span></li>
                                        <li className="flex justify-between border-b border-blue-200 pb-1"><span>總失誤</span> <span className="font-bold text-red-600">{summary.Home.selfErrors}</span></li>
                                        <li className="flex justify-between border-b border-blue-200 pb-1"><span>發球得分</span> <span className="font-bold">{summary.Home.aces}</span></li>
                                        <li className="pt-2"><span className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded font-bold mr-2">MVP</span> <span className="font-bold">{report.homeMVP ? `#${report.homeMVP.number} ${report.homeMVP.name} (${report.homeMVP.stats.points}分)` : '無'}</span></li>
                                    </ul>
                                </div>
                                <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                                    <h3 className="text-xl font-black text-red-800 mb-4 flex items-center gap-2"><Activity size={20}/> {metadata.awayTeam.name} 表現</h3>
                                    <ul className="space-y-3 text-slate-700">
                                        <li className="flex justify-between border-b border-red-200 pb-1"><span>攻擊效率</span> <span className="font-bold">{report.awayEff}%</span></li>
                                        <li className="flex justify-between border-b border-red-200 pb-1"><span>總失誤</span> <span className="font-bold text-red-600">{summary.Away.selfErrors}</span></li>
                                        <li className="flex justify-between border-b border-red-200 pb-1"><span>發球得分</span> <span className="font-bold">{summary.Away.aces}</span></li>
                                        <li className="pt-2"><span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded font-bold mr-2">MVP</span> <span className="font-bold">{report.awayMVP ? `#${report.awayMVP.number} ${report.awayMVP.name} (${report.awayMVP.stats.points}分)` : '無'}</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : viewMode === 'MatchSummary' ? (
                        <div className="max-w-5xl mx-auto space-y-6">
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                <table className="w-full text-center">
                                    <thead className="bg-slate-900 text-white text-sm">
                                        <tr>
                                            <th className="p-3 text-left w-48">隊伍</th>
                                            {[1,2,3,4,5].map(s => <th key={s} className="p-3 w-16">Set {s}</th>)}
                                            <th className="p-3 w-20 bg-slate-800">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-bold text-lg">
                                        <tr className="border-b">
                                            <td className="p-3 text-left text-blue-600">{metadata.homeTeam.name}</td>
                                            {[1,2,3,4,5].map(s => {
                                                const score = setScores.find(sc => sc.set === s);
                                                return <td key={s} className="p-3 text-slate-700">{score ? score.home : '-'}</td>
                                            })}
                                            <td className="p-3 bg-slate-100 text-blue-800">{summary.Home.points}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 text-left text-red-600">{metadata.awayTeam.name}</td>
                                            {[1,2,3,4,5].map(s => {
                                                const score = setScores.find(sc => sc.set === s);
                                                return <td key={s} className="p-3 text-slate-700">{score ? score.away : '-'}</td>
                                            })}
                                            <td className="p-3 bg-slate-100 text-red-800">{summary.Away.points}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm">
                                <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">攻守數據對比</h3>
                                <div className="max-w-2xl mx-auto">
                                    {renderNumericComparison("總得分 (Points)", summary.Home.points, summary.Away.points)}
                                    {renderNumericComparison("攻擊得分 (Kills)", summary.Home.attackKills, summary.Away.attackKills)}
                                    {renderNumericComparison("攔網得分 (Blocks)", summary.Home.blocks, summary.Away.blocks)}
                                    {renderNumericComparison("發球得分 (Aces)", summary.Home.aces, summary.Away.aces)}
                                    {renderNumericComparison("對手失誤贈分 (Op. Err)", summary.Home.opErrors, summary.Away.opErrors)}
                                    {renderNumericComparison("自身總失誤 (Errors)", summary.Home.selfErrors, summary.Away.selfErrors)}
                                </div>
                            </div>
                            <MapLegend />
                            <div className="grid grid-cols-2 gap-6 pb-12">
                                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col h-[600px]">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-blue-700 text-lg">{metadata.homeTeam.name} 攻擊熱區</h3>
                                        <button onClick={() => handlePrint(`${metadata.homeTeam.name} 攻擊熱區`, 'summary-heatmap-home', calculateStats(events.filter(e => e.team === 'Home')))} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="列印熱區"><Printer size={20}/></button>
                                    </div>
                                    <div id="summary-heatmap-home" className="flex-1 border-4 border-slate-300 rounded-xl overflow-hidden bg-orange-50 relative">
                                        <CourtMap label="" trajectoryMode={false} compact heatmapPoints={getHeatmapData('Attack', 'Home').points} trajectories={getHeatmapData('Attack', 'Home').trajectories} netPosition="center" watermark={metadata.homeTeam.name} topWatermark={metadata.awayTeam.name} bottomWatermark={metadata.homeTeam.name} />
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col h-[600px]">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-red-700 text-lg">{metadata.awayTeam.name} 攻擊熱區</h3>
                                        <button onClick={() => handlePrint(`${metadata.awayTeam.name} 攻擊熱區`, 'summary-heatmap-away', calculateStats(events.filter(e => e.team === 'Away')))} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="列印熱區"><Printer size={20}/></button>
                                    </div>
                                    <div id="summary-heatmap-away" className="flex-1 border-4 border-slate-300 rounded-xl overflow-hidden bg-orange-50 relative">
                                        <CourtMap label="" trajectoryMode={false} compact heatmapPoints={getHeatmapData('Attack', 'Away').points} trajectories={getHeatmapData('Attack', 'Away').trajectories} netPosition="center" watermark={metadata.awayTeam.name} topWatermark={metadata.homeTeam.name} bottomWatermark={metadata.awayTeam.name} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto">
                             <div className="flex items-center gap-4 mb-6">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg ${selectedTeam === 'Home' || metadata.homeTeam.roster.some((p:Player)=>p.id===selectedPlayerId) ? 'bg-blue-600' : 'bg-red-600'}`}>
                                    {selectedTeam ? 'T' : (activePlayer?.number || '')}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-800">{activeTeamName}</h2>
                                    <div className="text-slate-500 font-bold">{selectedTeam ? '全隊數據總覽' : activePlayer?.name}</div>
                                </div>
                             </div>

                             <div className="grid grid-cols-4 gap-4 mb-8">
                                <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500"><div className="text-sm text-slate-500 font-bold mb-1">總得分</div><div className="text-3xl font-black text-slate-800">{currentStats.points}</div></div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500"><div className="text-sm text-slate-500 font-bold mb-1">總失誤</div><div className="text-3xl font-black text-slate-800">{currentStats.errors}</div></div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500"><div className="text-sm text-slate-500 font-bold mb-1">攻擊效率</div><div className="text-3xl font-black text-slate-800">{currentStats.attacks > 0 ? Math.round(((currentStats.kills - currentStats.errors)/currentStats.attacks)*100)+'%' : '-'}</div></div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500"><div className="text-sm text-slate-500 font-bold mb-1">攔網得分</div><div className="text-3xl font-black text-slate-800">{currentStats.blocks}</div></div>
                             </div>

                             {selectedTeam && (
                                 <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
                                     <div className="p-4 border-b font-bold bg-slate-50">球員詳細數據表</div>
                                     <table className="w-full text-sm text-left">
                                         <thead className="bg-white text-slate-500">
                                             <tr>
                                                 <th className="p-3"># 姓名</th>
                                                 <th className="p-3 text-center">總得分</th>
                                                 <th className="p-3 text-center">攻擊(得/失)</th>
                                                 <th className="p-3 text-center">攔網得分</th>
                                                 <th className="p-3 text-center">發球得分</th>
                                                 <th className="p-3 text-center">總失誤</th>
                                             </tr>
                                         </thead>
                                         <tbody>
                                             {(selectedTeam === 'Home' ? metadata.homeTeam.roster : metadata.awayTeam.roster).map((p: Player) => {
                                                 const pStats = calculateStats(events.filter((e: TagEvent) => e.playerNumber === p.number && e.team === selectedTeam));
                                                 if (pStats.points === 0 && pStats.errors === 0 && pStats.attacks === 0 && pStats.digs === 0) return null;
                                                 return (
                                                     <tr key={p.id} className="border-t hover:bg-slate-50">
                                                         <td className="p-3 font-bold"><span className={`inline-block w-6 h-6 text-center leading-6 text-white rounded mr-2 ${selectedTeam==='Home'?'bg-blue-600':'bg-red-600'}`}>{p.number}</span>{p.name}</td>
                                                         <td className="p-3 text-center font-black">{pStats.points}</td>
                                                         <td className="p-3 text-center">{pStats.kills} / <span className="text-red-500">{pStats.errors}</span></td>
                                                         <td className="p-3 text-center">{pStats.blocks}</td>
                                                         <td className="p-3 text-center">{pStats.aces}</td>
                                                         <td className="p-3 text-center text-red-600 font-bold">{pStats.errors}</td>
                                                     </tr>
                                                 );
                                             })}
                                         </tbody>
                                     </table>
                                 </div>
                             )}

                             <MapLegend />
                             <div className="grid grid-cols-2 gap-6 pb-12">
                                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col h-[600px]">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-slate-700 text-lg">發球落點 (Serve)</h3>
                                        <button onClick={() => {
                                            const title = activePlayer 
                                                ? `${activeTeamName} #${activePlayer.number} ${activePlayer.name} 發球落點`
                                                : `${activeTeamName} 發球落點`;
                                            handlePrint(title, 'single-heatmap-serve', currentStats);
                                        }} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="列印熱區"><Printer size={20}/></button>
                                    </div>
                                    <div id="single-heatmap-serve" className="flex-1 border-4 border-slate-300 rounded-xl overflow-hidden bg-orange-50 relative">
                                        <CourtMap label="" trajectoryMode={false} compact heatmapPoints={getHeatmapData('Serve').points} trajectories={getHeatmapData('Serve').trajectories} netPosition="center" watermark={activeTeamName} topWatermark={selectedTeam === 'Home' ? metadata.awayTeam.name : metadata.homeTeam.name} bottomWatermark={activeTeamName} />
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col h-[600px]">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-slate-700 text-lg">攻擊落點 (Attack)</h3>
                                        <button onClick={() => {
                                            const title = activePlayer 
                                                ? `${activeTeamName} #${activePlayer.number} ${activePlayer.name} 攻擊落點`
                                                : `${activeTeamName} 攻擊落點`;
                                            handlePrint(title, 'single-heatmap-attack', currentStats);
                                        }} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="列印熱區"><Printer size={20}/></button>
                                    </div>
                                    <div id="single-heatmap-attack" className="flex-1 border-4 border-slate-300 rounded-xl overflow-hidden bg-orange-50 relative">
                                        <CourtMap label="" trajectoryMode={false} compact heatmapPoints={getHeatmapData('Attack').points} trajectories={getHeatmapData('Attack').trajectories} netPosition="center" watermark={activeTeamName} topWatermark={selectedTeam === 'Home' ? metadata.awayTeam.name : metadata.homeTeam.name} bottomWatermark={activeTeamName} />
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>

                <div className="w-64 bg-white border-l flex flex-col overflow-y-auto">
                    <button onClick={() => setSelectedTeam('Away')} className={`p-4 font-black text-lg border-b text-center hover:bg-red-50 ${selectedTeam === 'Away' ? 'bg-red-100 text-red-800' : 'text-red-600'}`}>{metadata.awayTeam.name}</button>
                    {metadata.awayTeam.roster.map((p: Player) => (
                        <button key={p.id} onClick={() => setSelectedPlayerId(p.id)} className={`p-3 border-b flex items-center gap-3 hover:bg-slate-50 ${selectedPlayerId === p.id ? 'bg-red-50 border-l-4 border-l-red-500' : ''}`}>
                            <span className="w-8 h-8 rounded bg-red-600 text-white flex items-center justify-center font-bold text-sm">{p.number}</span>
                            <span className="font-bold text-slate-700 text-sm truncate">{p.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Setup Component ---

const SetupScreen = ({ onStart }: { onStart: (meta: MatchMetadata, lineup: Lineup) => void }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [tournament, setTournament] = useState('');
    const [homeName, setHomeName] = useState('Home Team');
    const [awayName, setAwayName] = useState('Away Team');

    const handleStart = () => {
        const createDummyRoster = (count: number) => Array.from({length: count}, (_, i) => ({
            id: generateUUID(),
            number: (i + 1).toString(),
            name: `Player ${i + 1}`,
            role: '?' as PlayerRole
        }));

        const homeRoster = createDummyRoster(12);
        const awayRoster = createDummyRoster(12);

        const meta: MatchMetadata = {
            date,
            tournament,
            homeTeam: { name: homeName, roster: homeRoster },
            awayTeam: { name: awayName, roster: awayRoster }
        };

        const initialLineup: Lineup = {
            home: { 1: homeRoster[0], 2: homeRoster[1], 3: homeRoster[2], 4: homeRoster[3], 5: homeRoster[4], 6: homeRoster[5], L: null },
            away: { 1: awayRoster[0], 2: awayRoster[1], 3: awayRoster[2], 4: awayRoster[3], 5: awayRoster[4], 6: awayRoster[5], L: null },
        };

        onStart(meta, initialLineup);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
                <h1 className="text-3xl font-black text-slate-800 mb-6 text-center">開始新比賽</h1>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">比賽日期</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 bg-slate-100 rounded-lg font-bold text-slate-800" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">盃賽名稱</label>
                        <input type="text" value={tournament} onChange={e => setTournament(e.target.value)} placeholder="例：大專盃複賽" className="w-full p-3 bg-slate-100 rounded-lg font-bold text-slate-800" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-blue-600 mb-1">主隊名稱 (Home)</label>
                            <input type="text" value={homeName} onChange={e => setHomeName(e.target.value)} className="w-full p-3 bg-blue-50 border-2 border-blue-100 rounded-lg font-bold text-slate-800 focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-red-600 mb-1">客隊名稱 (Away)</label>
                            <input type="text" value={awayName} onChange={e => setAwayName(e.target.value)} className="w-full p-3 bg-red-50 border-2 border-red-100 rounded-lg font-bold text-slate-800 focus:border-red-500 outline-none" />
                        </div>
                    </div>
                    <button onClick={handleStart} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-lg shadow-lg transition-all mt-4">
                        建立比賽
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---

const VolleyTagApp = ({ user, onLogout, onResetApp }: { user: User | null, onLogout: () => void, onResetApp: () => void }) => {
    const [metadata, setMetadata] = useState<MatchMetadata | null>(null);
    const [events, setEvents] = useState<TagEvent[]>([]);
    const [lineup, setLineup] = useState<Lineup | null>(null);
    const [currentTime, setCurrentTime] = useState(0);

    // Initial Load
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.metadata) setMetadata(parsed.metadata);
                if (parsed.events) setEvents(parsed.events);
                if (parsed.lineup) setLineup(parsed.lineup);
            } catch (e) {
                console.error("Failed to load saved match", e);
            }
        }
    }, []);

    // Save on Change
    useEffect(() => {
        if (metadata) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ metadata, events, lineup }));
        }
    }, [metadata, events, lineup]);

    const handleReset = () => {
        setMetadata(null);
        setEvents([]);
        setLineup(null);
        localStorage.removeItem(STORAGE_KEY);
        onResetApp();
    };

    if (!metadata) {
        return <SetupScreen onStart={(meta, lu) => { setMetadata(meta); setLineup(lu); }} />;
    }

    return (
        <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
             {/* Simple Header for Demo */}
             <div className="bg-slate-900 text-white p-2 flex justify-between items-center shadow">
                <div className="font-bold flex items-center gap-4">
                    <span className="text-blue-400">{metadata.homeTeam.name}</span>
                    <span>VS</span>
                    <span className="text-red-400">{metadata.awayTeam.name}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleReset} className="px-3 py-1 text-sm bg-red-800 rounded">重置比賽</button>
                    <button onClick={onLogout} className="px-3 py-1 text-sm bg-slate-700 rounded">登出</button>
                </div>
             </div>
             
             {/* Main Content Area */}
             <div className="flex-1 flex overflow-hidden">
                {/* Left: Video */}
                <div className="w-1/2 border-r border-slate-300 bg-black">
                     <VideoPlayer onTimeUpdate={setCurrentTime} videoRef={useRef<HTMLVideoElement>(null)} isActive={true} />
                </div>
                
                {/* Right: Map & Stats Placeholder */}
                <div className="w-1/2 flex flex-col bg-white">
                     <div className="flex-1 relative">
                        <CourtMap label="即時記錄" colorClass="bg-orange-50" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="bg-white/80 p-4 rounded text-slate-500 font-bold">點擊球場進行記錄 (Tagging Mode)</p>
                        </div>
                     </div>
                     <div className="h-1/3 border-t p-4 overflow-y-auto">
                        <h3 className="font-bold text-slate-700 mb-2">最近事件</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500">
                                    <th>時間</th><th>隊伍</th><th>球員</th><th>動作</th><th>結果</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.slice(-5).reverse().map(e => (
                                    <tr key={e.id} className="border-t">
                                        <td>{e.matchTimeFormatted}</td>
                                        <td>{e.team === 'Home' ? '主' : '客'}</td>
                                        <td>#{e.playerNumber}</td>
                                        <td>{e.skill}</td>
                                        <td>{e.result}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                </div>
             </div>
             
             {/* Floating Dashboard Button */}
             <button 
                onClick={() => setMetadata({...metadata})} // Force re-render/open logic in real app
                className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform"
             >
                <BarChart2 />
             </button>

             {/* Stats Dashboard Overlay (Conditional) */}
             {false && <StatsDashboard metadata={metadata} events={events} onClose={() => {}} currentScore={{home:0, away:0}} />}
        </div>
    );
};

export default VolleyTagApp;
