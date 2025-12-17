"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DiceRoller } from "@/components/DiceRoller";

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
        } | null;
        roomAbilities: Array<{
            id: string;
            name: string;
            description: string | null;
            manaCost: number;
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
    const [showAttackModal, setShowAttackModal] = useState(false);
    const [attackTarget, setAttackTarget] = useState<any>(null);
    const [attackType, setAttackType] = useState<'melee' | 'ranged'>('melee');
    const [diceRolled, setDiceRolled] = useState(false);
    const [attackRoll, setAttackRoll] = useState<number | null>(null);
    const [attackResult, setAttackResult] = useState<any>(null);

    useEffect(() => {
        loadRoom();
        loadMyCharacters();

        // Atualizar a cada 3 segundos
        const interval = setInterval(loadRoom, 3000);
        return () => clearInterval(interval);
    }, [code]);

    useEffect(() => {
        if (room && room.userCharacters[selectedCharacter]) {
            checkCombatStatus();
        }
    }, [room, selectedCharacter]);

    function checkCombatStatus() {
        const currentChar = room?.userCharacters[selectedCharacter];
        if (!currentChar) {
            setIsMyTurn(false);
            return;
        }

        // Verificar se há combate ativo onde o jogador participa
        const activeEncounter = room?.encounters?.find((e) => e.isActive);
        if (!activeEncounter) {
            setIsMyTurn(false);
            return;
        }

        // Verificar se o jogador está neste encontro
        const myParticipant = activeEncounter.participants?.find(
            (p) => p.name === currentChar.character.name && !p.isNPC
        );

        // Se o jogador está no encontro ativo, mostrar interface de combate
        setIsMyTurn(!!myParticipant);
    }

    async function loadRoom() {
        try {
            const res = await fetch(`/api/rooms/${code}`);
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
        } catch (e) {
            console.error("Erro ao carregar sala:", e);
            router.push("/lobby");
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

                                {currentCharacter.roomStats && (
                                    <div className="space-y-3">
                                        <div className="bg-neutral-800/50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-neutral-400 text-sm">HP</span>
                                                <span className="font-bold text-lg">{currentCharacter.roomStats.hp}</span>
                                            </div>
                                            <div className="w-full bg-neutral-700/50 rounded-full h-2">
                                                <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }} />
                                            </div>
                                        </div>

                                        <div className="bg-neutral-800/50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-neutral-400 text-sm">Mana</span>
                                                <span className="font-bold text-lg">{currentCharacter.roomStats.mana}</span>
                                            </div>
                                            <div className="w-full bg-neutral-700/50 rounded-full h-2">
                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                                                <p className="text-neutral-400 text-xs mb-1">Força</p>
                                                <p className="font-bold text-lg">{currentCharacter.roomStats.forca}</p>
                                            </div>
                                            <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                                                <p className="text-neutral-400 text-xs mb-1">Destreza</p>
                                                <p className="font-bold text-lg">{currentCharacter.roomStats.destreza}</p>
                                            </div>
                                            <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                                                <p className="text-neutral-400 text-xs mb-1">Inteligência</p>
                                                <p className="font-bold text-lg">{currentCharacter.roomStats.inteligencia}</p>
                                            </div>
                                            <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
                                                <p className="text-neutral-400 text-xs mb-1">Defesa</p>
                                                <p className="font-bold text-lg">{currentCharacter.roomStats.defesa}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                        {currentCharacter.roomAbilities.map((ability) => (
                                            <div
                                                key={ability.id}
                                                className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4 hover:border-emerald-500/50 transition-all cursor-pointer"
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className="font-bold">{ability.name}</h4>
                                                    <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold">
                                                        {ability.manaCost} mana
                                                    </span>
                                                </div>
                                                {ability.description && (
                                                    <p className="text-neutral-400 text-sm">{ability.description}</p>
                                                )}
                                            </div>
                                        ))}
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
                ) : null}
            </main>



            {/* Attack Modal - Jogador rola dados MANUALMENTE */}
            {showAttackModal && attackTarget && (() => {
                const currentChar = room.userCharacters[selectedCharacter];
                const activeEncounter = room?.encounters?.find(e => e.isActive);
                const myParticipant = activeEncounter?.participants.find(
                    p => p.name === currentChar.character.name && !p.isNPC
                );

                const attackBonus = attackType === 'melee'
                    ? (currentChar.roomStats?.forca || 3)
                    : (currentChar.roomStats?.destreza || 3);

                const targetDefense = 10 + (attackTarget.defesa || 3);

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

                    setAttackResult({
                        roll,
                        totalAttack,
                        hit,
                        isCritical,
                        damage,
                        targetDefense
                    });
                };

                const handleConfirmAttack = async () => {
                    if (!activeEncounter || !myParticipant || !attackResult) return;

                    try {
                        const res = await fetch('/api/combat/attack', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                encounterId: activeEncounter.id,
                                attackerId: myParticipant.id,
                                targetId: attackTarget.id,
                                attackType
                            })
                        });

                        if (res.ok) {
                            setShowAttackModal(false);
                            setAttackTarget(null);
                            setDiceRolled(false);
                            setAttackRoll(null);
                            setAttackResult(null);
                            loadRoom();
                        }
                    } catch (e) {
                        console.error(e);
                        alert('Erro ao atacar');
                    }
                };

                return (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-lg w-full">
                            <h2 className="text-2xl font-bold mb-6">Atacar {attackTarget.name}</h2>

                            {/* Escolher tipo de ataque */}
                            {!diceRolled && (
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold mb-2">Tipo de Ataque:</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setAttackType('melee')}
                                            className={`p-3 rounded-xl border-2 transition-all ${attackType === 'melee'
                                                    ? 'border-red-500 bg-red-500/20'
                                                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">🗡️</div>
                                            <div className="text-sm font-semibold">Corpo a Corpo</div>
                                            <div className="text-xs text-neutral-500">Força: +{currentChar.roomStats?.forca || 3}</div>
                                        </button>
                                        <button
                                            onClick={() => setAttackType('ranged')}
                                            className={`p-3 rounded-xl border-2 transition-all ${attackType === 'ranged'
                                                    ? 'border-blue-500 bg-blue-500/20'
                                                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">🏹</div>
                                            <div className="text-sm font-semibold">À Distância</div>
                                            <div className="text-xs text-neutral-500">Destreza: +{currentChar.roomStats?.destreza || 3}</div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Info do alvo */}
                            <div className="mb-6 p-4 bg-red-950/30 border border-red-500/30 rounded-xl">
                                <p className="text-sm text-neutral-400 mb-1">Alvo:</p>
                                <p className="font-bold text-lg">{attackTarget.name}</p>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-neutral-500">HP: {attackTarget.hp}/{attackTarget.maxHp}</span>
                                    <span className="text-neutral-500">Defesa: {targetDefense}</span>
                                </div>
                            </div>

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
                                            <span>➕ Bônus ({attackType === 'melee' ? 'Força' : 'Destreza'}):</span>
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
                                                <div className="flex justify-between p-2 bg-red-500/30 rounded font-bold text-lg">
                                                    <span>💔 Dano:</span>
                                                    <span>{attackResult.damage} HP</span>
                                                </div>
                                                {attackResult.isCritical && (
                                                    <p className="text-xs text-yellow-300 text-center">
                                                        Dano dobrado por crítico!
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Botões */}
                            {!diceRolled ? (
                                <button
                                    onClick={handleRollDice}
                                    className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg transition-all shadow-lg"
                                >
                                    🎲 ROLAR DADOS!
                                </button>
                            ) : (
                                <button
                                    onClick={handleConfirmAttack}
                                    className="w-full px-6 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg transition-all"
                                >
                                    ⚔️ CONFIRMAR ATAQUE
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setShowAttackModal(false);
                                    setAttackTarget(null);
                                    setDiceRolled(false);
                                    setAttackRoll(null);
                                    setAttackResult(null);
                                }}
                                className="w-full mt-3 px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* Add Character Modal */}
            {showAddCharacter && (
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
            )}
        </div>
    );
}
