"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DiceRoller } from "@/components/DiceRoller";
import { TurnNotification } from "@/components/TurnNotification";

interface Room {
    id: string;
    name: string;
    joinCode: string;
    diceSystem?: string;
    rules: string | null;
    gm: {
        displayName: string | null;
        email: string;
    };
    userCharacters: Array<{
        id: string;
        character: {
            id: string;
            name: string;
            class: string | null;
            race: string | null;
            avatarUrl: string | null;
        };
        roomStats: {
            hp: number;
            mana: number;
            forca: number;
            destreza: number;
            inteligencia: number;
            defesa: number;
            velocidade: number;
            // XP System
            level: number;
            xp: number;
            xpToNextLevel: number;
            statPoints: number;
        } | null;
        roomAbilities: Array<{
            id: string;
            name: string;
            description: string | null;
            manaCost: number;
            abilityType?: string;
        }>;
    }>;
    characterRooms: Array<{
        id: string;
        character: {
            id: string;
            name: string;
            class: string | null;
            race: string | null;
        };
    }>;
    encounters?: Array<{
        id: string;
        name: string;
        isActive: boolean;
        participants: Array<{
            id: string;
            name: string;
            hp: number;
            maxHp: number;
            mana: number;
            maxMana: number;
            initiative: number;
            isNPC: boolean;
            statusEffects: any;
        }>;
    }>;
}

export default function PlayerPage() {
    const router = useRouter();
    const params = useParams();
    const code = params.code as string;

    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<Room | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<number>(0);
    const [showAddCharacter, setShowAddCharacter] = useState(false);
    const [myCharacters, setMyCharacters] = useState<any[]>([]);

    // Combat states
    const [combatActions, setCombatActions] = useState<any[]>([]);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const isMyTurnRef = useRef(false); // Ref para ter valor atualizado no setInterval
    const [showAttackModal, setShowAttackModal] = useState(false);
    const [attackTarget, setAttackTarget] = useState<any>(null);
    const [attackType, setAttackType] = useState<'melee' | 'ranged' | 'magic'>('melee');
    const [diceRolled, setDiceRolled] = useState(false);
    const [attackRoll, setAttackRoll] = useState<number | null>(null);
    const [attackResult, setAttackResult] = useState<any>(null);
    const [selectedAttackAbility, setSelectedAttackAbility] = useState<any>(null);

    // Ability states
    const [showAbilityModal, setShowAbilityModal] = useState(false);
    const [selectedAbility, setSelectedAbility] = useState<any>(null);
    const [abilityTarget, setAbilityTarget] = useState<any>(null);
    const [isAttacking, setIsAttacking] = useState(false);

    // Stat distribution states
    const [showStatModal, setShowStatModal] = useState(false);
    const [isDistributing, setIsDistributing] = useState(false);

    useEffect(() => {
        loadRoom();
        loadMyCharacters();

        // Polling LEVE para combat sync - a cada 1 segundo (era 5s)
        const combatInterval = setInterval(loadCombatStatus, 1000);

        // Reload completo da sala a cada 30 segundos
        const fullReloadInterval = setInterval(loadRoom, 30000);

        return () => {
            clearInterval(combatInterval);
            clearInterval(fullReloadInterval);
        };
    }, [code]);

    // Função para polling LEVE - apenas status de combate
    // IMPORTANTE: Não atualiza se for a vez do jogador (evita refresh durante ação)
    async function loadCombatStatus() {
        // Se é minha vez, NÃO atualizar (evita refresh irritante durante combate)
        // Usar REF porque state pode estar desatualizado no setInterval
        if (isMyTurnRef.current) {
            console.log('⏸️ Polling pausado - é minha vez');
            return;
        }

        try {
            const res = await fetch(`/api/rooms/${code}/status?t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();

                // Atualizar apenas os dados de combate se houver encontro ativo
                if (data.activeEncounter) {
                    setRoom((prev: any) => {
                        // Se ainda não temos room carregado, criar estrutura mínima
                        if (!prev) {
                            console.log('⚠️ Room ainda não carregado, criando estrutura mínima para combate');
                            return {
                                encounters: [{
                                    ...data.activeEncounter,
                                    isActive: true,
                                    participants: data.activeEncounter.participants || []
                                }],
                                userCharacters: [],
                                characterRooms: []
                            };
                        }

                        // Atualizar encounters com dados frescos ou adicionar se não existir
                        let found = false;
                        const updatedEncounters = (prev.encounters || []).map((enc: any) => {
                            if (enc.id === data.activeEncounter.id) {
                                found = true;
                                return {
                                    ...enc,
                                    isActive: true,
                                    currentTurnIndex: data.activeEncounter.currentTurnIndex,
                                    participants: data.activeEncounter.participants
                                };
                            }
                            return enc;
                        });

                        if (!found) {
                            console.log('➕ Encontro ativo detectado e adicionado:', data.activeEncounter.name);
                            updatedEncounters.push({
                                ...data.activeEncounter,
                                isActive: true,
                                participants: data.activeEncounter.participants || []
                            });
                        }

                        return { ...prev, encounters: updatedEncounters };
                    });

                    // CRÍTICO: Verificar turno IMEDIATAMENTE com dados frescos
                    // Não esperar pelo useEffect React que adiciona lag de render
                    checkCombatStatusDirect(data.activeEncounter);
                }
            }
        } catch (e) {
            console.error("Erro ao buscar status:", e);
        }
    }

    useEffect(() => {
        if (room && room.userCharacters[selectedCharacter]) {
            checkCombatStatus();
        }
    }, [room, selectedCharacter]);

    // Versão que aceita dados diretamente (chamada síncrona após polling)
    function checkCombatStatusDirect(activeEncounter: any) {
        const currentChar = room?.userCharacters[selectedCharacter];
        if (!currentChar || !activeEncounter) {
            setIsMyTurn(false);
            return;
        }

        // Verificar se o jogador está neste encontro
        const myParticipant = activeEncounter.participants?.find(
            (p: any) => p.name === currentChar.character.name && !p.isNPC
        );

        if (!myParticipant) {
            setIsMyTurn(false);
            return;
        }

        // Ordenar participantes por iniciativa (maior primeiro) e nome (alfabética) para critério de desempate
        const sortedParticipants = [...activeEncounter.participants].sort((a: any, b: any) => {
            if (b.initiative !== a.initiative) return b.initiative - a.initiative;
            return a.name.localeCompare(b.name);
        });

        console.log('⚡ Check DIRETO - Index:', activeEncounter.currentTurnIndex, 'Quem joga:', sortedParticipants[activeEncounter.currentTurnIndex || 0]?.name, 'Sou eu?', sortedParticipants[activeEncounter.currentTurnIndex || 0]?.id === myParticipant.id);

        // Verificar se é realmente o turno do jogador
        const currentTurnIndex = activeEncounter.currentTurnIndex || 0;
        const currentTurnParticipant = sortedParticipants[currentTurnIndex];

        // É o turno do jogador se o participante atual é ele
        const newIsMyTurn = currentTurnParticipant?.id === myParticipant.id;
        setIsMyTurn(newIsMyTurn);
        isMyTurnRef.current = newIsMyTurn; // Atualizar ref também
    }

    // Versão que lê do state (chamada pelo useEffect)
    function checkCombatStatus() {
        const activeEncounter = room?.encounters?.find((e) => e.isActive);
        if (!activeEncounter) {
            setIsMyTurn(false);
            return;
        }
        checkCombatStatusDirect(activeEncounter);
    }

    async function loadRoom() {
        try {
            const res = await fetch(`/api/rooms/${code}?t=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) {
                if (res.status === 401) {
                    router.push("/login");
                    return;
                }
                if (res.status === 403 || res.status === 404) {
                    router.push("/lobby");
                    return;
                }
            }
            const data = await res.json();
            setRoom(data.room);
            setLoading(false);

            // CRÍTICO: Verificar turno imediatamente após carregar sala completa
            const activeEncounter = data.room.encounters?.find((e: any) => e.isActive);
            if (activeEncounter) {
                checkCombatStatusDirect(activeEncounter);
            }
        } catch (e) {
            console.error("Erro ao carregar sala:", e);
            router.push("/lobby");
        }
    }

    async function distributeStat(stat: string) {
        if (!room?.userCharacters[selectedCharacter]?.id) return;

        setIsDistributing(true);
        try {
            const res = await fetch('/api/xp/distribute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterRoomId: room.userCharacters[selectedCharacter].id,
                    stat,
                    points: 1
                })
            });

            if (res.ok) {
                const data = await res.json();
                console.log('✅ Ponto distribuído:', data);
                loadRoom(); // Recarregar para atualizar stats
            } else {
                const err = await res.json();
                alert(err.error || 'Erro ao distribuir ponto');
            }
        } catch (e) {
            console.error('Erro ao distribuir ponto:', e);
            alert('Erro ao distribuir ponto');
        } finally {
            setIsDistributing(false);
        }
    }

    async function loadMyCharacters() {
        try {
            const res = await fetch("/api/characters");
            if (res.ok) {
                const data = await res.json();
                setMyCharacters(data.characters);
            }
        } catch (e) {
            console.error("Erro ao carregar personagens:", e);
        }
    }

    async function handleAddCharacter(characterId: string) {
        try {
            const res = await fetch(`/api/rooms/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ joinCode: code, characterId }),
            });

            if (res.ok) {
                setShowAddCharacter(false);
                loadRoom();
            } else {
                alert("Erro ao adicionar personagem");
            }
        } catch (e) {
            console.error("Erro ao adicionar personagem:", e);
            alert("Erro ao adicionar personagem");
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
                <LoadingSpinner text="Carregando sala" size="lg" />
            </div>
        );
    }

    if (!room) {
        return null;
    }

    const currentCharacter = room.userCharacters[selectedCharacter];

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100">
            {/* Turn Notification - alerta sonoro e visual */}
            <TurnNotification
                isYourTurn={isMyTurn}
                characterName={currentCharacter?.character?.name || 'Herói'}
            />

            {/* Decorative background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            </div>


            {/* Header */}
            <header className="relative border-b border-neutral-800/50 bg-neutral-900/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push("/lobby")}
                                className="p-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold">{room.name || "Sala sem nome"}</h1>
                                <p className="text-neutral-400 text-sm">
                                    Mestre: {room.gm.displayName || room.gm.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-semibold">
                                🎲 Jogador
                            </span>
                        </div>
                    </div>

                    {/* Character Selector */}
                    {room.userCharacters.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {room.userCharacters.map((cr, index) => (
                                <button
                                    key={cr.id}
                                    onClick={() => setSelectedCharacter(index)}
                                    className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${selectedCharacter === index
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700/50'
                                        }`}
                                >
                                    {cr.character.name}
                                </button>
                            ))}
                            <button
                                onClick={() => setShowAddCharacter(true)}
                                className="px-4 py-2 rounded-xl bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700/50 transition-all whitespace-nowrap"
                            >
                                + Adicionar Personagem
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="relative max-w-7xl mx-auto px-4 py-8">
                {room.userCharacters.length === 0 ? (
                    <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-12 text-center">
                        <h2 className="text-2xl font-bold mb-4">Nenhum personagem na sala</h2>
                        <p className="text-neutral-400 mb-6">
                            Adicione um dos seus personagens para começar a jogar!
                        </p>
                        <button
                            onClick={() => setShowAddCharacter(true)}
                            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all"
                        >
                            Adicionar Personagem
                        </button>
                    </div>
                ) : currentCharacter ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Character Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                                <div className="flex flex-col items-center mb-6">
                                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center text-5xl mb-4">
                                        {currentCharacter.character.avatarUrl ? (
                                            <img
                                                src={currentCharacter.character.avatarUrl}
                                                alt={currentCharacter.character.name}
                                                className="w-full h-full rounded-2xl object-cover"
                                            />
                                        ) : (
                                            "⚔️"
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-bold mb-1">{currentCharacter.character.name}</h2>
                                    <p className="text-neutral-400">
                                        {currentCharacter.character.class || "Sem classe"} • {currentCharacter.character.race || "Sem raça"}
                                    </p>
                                </div>

                                {currentCharacter.roomStats && (() => {
                                    const activeEncounter = room?.encounters?.find(e => e.isActive);
                                    const myParticipant = activeEncounter?.participants.find(
                                        p => p.name === currentCharacter.character.name && !p.isNPC
                                    );

                                    const currentHp = myParticipant ? myParticipant.hp : currentCharacter.roomStats!.hp;
                                    const maxHp = myParticipant ? myParticipant.maxHp : currentCharacter.roomStats!.hp;
                                    const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

                                    const currentMana = myParticipant ? myParticipant.mana : currentCharacter.roomStats!.mana;
                                    const maxMana = myParticipant ? myParticipant.maxMana : currentCharacter.roomStats!.mana;
                                    const manaPercent = Math.max(0, Math.min(100, (currentMana / maxMana) * 100));

                                    return (
                                        <div className="space-y-3">
                                            <div className="bg-neutral-800/50 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-neutral-400 text-sm">HP</span>
                                                    <span className="font-bold text-lg">{currentHp} <span className="text-xs text-neutral-500">/ {maxHp}</span></span>
                                                </div>
                                                <div className="w-full bg-neutral-700/50 rounded-full h-2">
                                                    <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${hpPercent}%` }} />
                                                </div>
                                            </div>

                                            <div className="bg-neutral-800/50 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-neutral-400 text-sm">Mana</span>
                                                    <span className="font-bold text-lg">{currentMana} <span className="text-xs text-neutral-500">/ {maxMana}</span></span>
                                                </div>
                                                <div className="w-full bg-neutral-700/50 rounded-full h-2">
                                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${manaPercent}%` }} />
                                                </div>
                                            </div>

                                            {/* XP Bar and Level */}
                                            <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-4 border border-purple-500/30">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-purple-600 text-white px-2 py-1 rounded-lg text-sm font-bold">
                                                            Lv.{currentCharacter.roomStats?.level || 1}
                                                        </span>
                                                        <span className="text-neutral-400 text-sm">Experiência</span>
                                                    </div>
                                                    <span className="font-bold">
                                                        {currentCharacter.roomStats?.xp || 0} / {currentCharacter.roomStats?.xpToNextLevel || 100} XP
                                                    </span>
                                                </div>
                                                <div className="w-full bg-neutral-700/50 rounded-full h-3">
                                                    <div
                                                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min(100, ((currentCharacter.roomStats?.xp || 0) / (currentCharacter.roomStats?.xpToNextLevel || 100)) * 100)}%` }}
                                                    />
                                                </div>

                                                {/* Stat Points Available */}
                                                {(currentCharacter.roomStats?.statPoints || 0) > 0 && (
                                                    <button
                                                        onClick={() => setShowStatModal(true)}
                                                        className="mt-3 w-full p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-xl animate-pulse hover:bg-yellow-500/30 transition-all"
                                                    >
                                                        <p className="text-yellow-300 text-center font-bold">
                                                            ⭐ {currentCharacter.roomStats?.statPoints} Pontos de Atributo Disponíveis! (Clique para distribuir)
                                                        </p>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center relative group">
                                                    <p className="text-neutral-400 text-xs mb-1">Força</p>
                                                    <p className="font-bold text-lg">{currentCharacter.roomStats!.forca}</p>
                                                    {(currentCharacter.roomStats?.statPoints || 0) > 0 && (
                                                        <button
                                                            onClick={() => distributeStat('forca')}
                                                            disabled={isDistributing}
                                                            className="absolute top-1 right-1 w-6 h-6 bg-emerald-600 hover:bg-emerald-500 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                                        >+</button>
                                                    )}
                                                </div>
                                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center relative group">
                                                    <p className="text-neutral-400 text-xs mb-1">Destreza</p>
                                                    <p className="font-bold text-lg">{currentCharacter.roomStats!.destreza}</p>
                                                    {(currentCharacter.roomStats?.statPoints || 0) > 0 && (
                                                        <button
                                                            onClick={() => distributeStat('destreza')}
                                                            disabled={isDistributing}
                                                            className="absolute top-1 right-1 w-6 h-6 bg-emerald-600 hover:bg-emerald-500 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                                        >+</button>
                                                    )}
                                                </div>
                                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center relative group">
                                                    <p className="text-neutral-400 text-xs mb-1">Inteligência</p>
                                                    <p className="font-bold text-lg">{currentCharacter.roomStats!.inteligencia}</p>
                                                    {(currentCharacter.roomStats?.statPoints || 0) > 0 && (
                                                        <button
                                                            onClick={() => distributeStat('inteligencia')}
                                                            disabled={isDistributing}
                                                            className="absolute top-1 right-1 w-6 h-6 bg-emerald-600 hover:bg-emerald-500 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                                        >+</button>
                                                    )}
                                                </div>
                                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center relative group">
                                                    <p className="text-neutral-400 text-xs mb-1">Defesa</p>
                                                    <p className="font-bold text-lg">{currentCharacter.roomStats!.defesa}</p>
                                                    {(currentCharacter.roomStats?.statPoints || 0) > 0 && (
                                                        <button
                                                            onClick={() => distributeStat('defesa')}
                                                            disabled={isDistributing}
                                                            className="absolute top-1 right-1 w-6 h-6 bg-emerald-600 hover:bg-emerald-500 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                                        >+</button>
                                                    )}
                                                </div>
                                                <div className="bg-neutral-800/50 rounded-xl p-3 text-center col-span-2 relative group">
                                                    <p className="text-neutral-400 text-xs mb-1">Velocidade</p>
                                                    <p className="font-bold text-lg">{currentCharacter.roomStats!.velocidade}</p>
                                                    {(currentCharacter.roomStats?.statPoints || 0) > 0 && (
                                                        <button
                                                            onClick={() => distributeStat('velocidade')}
                                                            disabled={isDistributing}
                                                            className="absolute top-1 right-1 w-6 h-6 bg-emerald-600 hover:bg-emerald-500 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                                        >+</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>



                            {/* Combat Interface - Só aparece quando há combate ativo */}
                            {isMyTurn && (() => {
                                const activeEncounter = room?.encounters?.find(e => e.isActive);
                                if (!activeEncounter) return null;

                                const currentChar = room.userCharacters[selectedCharacter];
                                const myParticipant = activeEncounter.participants.find(
                                    p => p.name === currentChar.character.name && !p.isNPC
                                );
                                const enemies = activeEncounter.participants.filter(p => p.isNPC);

                                return (
                                    <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 backdrop-blur-xl border-2 border-red-500/50 rounded-3xl p-6 shadow-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="text-3xl animate-pulse">⚔️</span>
                                            <div>
                                                <h3 className="text-2xl font-bold text-red-400">Combate Ativo!</h3>
                                                <p className="text-sm text-neutral-400">{activeEncounter.name}</p>
                                            </div>
                                        </div>

                                        {/* Ordem de Iniciativa */}
                                        {(() => {
                                            const sortedParticipants = [...activeEncounter.participants].sort(
                                                (a, b) => b.initiative - a.initiative
                                            );
                                            const myIndex = sortedParticipants.findIndex(
                                                p => p.name === myParticipant?.name && !p.isNPC
                                            );
                                            const currentTurnIndex = (activeEncounter as any).currentTurnIndex || 0;

                                            return (
                                                <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-xl">
                                                    <h4 className="text-xs font-bold text-purple-400 mb-2 flex items-center gap-2">
                                                        🎲 Ordem de Iniciativa
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {sortedParticipants.map((p, idx) => {
                                                            const isMe = p.name === myParticipant?.name && !p.isNPC;
                                                            const isAlive = p.hp > 0;
                                                            const isCurrentTurn = idx === currentTurnIndex;

                                                            return (
                                                                <div
                                                                    key={p.id}
                                                                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 ${isCurrentTurn
                                                                        ? 'bg-yellow-500/40 border-2 border-yellow-400 text-yellow-200 animate-pulse'
                                                                        : isMe
                                                                            ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300'
                                                                            : p.isNPC
                                                                                ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                                                                                : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                                                                        } ${!isAlive ? 'opacity-50' : ''}`}
                                                                >
                                                                    <span className="text-neutral-500">#{idx + 1}</span>
                                                                    <span>{p.name}</span>
                                                                    <span className="text-neutral-500">({p.initiative})</span>
                                                                    {isMe && <span>👤</span>}
                                                                    {isCurrentTurn && <span>⚡</span>}
                                                                    {!isAlive && <span>💀</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {myIndex >= 0 && (
                                                        <p className="text-xs text-neutral-500 mt-2">
                                                            {currentTurnIndex === myIndex
                                                                ? "🎯 É SUA VEZ! Escolha sua ação."
                                                                : `Você é o ${myIndex + 1}º na ordem de ataque`}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Meus Stats de Combate */}
                                        <div className="mb-4 p-3 bg-black/30 rounded-xl">
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-neutral-500">HP:</span>
                                                    <span className="ml-2 font-bold text-red-400">{myParticipant?.hp}/{myParticipant?.maxHp}</span>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-500">Mana:</span>
                                                    <span className="ml-2 font-bold text-blue-400">{myParticipant?.mana}/{myParticipant?.maxMana}</span>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-500">Força:</span>
                                                    <span className="ml-2 font-bold">{currentChar.roomStats?.forca || 3}</span>
                                                </div>
                                                <div>
                                                    <span className="text-neutral-500">Destreza:</span>
                                                    <span className="ml-2 font-bold">{currentChar.roomStats?.destreza || 3}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Inimigos Disponíveis */}
                                        <div className="mb-4">
                                            <h4 className="text-sm font-bold text-neutral-400 mb-2">Inimigos:</h4>
                                            <div className="space-y-2">
                                                {enemies.map(enemy => (
                                                    <div key={enemy.id} className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-bold">{enemy.name}</p>
                                                                <p className="text-xs text-neutral-500">
                                                                    HP: {enemy.hp}/{enemy.maxHp}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setAttackTarget(enemy);
                                                                    setShowAttackModal(true);
                                                                }}
                                                                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition-all"
                                                            >
                                                                🗡️ Atacar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                                            <p className="text-xs text-yellow-300 text-center">
                                                💡 Clique em "Atacar" para escolher tipo de ataque e rolar dados
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Dice Roller */}
                            <DiceRoller
                                allowedDice={
                                    room.diceSystem === 'D6' ? [6] :
                                        room.diceSystem === 'D100' ? [100, 10] :
                                            [4, 6, 8, 10, 12, 20, 100] // D20 default: Clássicos apenas
                                }
                            />
                        </div>

                        {/* Abilities and Actions */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                                <h3 className="text-xl font-bold mb-4">Habilidades</h3>
                                {currentCharacter.roomAbilities.length === 0 ? (
                                    <p className="text-neutral-500 text-center py-8">Nenhuma habilidade ainda.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {currentCharacter.roomAbilities.map((ability) => {
                                            const currentMana = currentCharacter.roomStats?.mana || 0;
                                            const canUse = currentMana >= ability.manaCost;

                                            // Determinar cor do tipo de habilidade
                                            const getAbilityColor = () => {
                                                switch (ability.abilityType) {
                                                    case 'attack': return 'red';
                                                    case 'heal': return 'green';
                                                    case 'buff': return 'blue';
                                                    case 'debuff': return 'purple';
                                                    case 'protection': return 'yellow';
                                                    default: return 'gray';
                                                }
                                            };

                                            const color = getAbilityColor();

                                            return (
                                                <div
                                                    key={ability.id}
                                                    className={`bg-neutral-800/50 border rounded-xl p-4 transition-all ${canUse ? `border-${color}-500/30 hover:border-${color}-500/50` : 'border-neutral-700/50 opacity-60'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <h4 className="font-bold">{ability.name}</h4>
                                                            {ability.abilityType && (
                                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold bg-${color}-500/20 text-${color}-400`}>
                                                                    {ability.abilityType === 'attack' && '⚔️ Ataque'}
                                                                    {ability.abilityType === 'heal' && '💚 Cura'}
                                                                    {ability.abilityType === 'buff' && '⬆️ Buff'}
                                                                    {ability.abilityType === 'debuff' && '⬇️ Debuff'}
                                                                    {ability.abilityType === 'protection' && '🛡️ Proteção'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold whitespace-nowrap ml-2">
                                                            {ability.manaCost} mana
                                                        </span>
                                                    </div>
                                                    {ability.description && (
                                                        <p className="text-neutral-400 text-sm mb-3">{ability.description}</p>
                                                    )}

                                                    {/* Botão Usar - só aparece em combate */}
                                                    {isMyTurn && (
                                                        <button
                                                            onClick={() => {
                                                                if (!canUse) {
                                                                    alert('Mana insuficiente!');
                                                                    return;
                                                                }
                                                                setSelectedAbility(ability);
                                                                setShowAbilityModal(true);
                                                            }}
                                                            disabled={!canUse}
                                                            className={`w-full px-3 py-2 rounded-lg font-semibold text-sm transition-all ${canUse
                                                                ? `bg-${color}-600 hover:bg-${color}-500 text-white`
                                                                : 'bg-neutral-700/50 text-neutral-500 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            {canUse ? '✨ Usar Habilidade' : '🚫 Mana Insuficiente'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                                <h3 className="text-xl font-bold mb-4">Outros Personagens</h3>
                                <div className="space-y-2">
                                    {room.characterRooms
                                        .filter(cr => !room.userCharacters.some(uc => uc.id === cr.id))
                                        .map((cr) => (
                                            <div
                                                key={cr.id}
                                                className="bg-neutral-800/50 rounded-xl p-3 flex items-center gap-3"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                                                    ⚔️
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{cr.character.name}</p>
                                                    <p className="text-neutral-400 text-xs">
                                                        {cr.character.class || "Sem classe"} • {cr.character.race || "Sem raça"}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    {room.characterRooms.filter(cr => !room.userCharacters.some(uc => uc.id === cr.id)).length === 0 && (
                                        <p className="text-neutral-500 text-center py-4">Nenhum outro personagem na sala.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null
                }
            </main >



            {/* Attack Modal - Jogador rola dados MANUALMENTE */}
            {
                showAttackModal && attackTarget && (() => {
                    const currentChar = room.userCharacters[selectedCharacter];
                    const activeEncounter = room?.encounters?.find(e => e.isActive);
                    const myParticipant = activeEncounter?.participants.find(
                        p => p.name === currentChar.character.name && !p.isNPC
                    );

                    const attackBonus = attackType === 'magic'
                        ? (currentChar.roomStats?.inteligencia || 3)
                        : attackType === 'melee'
                            ? (currentChar.roomStats?.forca || 3)
                            : (currentChar.roomStats?.destreza || 3);

                    const targetDefense = 10 + (attackTarget.defesa || 3);

                    const offensiveAbilities = currentChar.roomAbilities.filter(a => !a.abilityType || ['attack', 'debuff'].includes(a.abilityType));

                    // Definir handleConfirmAttack PRIMEIRO (antes de handleRollDice)
                    const handleConfirmAttack = async (result?: any) => {
                        // Usar o resultado passado OU o state
                        const finalResult = result || attackResult;

                        console.log('🛡️ handleConfirmAttack chamado', { activeEncounter, myParticipant, attackResult: finalResult });
                        if (!activeEncounter || !myParticipant || !finalResult) {
                            console.log('❌ Faltando dados:', { activeEncounter: !!activeEncounter, myParticipant: !!myParticipant, attackResult: !!finalResult });
                            return;
                        }

                        setIsAttacking(true);
                        try {
                            let res;

                            if (attackType === 'magic' && selectedAttackAbility) {
                                // Enviar dados de ataque para API de habilidades
                                res = await fetch('/api/abilities/use', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        abilityId: selectedAttackAbility.id,
                                        casterId: myParticipant.id,
                                        targetId: attackTarget.id,
                                        encounterId: activeEncounter.id,
                                        // CRÍTICO: Passar dados do ataque (hit/miss/crítico)
                                        attackRoll: finalResult.roll,
                                        hit: finalResult.hit,
                                        damage: finalResult.damage,
                                        isCritical: finalResult.isCritical
                                    })
                                });
                            } else {
                                // Enviar dados de ataque calculados no frontend
                                res = await fetch('/api/combat/attack', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        encounterId: activeEncounter.id,
                                        attackerId: myParticipant.id,
                                        targetId: attackTarget.id,
                                        attackType,
                                        attackRoll: finalResult.roll,
                                        hit: finalResult.hit,
                                        damage: finalResult.damage,
                                        isCritical: finalResult.isCritical
                                    })
                                });
                            }

                            if (res.ok) {
                                const data = await res.json();
                                console.log('✅ Ataque executado com sucesso:', data);

                                // Mostrar resultado da habilidade
                                if (attackType === 'magic' && data.result) {
                                    const r = data.result;
                                    let message = `${r.abilityName}!\n`;
                                    message += `Dados: ${r.diceRolls.join(' + ')} = ${r.diceTotal}\n`;
                                    message += `Modificador: +${r.modifier}\n`;
                                    message += `Base: +${r.baseDamage}\n`;
                                    message += `Total: ${r.totalValue}`;

                                    if (r.effectType === 'DAMAGE') {
                                        if (r.hit === false) {
                                            message = `${r.abilityName}!\n❌ ERROU!`;
                                        } else {
                                            message += `\n💥 Dano causado!`;
                                        }
                                    } else if (r.effectType === 'HEAL') {
                                        message += `\n💚 HP restaurado!`;
                                    } else if (r.effectType === 'BUFF') {
                                        message += `\n⬆️ Buff aplicado!`;
                                    } else if (r.effectType === 'DEBUFF') {
                                        message += `\n⬇️ Debuff aplicado!`;
                                    }

                                    alert(message);
                                }

                                setShowAttackModal(false);
                                setAttackTarget(null);
                                setDiceRolled(false);
                                setAttackRoll(null);
                                setAttackResult(null);
                                setSelectedAttackAbility(null);
                                loadRoom();
                            } else {
                                const err = await res.json();
                                console.error('❌ Erro no ataque:', err);
                                alert(err.error || 'Erro ao atacar');
                            }
                        } catch (e) {
                            console.error('❌ Exceção no ataque:', e);
                            alert('Erro ao atacar');
                        } finally {
                            setIsAttacking(false);
                        }
                    };

                    const handleRollDice = () => {
                        const roll = Math.floor(Math.random() * 20) + 1;
                        setAttackRoll(roll);
                        setDiceRolled(true);

                        const totalAttack = roll + attackBonus;
                        const hit = totalAttack >= targetDefense || roll === 20;
                        const isCritical = roll === 20;
                        let damage = 0;

                        if (hit) {
                            damage = attackBonus;
                            if (isCritical) damage *= 2;
                        }

                        const result = {
                            roll,
                            totalAttack,
                            hit,
                            isCritical,
                            damage,
                            targetDefense
                        };

                        setAttackResult(result);

                        console.log('🎲 Dados rolados:', result);

                        // AUTO-EXECUTAR ataque após 500ms (tempo para ver o resultado)
                        // PASSAR O RESULTADO DIRETAMENTE ao invés de depender do state
                        setTimeout(() => {
                            console.log('⏱️ Auto-executando ataque com resultado:', result);
                            handleConfirmAttack(result);
                        }, 500);
                    };

                    return (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                                <h2 className="text-2xl font-bold mb-6">Atacar {attackTarget.name}</h2>

                                {/* Escolher tipo de ataque */}
                                {!diceRolled && (
                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold mb-2">Tipo de Ataque:</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => { setAttackType('melee'); setSelectedAttackAbility(null); }}
                                                className={`p-3 rounded-xl border-2 transition-all ${attackType === 'melee'
                                                    ? 'border-red-500 bg-red-500/20'
                                                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                                                    }`}
                                            >
                                                <div className="text-xl mb-1">🗡️</div>
                                                <div className="text-xs font-semibold">Corpo a Corpo</div>
                                                <div className="text-[10px] text-neutral-500">Força</div>
                                            </button>
                                            <button
                                                onClick={() => { setAttackType('ranged'); setSelectedAttackAbility(null); }}
                                                className={`p-3 rounded-xl border-2 transition-all ${attackType === 'ranged'
                                                    ? 'border-blue-500 bg-blue-500/20'
                                                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                                                    }`}
                                            >
                                                <div className="text-xl mb-1">🏹</div>
                                                <div className="text-xs font-semibold">À Distância</div>
                                                <div className="text-[10px] text-neutral-500">Destreza</div>
                                            </button>
                                            <button
                                                onClick={() => setAttackType('magic')}
                                                className={`p-3 rounded-xl border-2 transition-all ${attackType === 'magic'
                                                    ? 'border-purple-500 bg-purple-500/20'
                                                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                                                    }`}
                                            >
                                                <div className="text-xl mb-1">🔮</div>
                                                <div className="text-xs font-semibold">Magia</div>
                                                <div className="text-[10px] text-neutral-500">Inteligência</div>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Se for magia e não escolheu ainda */}
                                {!diceRolled && attackType === 'magic' && (
                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold mb-2">Selecione a Magia:</label>
                                        {offensiveAbilities.length === 0 ? (
                                            <p className="text-neutral-500 text-sm p-4 bg-neutral-800/50 rounded-xl text-center">
                                                Você não possui magias de ataque.
                                            </p>
                                        ) : (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {offensiveAbilities.map(ab => {
                                                    const hasMana = (myParticipant?.mana || 0) >= ab.manaCost;
                                                    return (
                                                        <button
                                                            key={ab.id}
                                                            onClick={() => hasMana && setSelectedAttackAbility(ab)}
                                                            disabled={!hasMana}
                                                            className={`w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center ${selectedAttackAbility?.id === ab.id
                                                                ? 'border-purple-500 bg-purple-500/30'
                                                                : hasMana
                                                                    ? 'border-neutral-700 bg-neutral-800/30 hover:border-purple-500/50'
                                                                    : 'border-neutral-800 bg-neutral-900 opacity-50 cursor-not-allowed'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="font-semibold text-sm">{ab.name}</div>
                                                                <div className="text-[10px] text-neutral-400">{ab.description?.slice(0, 40)}...</div>
                                                            </div>
                                                            <div className={`text-xs font-bold ${hasMana ? 'text-blue-400' : 'text-red-500'}`}>
                                                                {ab.manaCost} MP
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Info do alvo e Botão de Rolar - Só mostra se não for magia OU se for magia já selecionada */}
                                {(!diceRolled && (attackType !== 'magic' || selectedAttackAbility)) && (
                                    <>
                                        <div className="mb-6 p-4 bg-red-950/30 border border-red-500/30 rounded-xl">
                                            <p className="text-sm text-neutral-400 mb-1">Alvo:</p>
                                            <p className="font-bold text-lg">{attackTarget.name}</p>
                                            <div className="flex justify-between text-sm mt-2">
                                                <span className="text-neutral-500">HP: {attackTarget.hp}/{attackTarget.maxHp}</span>
                                                <span className="text-neutral-500">Defesa: {targetDefense}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleRollDice}
                                            className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg transition-all shadow-lg"
                                        >
                                            🎲 ROLAR DADOS!
                                        </button>
                                    </>
                                )}

                                {/* Resultado da rolagem */}
                                {diceRolled && attackResult && (
                                    <div className={`mb-6 p-6 rounded-xl border-2 ${attackResult.isCritical ? 'bg-yellow-500/20 border-yellow-500' :
                                        attackResult.hit ? 'bg-green-500/20 border-green-500' :
                                            'bg-red-500/20 border-red-500'
                                        }`}>
                                        <div className="text-center mb-4">
                                            <div className="text-6xl mb-2">
                                                {attackResult.isCritical ? '💥' : attackResult.hit ? '✅' : '❌'}
                                            </div>
                                            <p className="text-2xl font-bold">
                                                {attackResult.isCritical ? 'CRÍTICO!' : attackResult.hit ? 'ACERTOU!' : 'ERROU!'}
                                            </p>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between p-2 bg-black/20 rounded">
                                                <span>🎲 Dado (d20):</span>
                                                <span className="font-bold">{attackResult.roll}</span>
                                            </div>
                                            <div className="flex justify-between p-2 bg-black/20 rounded">
                                                <span>➕ {attackType === 'magic' ? 'Inteligência' : attackType === 'melee' ? 'Força' : 'Destreza'}:</span>
                                                <span className="font-bold">+{attackBonus}</span>
                                            </div>
                                            <div className="flex justify-between p-2 bg-black/30 rounded font-bold">
                                                <span>= Total:</span>
                                                <span>{attackResult.totalAttack}</span>
                                            </div>
                                            <div className="flex justify-between p-2 bg-black/20 rounded">
                                                <span>🛡️ Defesa do Alvo:</span>
                                                <span className="font-bold">{targetDefense}</span>
                                            </div>
                                            {attackResult.hit && (
                                                <>
                                                    <div className="border-t border-white/10 my-2"></div>
                                                    {attackType === 'magic' ? (
                                                        <div className="p-2 bg-purple-500/30 rounded text-center">
                                                            <p className="font-bold text-lg mb-1">{selectedAttackAbility?.name}</p>
                                                            <p className="text-xs text-purple-200 italic">Verifique o dano na descrição da habilidade.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between p-2 bg-red-500/30 rounded font-bold text-lg">
                                                            <span>💔 Dano:</span>
                                                            <span>{attackResult.damage} HP</span>
                                                        </div>
                                                    )}

                                                    {attackResult.isCritical && (
                                                        <p className="text-xs text-yellow-300 text-center mt-1">
                                                            CRÍTICO! Efeito dobrado!
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {diceRolled && isAttacking && (
                                    <div className="w-full px-6 py-4 rounded-xl bg-yellow-600 text-white font-bold text-lg text-center">
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            {attackType === 'magic' ? 'Lançando magia...' : 'Executando ataque...'}
                                        </span>
                                    </div>
                                )}

                                <button
                                    onClick={() => {
                                        setShowAttackModal(false);
                                        setAttackTarget(null);
                                        setDiceRolled(false);
                                        setAttackRoll(null);
                                        setAttackResult(null);
                                        setSelectedAttackAbility(null);
                                    }}
                                    className="w-full mt-3 px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    );
                })()
            }

            {/* Ability Modal - Escolher alvo e usar habilidade */}
            {
                showAbilityModal && selectedAbility && (() => {
                    const currentChar = room.userCharacters[selectedCharacter];
                    const activeEncounter = room?.encounters?.find(e => e.isActive);

                    if (!activeEncounter) return null;

                    const myParticipant = activeEncounter.participants.find(
                        p => p.name === currentChar.character.name && !p.isNPC
                    );

                    // Determinar alvos possíveis baseado no tipo
                    const isTargetingEnemies = selectedAbility.abilityType === 'attack' || selectedAbility.abilityType === 'debuff';
                    const isTargetingAllies = selectedAbility.abilityType === 'heal' || selectedAbility.abilityType === 'buff' || selectedAbility.abilityType === 'protection';

                    const enemies = activeEncounter.participants.filter(p => p.isNPC);
                    const allies = activeEncounter.participants.filter(p => !p.isNPC);

                    const possibleTargets = isTargetingEnemies ? enemies : isTargetingAllies ? allies : [...allies, ...enemies];

                    return (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full">
                                <h2 className="text-2xl font-bold mb-6">Usar: {selectedAbility.name}</h2>

                                {/* Info da habilidade */}
                                <div className="mb-6 p-4 bg-purple-950/30 border border-purple-500/30 rounded-xl">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-neutral-400">Custo:</span>
                                        <span className="font-bold text-blue-400">{selectedAbility.manaCost} Mana</span>
                                    </div>
                                    {selectedAbility.description && (
                                        <p className="text-sm text-neutral-300 mt-2">{selectedAbility.description}</p>
                                    )}
                                </div>

                                {/* Seleção de alvo */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold mb-3">
                                        {isTargetingEnemies && '🎯 Escolha um inimigo:'}
                                        {isTargetingAllies && '💚 Escolha um aliado:'}
                                        {!isTargetingEnemies && !isTargetingAllies && '🎯 Escolha um alvo:'}
                                    </h3>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {possibleTargets.map(target => (
                                            <button
                                                key={target.id}
                                                onClick={() => setAbilityTarget(target)}
                                                className={`w-full p-3 rounded-xl border-2 transition-all text-left ${abilityTarget?.id === target.id
                                                    ? 'border-purple-500 bg-purple-500/20'
                                                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold">{target.name}</p>
                                                        <p className="text-xs text-neutral-500">
                                                            HP: {target.hp}/{target.maxHp}
                                                        </p>
                                                    </div>
                                                    {target.isNPC && <span className="text-red-400">👹</span>}
                                                    {!target.isNPC && <span className="text-green-400">⚔️</span>}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Botões */}
                                <button
                                    onClick={async () => {
                                        if (!abilityTarget) {
                                            alert('Escolha um alvo!');
                                            return;
                                        }

                                        if (!activeEncounter || !myParticipant) return;

                                        try {
                                            const res = await fetch('/api/combat/use-ability', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    encounterId: activeEncounter.id,
                                                    userId: myParticipant.id,
                                                    abilityId: selectedAbility.id,
                                                    targetId: abilityTarget.id
                                                })
                                            });

                                            if (res.ok) {
                                                const data = await res.json();
                                                alert(data.message || 'Habilidade usada com sucesso!');
                                                setShowAbilityModal(false);
                                                setSelectedAbility(null);
                                                setAbilityTarget(null);
                                                loadRoom();
                                            } else {
                                                const error = await res.json();
                                                alert(error.error || 'Erro ao usar habilidade');
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            alert('Erro ao usar habilidade');
                                        }
                                    }}
                                    disabled={!abilityTarget}
                                    className="w-full px-6 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ✨ USAR HABILIDADE
                                </button>

                                <button
                                    onClick={() => {
                                        setShowAbilityModal(false);
                                        setSelectedAbility(null);
                                        setAbilityTarget(null);
                                    }}
                                    className="w-full mt-3 px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    );
                })()
            }

            {/* Add Character Modal */}
            {
                showAddCharacter && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold mb-6">Adicionar Personagem</h2>
                            {myCharacters.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-neutral-500 mb-4">Você não tem personagens ainda.</p>
                                    <button
                                        onClick={() => router.push("/characters")}
                                        className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all"
                                    >
                                        Criar Personagem
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {myCharacters
                                        .filter(char => !room.userCharacters.some(uc => uc.character.id === char.id))
                                        .map((character) => (
                                            <div
                                                key={character.id}
                                                className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4 flex items-center justify-between hover:border-emerald-500/50 transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center text-xl">
                                                        ⚔️
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{character.name}</p>
                                                        <p className="text-neutral-400 text-sm">
                                                            {character.class || "Sem classe"} • {character.race || "Sem raça"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddCharacter(character.id)}
                                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all"
                                                >
                                                    Adicionar
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            )}
                            <button
                                onClick={() => setShowAddCharacter(false)}
                                className="mt-6 w-full px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Modal de Distribuição de Pontos */}
            {showStatModal && room?.userCharacters[selectedCharacter]?.roomStats && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-2 text-center">⭐ Distribuir Pontos</h2>
                        <p className="text-neutral-400 text-center mb-6">
                            Você tem <span className="text-yellow-400 font-bold">{room!.userCharacters[selectedCharacter].roomStats?.statPoints || 0}</span> pontos disponíveis
                        </p>

                        <div className="space-y-3">
                            {[
                                { key: 'hp', label: 'HP', icon: '❤️', desc: '+5 HP por ponto', color: 'red' },
                                { key: 'mana', label: 'Mana', icon: '💧', desc: '+3 Mana por ponto', color: 'blue' },
                                { key: 'forca', label: 'Força', icon: '💪', desc: 'Dano corpo-a-corpo', color: 'orange' },
                                { key: 'destreza', label: 'Destreza', icon: '🏹', desc: 'Dano à distância', color: 'green' },
                                { key: 'inteligencia', label: 'Inteligência', icon: '🧠', desc: 'Poder mágico', color: 'purple' },
                                { key: 'defesa', label: 'Defesa', icon: '🛡️', desc: 'Reduz dano recebido', color: 'neutral' },
                                { key: 'velocidade', label: 'Velocidade', icon: '⚡', desc: 'Ordem de iniciativa', color: 'cyan' },
                            ].map((stat) => (
                                <button
                                    key={stat.key}
                                    onClick={() => distributeStat(stat.key)}
                                    disabled={isDistributing || (room!.userCharacters[selectedCharacter].roomStats?.statPoints || 0) === 0}
                                    className={`w-full p-4 bg-${stat.color}-900/30 border border-${stat.color}-500/30 rounded-xl hover:bg-${stat.color}-900/50 transition-all disabled:opacity-50 flex items-center justify-between`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{stat.icon}</span>
                                        <div className="text-left">
                                            <p className="font-bold">{stat.label}</p>
                                            <p className="text-xs text-neutral-400">{stat.desc}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-lg">
                                        {(room!.userCharacters[selectedCharacter].roomStats as any)?.[stat.key] || 0}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowStatModal(false)}
                            className="mt-6 w-full px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
