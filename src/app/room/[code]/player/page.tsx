"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DiceRoller } from "@/components/DiceRoller";
import { TurnNotification } from "@/components/TurnNotification";
import { AnimatedDice } from "@/components/AnimatedDice";
import { CombatHistory } from "@/components/CombatHistory";

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

    useEffect(() => {
        loadRoom();
        loadMyCharacters();

        // Atualizar a cada 3 segundos para ver mudanças de turno
        const interval = setInterval(loadRoom, 3000);
        return () => clearInterval(interval);
    }, [code]);

    useEffect(() => {
        if (room && room.userCharacters[selectedCharacter]) {
            checkIfMyTurn();
        }
    }, [room, selectedCharacter]);

    function checkIfMyTurn() {
        const currentChar = room?.userCharacters[selectedCharacter];
        if (!currentChar) return;

        // Buscar encontro ativo
        const activeEncounter = (room as any)?.encounters?.find((e: any) => e.isActive);
        if (!activeEncounter) {
            setIsMyTurn(false);
            return;
        }

        // Buscar participante do jogador
        const myParticipant = activeEncounter.participants?.find(
            (p: any) => p.name === currentChar.character.name && !p.isNPC
        );

        if (!myParticipant) {
            setIsMyTurn(false);
            return;
        }

        // Verificar se é o turno dele (assumindo que o GM controla o índice)
        // Por enquanto, vamos permitir que o jogador role quando quiser durante combate ativo
        setIsMyTurn(activeEncounter.isActive);
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
            {/* Turn Notification */}
            <TurnNotification
                isYourTurn={isMyTurn}
                characterName={currentCharacter?.character.name || ''}
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

                            {/* Combat Section */}
                            {isMyTurn && (
                                <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 backdrop-blur-xl border-2 border-red-500/50 rounded-3xl p-6 shadow-2xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl animate-pulse">⚔️</span>
                                        <div>
                                            <h3 className="text-2xl font-bold text-red-400">Combate Ativo!</h3>
                                            <p className="text-sm text-neutral-400">Role os dados para atacar</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <AnimatedDice
                                            sides={20}
                                            onRoll={(result) => {
                                                console.log('Ataque rolado:', result);
                                                // Aqui você pode adicionar lógica para processar o ataque
                                            }}
                                            label="🗡️ Ataque"
                                        />
                                        <AnimatedDice
                                            sides={6}
                                            onRoll={(result) => {
                                                console.log('Dano rolado:', result);
                                            }}
                                            label="💥 Dano"
                                        />
                                    </div>

                                    <div className="mt-4 p-3 bg-black/30 rounded-xl">
                                        <p className="text-xs text-neutral-400 text-center">
                                            💡 Role d20 para atacar, depois d6 para dano
                                        </p>
                                    </div>
                                </div>
                            )}

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
