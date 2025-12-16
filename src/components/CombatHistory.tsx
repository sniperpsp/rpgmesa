"use client";
import { useState } from "react";

interface CombatAction {
    id: string;
    timestamp: Date;
    type: 'attack' | 'damage' | 'heal' | 'status' | 'turn';
    actor: string;
    target?: string;
    details: string;
    result?: 'success' | 'fail' | 'critical';
}

interface CombatHistoryProps {
    actions: CombatAction[];
}

export function CombatHistory({ actions }: CombatHistoryProps) {
    const [expanded, setExpanded] = useState(true);
    const [filter, setFilter] = useState<'all' | 'attacks' | 'damage' | 'status'>('all');

    const filteredActions = actions.filter(action => {
        if (filter === 'all') return true;
        if (filter === 'attacks') return action.type === 'attack';
        if (filter === 'damage') return action.type === 'damage' || action.type === 'heal';
        if (filter === 'status') return action.type === 'status';
        return true;
    });

    const getActionIcon = (type: string, result?: string) => {
        if (type === 'attack') {
            if (result === 'critical') return '💥';
            if (result === 'success') return '⚔️';
            if (result === 'fail') return '❌';
            return '⚔️';
        }
        if (type === 'damage') return '💔';
        if (type === 'heal') return '💚';
        if (type === 'status') return '🔮';
        if (type === 'turn') return '🔄';
        return '📝';
    };

    const getActionColor = (type: string, result?: string) => {
        if (type === 'attack') {
            if (result === 'critical') return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
            if (result === 'success') return 'bg-green-500/10 border-green-500/30 text-green-300';
            if (result === 'fail') return 'bg-red-500/10 border-red-500/30 text-red-300';
        }
        if (type === 'damage') return 'bg-red-500/10 border-red-500/30 text-red-300';
        if (type === 'heal') return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
        if (type === 'status') return 'bg-purple-500/10 border-purple-500/30 text-purple-300';
        if (type === 'turn') return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
        return 'bg-neutral-800/50 border-neutral-700 text-neutral-300';
    };

    return (
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    📜 Histórico de Combate
                    <span className="text-sm text-neutral-500">({filteredActions.length})</span>
                </h3>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-sm px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-all"
                >
                    {expanded ? '▼ Minimizar' : '▶ Expandir'}
                </button>
            </div>

            {expanded && (
                <>
                    {/* Filtros */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 rounded-lg text-sm transition-all ${filter === 'all'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilter('attacks')}
                            className={`px-3 py-1 rounded-lg text-sm transition-all ${filter === 'attacks'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                }`}
                        >
                            ⚔️ Ataques
                        </button>
                        <button
                            onClick={() => setFilter('damage')}
                            className={`px-3 py-1 rounded-lg text-sm transition-all ${filter === 'damage'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                }`}
                        >
                            💔 Dano/Cura
                        </button>
                        <button
                            onClick={() => setFilter('status')}
                            className={`px-3 py-1 rounded-lg text-sm transition-all ${filter === 'status'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                }`}
                        >
                            🔮 Status
                        </button>
                    </div>

                    {/* Lista de ações */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {filteredActions.length === 0 ? (
                            <p className="text-neutral-500 text-center py-8">Nenhuma ação registrada</p>
                        ) : (
                            filteredActions.map((action) => (
                                <div
                                    key={action.id}
                                    className={`p-3 rounded-xl border transition-all hover:scale-[1.02] ${getActionColor(action.type, action.result)}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{getActionIcon(action.type, action.result)}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="font-semibold">
                                                    {action.actor}
                                                    {action.target && ` → ${action.target}`}
                                                </p>
                                                <span className="text-xs opacity-70">
                                                    {new Date(action.timestamp).toLocaleTimeString('pt-BR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-sm opacity-90">{action.details}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
