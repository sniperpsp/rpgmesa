"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface StatusEffect {
    name: string;
    duration: number;
    effect: string;
}

interface Participant {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    initiative: number;
    isNPC: boolean;
    statusEffects: StatusEffect[] | null;
}

interface Room {
    id: string;
    name: string;
    joinCode: string;
    rules: string | null;
    gm: {
        displayName: string | null;
        email: string;
    };
    members: Array<{
        userId: string;
        role: string;
        user: {
            displayName: string | null;
            email: string;
        };
    }>;
    characterRooms: Array<{
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
            hpMultiplier: number;
            manaMultiplier: number;
            forca: number;
            destreza: number;
            inteligencia: number;
            defesa: number;
            velocidade: number;
        } | null;
    }>;
    encounters: Array<{
        id: string;
        name: string | null;
        isActive: boolean;
        participants: Participant[];
    }>;
    stories: Array<{
        id: string;
        title: string;
        summary: string | null;
        status: string;
        acts: Array<{
            id: string;
            order: number;
            title: string;
            description: string | null;
            metadata: any;
            events: string | null;
            scenes: Array<{
                id: string;
                content: string;
                imageUrl: string | null;
            }>;
        }>;
    }>;
}

export default function GMPage() {
    const router = useRouter();
    const params = useParams();
    const code = params.code as string;

    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState<Room | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'characters' | 'encounters' | 'stories'>('overview');

    // Story States
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [storyTheme, setStoryTheme] = useState("");
    const [generatingStory, setGeneratingStory] = useState(false);

    // Increment Act States
    const [showNextActModal, setShowNextActModal] = useState(false);
    const [nextActInput, setNextActInput] = useState("");
    const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
    const [generatingAct, setGeneratingAct] = useState(false);

    // Scene Image States
    const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});

    // Events editing
    const [editingEvents, setEditingEvents] = useState<Record<string, string>>({});

    // Status Effect Modal
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [newStatus, setNewStatus] = useState({ name: "", duration: 1, effect: "" });

    // Combat States
    const [showAttackModal, setShowAttackModal] = useState(false);
    const [attacker, setAttacker] = useState<Participant | null>(null);
    const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);
    const [combatLog, setCombatLog] = useState<any[]>([]);
    const [attackType, setAttackType] = useState<'melee' | 'ranged'>('melee');
    const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
    const [showDiceRoller, setShowDiceRoller] = useState(false);
    const [diceResult, setDiceResult] = useState<number | null>(null);

    // New Encounter Modal
    const [showNewEncounterModal, setShowNewEncounterModal] = useState(false);
    const [newEncounter, setNewEncounter] = useState({
        name: '',
        monsters: [{ name: '', hp: 20, forca: 3, destreza: 3, defesa: 3 }]
    });

    // Manual Encounter Modal
    const [showManualEncounterModal, setShowManualEncounterModal] = useState(false);
    const [manualEncounterName, setManualEncounterName] = useState('');
    const [selectedMonsters, setSelectedMonsters] = useState<Array<{ templateId: string; name: string; count: number }>>([]);
    const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);

    // Ability Modal States
    const [showAbilityModal, setShowAbilityModal] = useState(false);
    const [selectedCharacterForAbility, setSelectedCharacterForAbility] = useState<any>(null);
    const [newAbility, setNewAbility] = useState({
        name: '',
        description: '',
        manaCost: 5,
        abilityType: 'attack' as 'attack' | 'heal' | 'buff' | 'debuff' | 'protection',
        damage: 10,
        healing: 0,
        buffValue: 0,
        debuffValue: 0,
        protectionValue: 0
    });

    useEffect(() => {
        loadRoom();
    }, [code]);

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

            // Verificar se o usuário é GM da sala
            const userRes = await fetch("/api/auth/me");
            if (userRes.ok) {
                const userData = await userRes.json();
                if (data.room.gmUserId !== userData.user.id) {
                    // Não é GM, redirecionar para visão de jogador
                    console.log('Você não é o GM desta sala. Redirecionando para visão de jogador...');
                    router.push(`/room/${code}/player`);
                    return;
                }
            }

            setRoom(data.room);
            setLoading(false);
        } catch (e) {
            console.error("Erro ao carregar sala:", e);
            router.push("/lobby");
        }
    }

    async function loadMonsterTemplates(forceRefresh = false) {
        try {
            const cacheKey = 'monster_templates_cache';
            const cacheExpiry = 'monster_templates_cache_expiry';

            // Se não forçar refresh, checar cache
            if (!forceRefresh) {
                const cached = localStorage.getItem(cacheKey);
                const expiry = localStorage.getItem(cacheExpiry);

                if (cached && expiry && Date.now() < parseInt(expiry)) {
                    const templates = JSON.parse(cached);
                    if (templates.length > 0) {
                        console.log('📦 Usando templates do cache:', templates.length, 'templates');
                        setAvailableTemplates(templates);
                        return;
                    }
                }
            }

            // Limpar cache antigo
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(cacheExpiry);

            console.log('🌐 Buscando templates da API...');
            const res = await fetch('/api/templates/monsters');
            if (res.ok) {
                const data = await res.json();
                const templates = data.monsters || [];
                console.log('✅ Templates carregados:', templates.length, 'templates');
                setAvailableTemplates(templates);

                // Salvar no cache por 5 minutos (apenas se tiver dados)
                if (templates.length > 0) {
                    localStorage.setItem(cacheKey, JSON.stringify(templates));
                    localStorage.setItem(cacheExpiry, String(Date.now() + 5 * 60 * 1000));
                }
            } else {
                console.error('❌ Erro na API:', res.status);
            }
        } catch (e) {
            console.error('❌ Erro ao carregar templates:', e);
        }
    }

    async function handleCreateManualEncounter() {
        if (!manualEncounterName.trim() || selectedMonsters.length === 0) {
            alert('Preencha o nome e adicione pelo menos um monstro!');
            return;
        }

        try {
            const res = await fetch('/api/encounters/create-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: room?.id,
                    name: manualEncounterName,
                    monsters: selectedMonsters,
                    addPlayers: true
                })
            });

            if (res.ok) {
                setShowManualEncounterModal(false);
                setManualEncounterName('');
                setSelectedMonsters([]);
                loadRoom();
                console.log('✅ Encontro manual criado com sucesso!');
            } else {
                const error = await res.json();
                alert(error.error || 'Erro ao criar encontro');
            }
        } catch (e) {
            console.error('Erro ao criar encontro manual:', e);
            alert('Erro ao criar encontro');
        }
    }

    async function handleGenerateStory(e: React.FormEvent) {
        e.preventDefault();
        setGeneratingStory(true);
        try {
            const res = await fetch("/api/stories/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId: room?.id, theme: storyTheme }),
            });

            if (res.ok) {
                setShowStoryModal(false);
                setStoryTheme("");
                loadRoom();
            } else {
                alert("Erro ao gerar história");
            }
        } catch (e) {
            console.error("Erro ao gerar história:", e);
            alert("Erro ao gerar história");
        } finally {
            setGeneratingStory(false);
        }
    }

    async function handleGenerateNextAct(e: React.FormEvent) {
        e.preventDefault();
        if (!activeStoryId) return;
        setGeneratingAct(true);
        try {
            const res = await fetch(`/api/stories/${activeStoryId}/acts/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gmInput: nextActInput }),
            });
            if (res.ok) {
                setShowNextActModal(false);
                setNextActInput("");
                setActiveStoryId(null);
                loadRoom();
            } else {
                alert("Erro ao gerar próximo ato");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar próximo ato");
        } finally {
            setGeneratingAct(false);
        }
    }

    async function handleCreateEncounter(metadataEncounter: any) {
        const addPlayers = confirm(`Criar o encontro "${metadataEncounter.name}"?\n\nDeseja adicionar os jogadores automaticamente?`);

        try {
            const res = await fetch("/api/encounters/create-suggested", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomId: room?.id,
                    name: metadataEncounter.name,
                    monsters: metadataEncounter.monsters,
                    addPlayers
                }),
            });
            if (res.ok) {
                alert("Encontro criado com sucesso!");
                loadRoom();
                setActiveTab('encounters');
            } else {
                alert("Erro ao criar encontro");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao criar encontro");
        }
    }

    async function handleUpdateParticipant(participantId: string, updates: Partial<Participant>) {
        try {
            const res = await fetch(`/api/participants/${participantId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                loadRoom();
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function handleToggleEncounter(encounterId: string, isActive: boolean) {
        // Se ativando, rolar iniciativa para todos
        if (isActive) {
            const encounter = room?.encounters.find(e => e.id === encounterId);
            if (encounter) {
                // Rolar iniciativa aleatória para cada participante
                for (const p of encounter.participants) {
                    const initiative = Math.floor(Math.random() * 20) + 1;
                    await fetch(`/api/participants/${p.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ initiative }),
                    });
                }
            }
        }

        try {
            const res = await fetch(`/api/encounters/${encounterId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive }),
            });
            if (res.ok) {
                setCurrentTurnIndex(0);
                loadRoom();
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function handleEditCharacter(characterRoomId: string, stats: any) {
        try {
            const res = await fetch(`/api/character-rooms/${characterRoomId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stats }),
            });
            if (res.ok) {
                loadRoom();
                alert("Personagem atualizado!");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao atualizar personagem");
        }
    }

    async function handleCreateAbility(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCharacterForAbility) return;

        try {
            const res = await fetch(`/api/character-rooms/${selectedCharacterForAbility.id}/abilities`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newAbility),
            });

            if (res.ok) {
                setShowAbilityModal(false);
                setNewAbility({
                    name: '',
                    description: '',
                    manaCost: 5,
                    abilityType: 'attack',
                    damage: 10,
                    healing: 0,
                    buffValue: 0,
                    debuffValue: 0,
                    protectionValue: 0
                });
                loadRoom();
                console.log('✅ Habilidade criada com sucesso!');
            } else {
                const error = await res.json();
                console.error('❌ Erro ao criar habilidade:', error.error);
            }
        } catch (e) {
            console.error('❌ Erro ao criar habilidade:', e);
        }
    }


    async function handleAttack(targetId: string) {
        if (!attacker || !activeEncounterId) return;

        try {
            const res = await fetch('/api/combat/attack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    encounterId: activeEncounterId,
                    attackerId: attacker.id,
                    targetId,
                    attackType
                })
            });

            if (res.ok) {
                const data = await res.json();
                setCombatLog(prev => [data.result, ...prev]);
                setShowAttackModal(false);
                setAttacker(null);
                loadRoom();
            }
        } catch (e) {
            console.error(e);
        }
    }

    async function handleAddStatus() {
        if (!selectedParticipant) return;
        const currentEffects = selectedParticipant.statusEffects || [];
        const updatedEffects = [...currentEffects, newStatus];

        await handleUpdateParticipant(selectedParticipant.id, { statusEffects: updatedEffects });
        setShowStatusModal(false);
        setNewStatus({ name: "", duration: 1, effect: "" });
        setSelectedParticipant(null);
    }

    async function handleSaveEvents(actId: string) {
        try {
            const res = await fetch(`/api/acts/${actId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ events: editingEvents[actId] || "" }),
            });
            if (res.ok) {
                loadRoom();
                alert("Acontecimentos salvos!");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar");
        }
    }

    async function handleGenerateSceneImage(sceneId: string) {
        setGeneratingImages(prev => ({ ...prev, [sceneId]: true }));
        try {
            const res = await fetch(`/api/scenes/${sceneId}/image`, { method: "POST" });
            if (res.ok) {
                loadRoom();
            } else {
                alert("Erro ao gerar imagem");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar imagem");
        } finally {
            setGeneratingImages(prev => ({ ...prev, [sceneId]: false }));
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100">
            {/* Header */}
            <header className="relative border-b border-neutral-800/50 bg-neutral-900/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => router.push("/lobby")} className="p-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all">
                                ⬅
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold">{room.name}</h1>
                                <p className="text-neutral-400 text-sm">Código: {room.joinCode}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push(`/room/${code}/player`)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all">
                                🎮 Jogar
                            </button>
                            <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-semibold">👑 GM</span>
                        </div>
                    </div>

                    <div className="flex gap-2 font-medium overflow-x-auto pb-2">
                        <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-purple-600' : 'bg-neutral-800/50'}`}>Visão Geral</button>
                        <button onClick={() => setActiveTab('characters')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'characters' ? 'bg-purple-600' : 'bg-neutral-800/50'}`}>Personagens</button>
                        <button onClick={() => setActiveTab('encounters')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'encounters' ? 'bg-purple-600' : 'bg-neutral-800/50'}`}>Encontros</button>
                        <button onClick={() => setActiveTab('stories')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'stories' ? 'bg-purple-600' : 'bg-neutral-800/50'}`}>História (IA)</button>
                        <button onClick={() => window.open('/templates', '_blank')} className="px-4 py-2 rounded-xl transition-all whitespace-nowrap bg-neutral-800/50 hover:bg-neutral-700/50">📚 Templates</button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative max-w-7xl mx-auto px-4 py-8">
                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-4">Informações da Sala</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-neutral-800/50 rounded-2xl p-4">
                                    <p className="text-neutral-400 text-sm mb-1">Membros</p>
                                    <p className="text-2xl font-bold">{room.members.length}</p>
                                </div>
                                <div className="bg-neutral-800/50 rounded-2xl p-4">
                                    <p className="text-neutral-400 text-sm mb-1">Personagens</p>
                                    <p className="text-2xl font-bold">{room.characterRooms.length}</p>
                                </div>
                                <div className="bg-neutral-800/50 rounded-2xl p-4">
                                    <p className="text-neutral-400 text-sm mb-1">Encontros Ativos</p>
                                    <p className="text-2xl font-bold">{room.encounters.filter(e => e.isActive).length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-4">Membros da Sala</h2>
                            <div className="space-y-2">
                                {room.members.map((member) => (
                                    <div key={member.userId} className="flex items-center justify-between bg-neutral-800/50 rounded-xl p-4">
                                        <div>
                                            <p className="font-semibold">{member.user.displayName || member.user.email}</p>
                                            <p className="text-neutral-400 text-sm">{member.user.email}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${member.role === 'gm' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {member.role === 'gm' ? 'GM' : 'Jogador'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* CHARACTERS */}
                {activeTab === 'characters' && (
                    <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-6">Personagens na Sala</h2>
                        {room.characterRooms.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-neutral-500">Nenhum personagem na sala ainda.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {room.characterRooms.map((cr) => (
                                    <div key={cr.id} className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-5">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
                                                {cr.character.avatarUrl ? (
                                                    <img src={cr.character.avatarUrl} alt={cr.character.name} className="w-full h-full rounded-xl object-cover" />
                                                ) : "⚔️"}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg">{cr.character.name}</h3>
                                                <p className="text-neutral-400 text-sm">{cr.character.class || "Sem classe"} • {cr.character.race || "Sem raça"}</p>
                                            </div>
                                        </div>
                                        {cr.roomStats && (
                                            <div className="space-y-2">
                                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-red-400 text-xs font-semibold">❤️ HP</p>
                                                        <button
                                                            onClick={() => {
                                                                const newHp = prompt(`Novo HP (pontos base):`, cr.roomStats!.hp.toString());
                                                                if (newHp) handleEditCharacter(cr.id, { hp: parseInt(newHp) });
                                                            }}
                                                            className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/40 rounded"
                                                        >
                                                            ✏️
                                                        </button>
                                                    </div>
                                                    <p className="text-xl font-bold">{cr.roomStats.hp}</p>
                                                </div>
                                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-blue-400 text-xs font-semibold">✨ Mana</p>
                                                        <button
                                                            onClick={() => {
                                                                const newMana = prompt(`Nova Mana:`, cr.roomStats!.mana.toString());
                                                                if (newMana) handleEditCharacter(cr.id, { mana: parseInt(newMana) });
                                                            }}
                                                            className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/40 rounded"
                                                        >
                                                            ✏️
                                                        </button>
                                                    </div>
                                                    <p className="text-xl font-bold">{cr.roomStats.mana}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="bg-neutral-900/50 rounded-lg p-2">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="text-neutral-500 text-xs">Força</p>
                                                            <button
                                                                onClick={() => {
                                                                    const newVal = prompt(`Nova Força:`, cr.roomStats!.forca.toString());
                                                                    if (newVal) handleEditCharacter(cr.id, { forca: parseInt(newVal) });
                                                                }}
                                                                className="text-xs px-1 py-0.5 bg-neutral-700/50 hover:bg-neutral-600/50 rounded"
                                                            >
                                                                ✏️
                                                            </button>
                                                        </div>
                                                        <p className="font-bold">{cr.roomStats.forca}</p>
                                                    </div>
                                                    <div className="bg-neutral-900/50 rounded-lg p-2">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="text-neutral-500 text-xs">Destreza</p>
                                                            <button
                                                                onClick={() => {
                                                                    const newVal = prompt(`Nova Destreza:`, cr.roomStats!.destreza.toString());
                                                                    if (newVal) handleEditCharacter(cr.id, { destreza: parseInt(newVal) });
                                                                }}
                                                                className="text-xs px-1 py-0.5 bg-neutral-700/50 hover:bg-neutral-600/50 rounded"
                                                            >
                                                                ✏️
                                                            </button>
                                                        </div>
                                                        <p className="font-bold">{cr.roomStats.destreza}</p>
                                                    </div>
                                                    <div className="bg-neutral-900/50 rounded-lg p-2">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="text-neutral-500 text-xs">Inteligência</p>
                                                            <button
                                                                onClick={() => {
                                                                    const newVal = prompt(`Nova Inteligência:`, cr.roomStats!.inteligencia.toString());
                                                                    if (newVal) handleEditCharacter(cr.id, { inteligencia: parseInt(newVal) });
                                                                }}
                                                                className="text-xs px-1 py-0.5 bg-neutral-700/50 hover:bg-neutral-600/50 rounded"
                                                            >
                                                                ✏️
                                                            </button>
                                                        </div>
                                                        <p className="font-bold">{cr.roomStats.inteligencia}</p>
                                                    </div>
                                                    <div className="bg-neutral-900/50 rounded-lg p-2">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="text-neutral-500 text-xs">Defesa</p>
                                                            <button
                                                                onClick={() => {
                                                                    const newVal = prompt(`Nova Defesa:`, cr.roomStats!.defesa.toString());
                                                                    if (newVal) handleEditCharacter(cr.id, { defesa: parseInt(newVal) });
                                                                }}
                                                                className="text-xs px-1 py-0.5 bg-neutral-700/50 hover:bg-neutral-600/50 rounded"
                                                            >
                                                                ✏️
                                                            </button>
                                                        </div>
                                                        <p className="font-bold">{cr.roomStats.defesa}</p>
                                                    </div>
                                                    <div className="bg-neutral-900/50 rounded-lg p-2 col-span-2">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="text-neutral-500 text-xs">Velocidade</p>
                                                            <button
                                                                onClick={() => {
                                                                    const newVal = prompt(`Nova Velocidade:`, cr.roomStats!.velocidade.toString());
                                                                    if (newVal) handleEditCharacter(cr.id, { velocidade: parseInt(newVal) });
                                                                }}
                                                                className="text-xs px-1 py-0.5 bg-neutral-700/50 hover:bg-neutral-600/50 rounded"
                                                            >
                                                                ✏️
                                                            </button>
                                                        </div>
                                                        <p className="font-bold">{cr.roomStats.velocidade}</p>
                                                    </div>
                                                </div>

                                                {/* Habilidades do Personagem */}
                                                <div className="mt-4 pt-4 border-t border-neutral-700/50">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <p className="text-neutral-400 text-sm font-semibold">Habilidades ({cr.roomAbilities.length})</p>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCharacterForAbility(cr);
                                                                setShowAbilityModal(true);
                                                            }}
                                                            className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold"
                                                        >
                                                            ✨ Adicionar Habilidade
                                                        </button>
                                                    </div>
                                                    {cr.roomAbilities.length > 0 && (
                                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                                            {cr.roomAbilities.map((ability) => (
                                                                <div key={ability.id} className="text-xs bg-neutral-800/50 rounded px-2 py-1 flex justify-between items-center">
                                                                    <span className="font-medium">{ability.name}</span>
                                                                    <span className="text-neutral-500">{ability.manaCost} mana</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ENCOUNTERS */}
                {activeTab === 'encounters' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Encontros de Combate</h2>
                            <button
                                onClick={() => setShowManualEncounterModal(true)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-500/25"
                            >
                                ⚔️ Criar Encontro Manual
                            </button>
                        </div>

                        {room.encounters.length === 0 ? (
                            <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-12 text-center">
                                <p className="text-neutral-500 text-lg">Nenhum encontro criado ainda.</p>
                                <p className="text-neutral-600 text-sm mt-2">Crie encontros pela aba História (IA) ou manualmente.</p>
                            </div>
                        ) : (
                            room.encounters.map(encounter => {
                                // Ordenar TODOS os participantes por iniciativa (maior primeiro)
                                const allParticipants = encounter.participants.sort((a, b) => b.initiative - a.initiative);
                                const players = allParticipants.filter(p => !p.isNPC);
                                const npcs = allParticipants.filter(p => p.isNPC);
                                const currentTurn = encounter.isActive && allParticipants[(encounter as any).currentTurnIndex || 0];

                                return (
                                    <div key={encounter.id} className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="text-2xl font-bold">{encounter.name}</h3>
                                                <p className="text-sm text-neutral-500">{encounter.participants.length} participantes</p>
                                            </div>
                                            <div className="flex gap-3">
                                                {encounter.isActive && (
                                                    <button
                                                        onClick={async () => {
                                                            console.log('🔵 Clicou em Próximo Turno');
                                                            console.log('🔵 Encounter ID:', encounter.id);
                                                            console.log('🔵 Current Turn Index:', (encounter as any).currentTurnIndex);
                                                            try {
                                                                const res = await fetch(`/api/encounters/${encounter.id}/next-turn`, {
                                                                    method: 'POST'
                                                                });
                                                                console.log('🔵 Response status:', res.status);
                                                                const data = await res.json();
                                                                console.log('🔵 Response data:', data);
                                                                if (res.ok) {
                                                                    console.log('✅ Turno avançado! Recarregando...');
                                                                    loadRoom();
                                                                } else {
                                                                    console.error('❌ Erro na resposta:', data);
                                                                }
                                                            } catch (e) {
                                                                console.error('❌ Erro ao avançar turno:', e);
                                                            }
                                                        }}
                                                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all"
                                                    >
                                                        ⏭️ Próximo Turno
                                                    </button>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch(`/api/encounters/${encounter.id}/add-players`, {
                                                                method: 'POST'
                                                            });
                                                            if (res.ok) {
                                                                const data = await res.json();
                                                                console.log('✅', data.message || 'Jogadores adicionados!');
                                                                loadRoom();
                                                            } else {
                                                                const error = await res.json();
                                                                console.error('❌', error.error || 'Erro ao adicionar jogadores');
                                                            }
                                                        } catch (e) {
                                                            console.error('❌ Erro ao adicionar jogadores:', e);
                                                        }
                                                    }}
                                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all"
                                                    title="Adicionar jogadores que entraram na sala"
                                                >
                                                    👥 Adicionar Jogadores
                                                </button>
                                                <button
                                                    onClick={() => handleToggleEncounter(encounter.id, !encounter.isActive)}
                                                    className={`px-4 py-2 rounded-xl font-semibold transition-all ${encounter.isActive ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-neutral-700/50 text-neutral-400 hover:bg-neutral-600/50'}`}
                                                >
                                                    {encounter.isActive ? '⚔️ Ativo' : '▶️ Ativar'}
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Deletar encontro "${encounter.name}"?`)) {
                                                            try {
                                                                const res = await fetch(`/api/encounters/${encounter.id}`, {
                                                                    method: 'DELETE'
                                                                });
                                                                if (res.ok) {
                                                                    loadRoom();
                                                                }
                                                            } catch (e) {
                                                                console.error(e);
                                                            }
                                                        }
                                                    }}
                                                    className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 font-semibold transition-all"
                                                    disabled={encounter.isActive}
                                                >
                                                    🗑️ Deletar
                                                </button>
                                            </div>
                                        </div>

                                        {/* JOGADORES */}
                                        <div className="mb-6">
                                            <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                                                🎮 Jogadores
                                            </h4>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                {players.map(p => (
                                                    <div
                                                        key={p.id}
                                                        className={`rounded-xl p-4 border transition-all ${currentTurn?.id === p.id
                                                            ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400'
                                                            : 'bg-emerald-500/5 border-emerald-500/30'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-lg">{p.name}</h4>
                                                                    {currentTurn?.id === p.id && (
                                                                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full animate-pulse">
                                                                            SUA VEZ
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-neutral-500">Iniciativa: {p.initiative}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setAttacker(p);
                                                                        setActiveEncounterId(encounter.id);
                                                                        setShowAttackModal(true);
                                                                    }}
                                                                    className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg"
                                                                    disabled={!encounter.isActive}
                                                                >
                                                                    ⚔️ Atacar
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedParticipant(p);
                                                                        setShowStatusModal(true);
                                                                    }}
                                                                    className="text-xs px-2 py-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-lg"
                                                                >
                                                                    + Status
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2 mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-neutral-500 w-12">HP:</span>
                                                                <input
                                                                    type="number"
                                                                    value={p.hp}
                                                                    onChange={(e) => handleUpdateParticipant(p.id, { hp: parseInt(e.target.value) })}
                                                                    className="flex-1 bg-black/40 border border-red-500/30 rounded px-2 py-1 text-sm"
                                                                />
                                                                <span className="text-xs text-neutral-500">/ {p.maxHp}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-neutral-500 w-12">Mana:</span>
                                                                <input
                                                                    type="number"
                                                                    value={p.mana}
                                                                    onChange={(e) => handleUpdateParticipant(p.id, { mana: parseInt(e.target.value) })}
                                                                    className="flex-1 bg-black/40 border border-blue-500/30 rounded px-2 py-1 text-sm"
                                                                />
                                                                <span className="text-xs text-neutral-500">/ {p.maxMana}</span>
                                                            </div>
                                                        </div>

                                                        {p.statusEffects && p.statusEffects.length > 0 && (
                                                            <div className="space-y-1">
                                                                {p.statusEffects.map((status, idx) => (
                                                                    <div key={idx} className="text-xs bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 flex justify-between">
                                                                        <span>🔥 {status.name}</span>
                                                                        <span className="text-neutral-500">{status.duration} turnos</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* NPCs/MONSTROS */}
                                        <div>
                                            <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                                                👹 Inimigos
                                            </h4>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                {npcs.map(p => (
                                                    <div
                                                        key={p.id}
                                                        className={`rounded-xl p-4 border transition-all ${currentTurn?.id === p.id
                                                            ? 'bg-red-500/20 border-red-400 ring-2 ring-red-400'
                                                            : 'bg-red-500/5 border-red-500/30'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="font-bold text-lg">{p.name}</h4>
                                                                    {currentTurn?.id === p.id && (
                                                                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full animate-pulse">
                                                                            SUA VEZ
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-neutral-500">Iniciativa: {p.initiative}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setAttacker(p);
                                                                        setActiveEncounterId(encounter.id);
                                                                        setShowAttackModal(true);
                                                                    }}
                                                                    className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg"
                                                                    disabled={!encounter.isActive}
                                                                >
                                                                    ⚔️ Atacar
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedParticipant(p);
                                                                        setShowStatusModal(true);
                                                                    }}
                                                                    className="text-xs px-2 py-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-lg"
                                                                >
                                                                    + Status
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2 mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-neutral-500 w-12">HP:</span>
                                                                <input
                                                                    type="number"
                                                                    value={p.hp}
                                                                    onChange={(e) => handleUpdateParticipant(p.id, { hp: parseInt(e.target.value) })}
                                                                    className="flex-1 bg-black/40 border border-red-500/30 rounded px-2 py-1 text-sm"
                                                                />
                                                                <span className="text-xs text-neutral-500">/ {p.maxHp}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-neutral-500 w-12">Mana:</span>
                                                                <input
                                                                    type="number"
                                                                    value={p.mana}
                                                                    onChange={(e) => handleUpdateParticipant(p.id, { mana: parseInt(e.target.value) })}
                                                                    className="flex-1 bg-black/40 border border-blue-500/30 rounded px-2 py-1 text-sm"
                                                                />
                                                                <span className="text-xs text-neutral-500">/ {p.maxMana}</span>
                                                            </div>
                                                        </div>

                                                        {p.statusEffects && p.statusEffects.length > 0 && (
                                                            <div className="space-y-1">
                                                                {p.statusEffects.map((status, idx) => (
                                                                    <div key={idx} className="text-xs bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 flex justify-between">
                                                                        <span>🔥 {status.name}</span>
                                                                        <span className="text-neutral-500">{status.duration} turnos</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* STORIES - mantido igual ao anterior */}
                {activeTab === 'stories' && (
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold">Campanha & História</h2>
                            <button onClick={() => setShowStoryModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-500/25">
                                ✨ Nova Campanha
                            </button>
                        </div>

                        <div className="space-y-8">
                            {room?.stories?.map((story) => (
                                <div key={story.id} className="bg-neutral-900/50 border border-neutral-800/50 rounded-3xl p-6">
                                    <div className="border-b border-neutral-800/50 pb-4 mb-6">
                                        <h3 className="text-3xl font-bold text-purple-400 mb-2">{story.title}</h3>
                                        <p className="text-neutral-400 text-lg leading-relaxed">{story.summary}</p>
                                    </div>

                                    <div className="space-y-8">
                                        {story.acts.sort((a, b) => a.order - b.order).map((act) => (
                                            <div key={act.id} className="bg-neutral-800/30 rounded-2xl p-6 border border-neutral-700/30 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />
                                                <h4 className="font-bold text-xl mb-4 text-emerald-300">{act.title}</h4>
                                                <p className="text-neutral-300 mb-6 leading-relaxed">{act.description}</p>

                                                {/* Events Section */}
                                                <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                                                    <h5 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                                                        📝 Acontecimentos do Ato
                                                    </h5>
                                                    <textarea
                                                        value={editingEvents[act.id] ?? act.events ?? ""}
                                                        onChange={(e) => setEditingEvents(prev => ({ ...prev, [act.id]: e.target.value }))}
                                                        className="w-full px-3 py-2 bg-black/40 border border-amber-500/30 rounded-lg text-neutral-100 min-h-[80px] text-sm"
                                                        placeholder="Registre aqui o que aconteceu neste ato (ex: Os heróis derrotaram os goblins mas o líder fugiu...)"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveEvents(act.id)}
                                                        className="mt-2 text-xs bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 px-3 py-2 rounded-lg transition-colors"
                                                    >
                                                        💾 Salvar Acontecimentos
                                                    </button>
                                                </div>

                                                {/* Suggestions Section */}
                                                {act.metadata && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-black/20 p-4 rounded-xl border border-neutral-700/30">
                                                        {act.metadata.encounter && (
                                                            <div className="space-y-2">
                                                                <h5 className="text-red-400 font-bold flex items-center gap-2">⚔️ Combate Sugerido</h5>
                                                                <p className="font-semibold text-neutral-200">{act.metadata.encounter.name}</p>
                                                                <ul className="text-sm text-neutral-400 list-disc list-inside">
                                                                    {act.metadata.encounter.monsters?.map((m: any, i: number) => (
                                                                        <li key={i}>{m.count}x {m.name}</li>
                                                                    ))}
                                                                </ul>
                                                                <button
                                                                    onClick={() => handleCreateEncounter(act.metadata.encounter)}
                                                                    className="mt-2 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-300 px-3 py-2 rounded-lg transition-colors border border-red-500/30 w-full"
                                                                >
                                                                    Importar para Encontros
                                                                </button>
                                                            </div>
                                                        )}
                                                        {act.metadata.puzzle && (
                                                            <div className="space-y-2">
                                                                <h5 className="text-cyan-400 font-bold flex items-center gap-2">🧩 Puzzle / Desafio</h5>
                                                                <p className="font-semibold text-neutral-200">{act.metadata.puzzle.name}</p>
                                                                <p className="text-sm text-neutral-400">{act.metadata.puzzle.description}</p>
                                                                <p className="text-xs text-neutral-500 italic">Solução: {act.metadata.puzzle.solution}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="space-y-6">
                                                    {act.scenes.map((scene, idx) => (
                                                        <div key={scene.id} className="pl-4 border-l-2 border-neutral-700">
                                                            <div className="flex justify-between items-start gap-4 mb-3">
                                                                <div>
                                                                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Cena {idx + 1}</p>
                                                                    <p className="text-neutral-300 italic">"{scene.content}"</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleGenerateSceneImage(scene.id)}
                                                                    disabled={generatingImages[scene.id]}
                                                                    className="flex-shrink-0 p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 transition-all text-xs font-semibold border border-indigo-500/30"
                                                                >
                                                                    {generatingImages[scene.id] ? "🎨..." : scene.imageUrl ? "🔄 Re-roll" : "🎨 Arte"}
                                                                </button>
                                                            </div>
                                                            {scene.imageUrl && (
                                                                <img
                                                                    src={scene.imageUrl}
                                                                    className="w-full max-w-lg rounded-xl shadow-lg border border-neutral-700/50 mt-2 cursor-pointer hover:opacity-80 transition-opacity"
                                                                    onClick={() => window.open(scene.imageUrl!, '_blank')}
                                                                    title="Clique para abrir em nova janela"
                                                                    alt="Imagem da cena"
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Generate Next Act Button */}
                                    <div className="mt-8 flex justify-center">
                                        <button
                                            onClick={() => {
                                                setActiveStoryId(story.id);
                                                setShowNextActModal(true);
                                            }}
                                            className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-bold text-white shadow-lg overflow-hidden transition-all hover:scale-105 active:scale-95"
                                        >
                                            <span className="relative z-10 flex items-center gap-2">➕ Gerar Próximo Ato</span>
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {(!room?.stories || room.stories.length === 0) && (
                                <div className="text-center py-20 bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-800">
                                    <p className="text-neutral-500 text-lg">Nenhuma campanha ativa.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Modals */}
            {/* Manual Encounter Modal */}
            {showManualEncounterModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6">⚔️ Criar Encontro Manual</h2>

                        <div className="space-y-6">
                            {/* Nome do Encontro */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Nome do Encontro</label>
                                <input
                                    type="text"
                                    value={manualEncounterName}
                                    onChange={(e) => setManualEncounterName(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-neutral-700 rounded-xl text-neutral-100"
                                    placeholder="Ex: Emboscada de Goblins"
                                />
                            </div>

                            {/* Carregar Templates */}
                            {availableTemplates.length === 0 && (
                                <button
                                    onClick={() => loadMonsterTemplates(true)}
                                    className="w-full px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                                >
                                    📚 Carregar Templates de Monstros
                                </button>
                            )}

                            {/* Lista de Templates */}
                            {availableTemplates.length > 0 && (
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-300 mb-2">Selecionar Monstros</label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {availableTemplates.map((template) => {
                                            const selected = selectedMonsters.find(m => m.templateId === template.id);
                                            return (
                                                <div key={template.id} className="flex items-center gap-3 p-3 bg-black/40 border border-neutral-700 rounded-xl">
                                                    <div className="flex-1">
                                                        <p className="font-bold">{template.name}</p>
                                                        <p className="text-xs text-neutral-500">
                                                            HP: {template.hp} | Força: {template.forca} | Destreza: {template.destreza}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {selected ? (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedMonsters(prev =>
                                                                            prev.map(m =>
                                                                                m.templateId === template.id
                                                                                    ? { ...m, count: Math.max(1, m.count - 1) }
                                                                                    : m
                                                                            )
                                                                        );
                                                                    }}
                                                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-bold"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="w-8 text-center font-bold">{selected.count}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedMonsters(prev =>
                                                                            prev.map(m =>
                                                                                m.templateId === template.id
                                                                                    ? { ...m, count: m.count + 1 }
                                                                                    : m
                                                                            )
                                                                        );
                                                                    }}
                                                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-bold"
                                                                >
                                                                    +
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedMonsters(prev =>
                                                                            prev.filter(m => m.templateId !== template.id)
                                                                        );
                                                                    }}
                                                                    className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedMonsters(prev => [
                                                                        ...prev,
                                                                        { templateId: template.id, name: template.name, count: 1 }
                                                                    ]);
                                                                }}
                                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-semibold"
                                                            >
                                                                + Adicionar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Resumo */}
                            {selectedMonsters.length > 0 && (
                                <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
                                    <p className="text-sm font-semibold text-emerald-400 mb-2">Monstros Selecionados:</p>
                                    <ul className="space-y-1">
                                        {selectedMonsters.map((m, idx) => (
                                            <li key={idx} className="text-sm text-neutral-300">
                                                • {m.count}x {m.name}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-xs text-neutral-500 mt-2">
                                        Total: {selectedMonsters.reduce((sum, m) => sum + m.count, 0)} monstros
                                    </p>
                                </div>
                            )}

                            {/* Botões */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowManualEncounterModal(false);
                                        setManualEncounterName('');
                                        setSelectedMonsters([]);
                                        setAvailableTemplates([]);
                                    }}
                                    className="flex-1 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateManualEncounter}
                                    disabled={!manualEncounterName.trim() || selectedMonsters.length === 0}
                                    className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ⚔️ Criar Encontro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showStoryModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6">Nova Campanha</h2>
                        <form onSubmit={handleGenerateStory} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Tema / Conceito</label>
                                <textarea
                                    value={storyTheme}
                                    onChange={(e) => setStoryTheme(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-neutral-700 rounded-xl text-neutral-100 min-h-[120px]"
                                    placeholder="Ex: Explorar as ruínas submersas de Atlântica..."
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowStoryModal(false)} className="flex-1 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-semibold">Cancelar</button>
                                <button type="submit" disabled={generatingStory} className="flex-1 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold">
                                    {generatingStory ? "Gerando..." : "Criar Campanha"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showNextActModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4">Gerar Próximo Ato</h2>
                        <p className="text-neutral-400 text-sm mb-4">O que os jogadores fizeram no ato anterior? A IA usará isso para adaptar a história.</p>
                        <form onSubmit={handleGenerateNextAct} className="space-y-4">
                            <div>
                                <textarea
                                    value={nextActInput}
                                    onChange={(e) => setNextActInput(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/40 border border-neutral-700 rounded-xl text-neutral-100 min-h-[120px]"
                                    placeholder="Ex: Eles se aliaram aos goblins contra o dragão..."
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowNextActModal(false)} className="flex-1 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-semibold">Cancelar</button>
                                <button type="submit" disabled={generatingAct} className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                                    {generatingAct ? "Gerando..." : "Gerar Ato"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showStatusModal && selectedParticipant && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4">Adicionar Status Effect</h2>
                        <p className="text-neutral-400 text-sm mb-4">Para: {selectedParticipant.name}</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Nome do Status</label>
                                <input
                                    type="text"
                                    value={newStatus.name}
                                    onChange={(e) => setNewStatus(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-2 bg-black/40 border border-neutral-700 rounded-xl text-neutral-100"
                                    placeholder="Ex: Envenenado, Atordoado..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Duração (turnos)</label>
                                <input
                                    type="number"
                                    value={newStatus.duration}
                                    onChange={(e) => setNewStatus(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                                    className="w-full px-4 py-2 bg-black/40 border border-neutral-700 rounded-xl text-neutral-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Efeito</label>
                                <input
                                    type="text"
                                    value={newStatus.effect}
                                    onChange={(e) => setNewStatus(prev => ({ ...prev, effect: e.target.value }))}
                                    className="w-full px-4 py-2 bg-black/40 border border-neutral-700 rounded-xl text-neutral-100"
                                    placeholder="Ex: -2 Velocidade, -5 HP por turno..."
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowStatusModal(false)} className="flex-1 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-semibold">Cancelar</button>
                                <button onClick={handleAddStatus} className="flex-1 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold">
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Attack Modal */}
            {showAttackModal && attacker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4">⚔️ {attacker.name} - Selecionar Alvo</h2>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-neutral-300 mb-2">Tipo de Ataque</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAttackType('melee')}
                                    className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-all ${attackType === 'melee' ? 'bg-red-600' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                                >
                                    🗡️ Corpo a Corpo (Força)
                                </button>
                                <button
                                    onClick={() => setAttackType('ranged')}
                                    className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-all ${attackType === 'ranged' ? 'bg-red-600' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                                >
                                    🏹 À Distância (Destreza)
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 mb-6">
                            <h3 className="font-semibold text-neutral-400 text-sm">Alvos Disponíveis:</h3>
                            {room?.encounters.find((e: any) => e.id === activeEncounterId)?.participants
                                .filter((p: any) => p.id !== attacker.id && p.hp > 0)
                                .map((target: any) => (
                                    <button
                                        key={target.id}
                                        onClick={() => handleAttack(target.id)}
                                        className={`w-full p-4 rounded-xl text-left transition-all ${target.isNPC
                                            ? 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20'
                                            : 'bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold">{target.name}</p>
                                                <p className="text-xs text-neutral-500">{target.isNPC ? '👹 NPC' : '🎮 Jogador'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm"><span className="text-red-400">❤️</span> {target.hp}/{target.maxHp}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                        </div>

                        <button
                            onClick={() => {
                                setShowAttackModal(false);
                                setAttacker(null);
                            }}
                            className="w-full px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-semibold"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Ability Creation Modal */}
            {showAbilityModal && selectedCharacterForAbility && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-6">
                            ✨ Criar Habilidade para {selectedCharacterForAbility.character.name}
                        </h2>

                        <form onSubmit={handleCreateAbility} className="space-y-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Nome da Habilidade</label>
                                <input
                                    type="text"
                                    value={newAbility.name}
                                    onChange={(e) => setNewAbility({ ...newAbility, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-purple-500/50"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Descrição</label>
                                <textarea
                                    value={newAbility.description}
                                    onChange={(e) => setNewAbility({ ...newAbility, description: e.target.value })}
                                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-purple-500/50 h-24"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Custo de Mana</label>
                                    <input
                                        type="number"
                                        value={newAbility.manaCost}
                                        onChange={(e) => setNewAbility({ ...newAbility, manaCost: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-purple-500/50"
                                        min="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Tipo</label>
                                    <select
                                        value={newAbility.abilityType}
                                        onChange={(e) => setNewAbility({ ...newAbility, abilityType: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-purple-500/50"
                                    >
                                        <option value="attack">Ataque</option>
                                        <option value="heal">Cura</option>
                                        <option value="buff">Buff</option>
                                        <option value="debuff">Debuff</option>
                                        <option value="protection">Proteção</option>
                                    </select>
                                </div>
                            </div>

                            {/* Conditional Fields Based on Type */}
                            {newAbility.abilityType === 'attack' && (
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Dano</label>
                                    <input
                                        type="number"
                                        value={newAbility.damage}
                                        onChange={(e) => setNewAbility({ ...newAbility, damage: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-purple-500/50"
                                        min="0"
                                    />
                                </div>
                            )}

                            {newAbility.abilityType === 'heal' && (
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Cura</label>
                                    <input
                                        type="number"
                                        value={newAbility.healing}
                                        onChange={(e) => setNewAbility({ ...newAbility, healing: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-purple-500/50"
                                        min="0"
                                    />
                                </div>
                            )}

                            {newAbility.abilityType === 'buff' && (
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Valor do Buff</label>
                                    <input
                                        type="number"
                                        value={newAbility.buffValue}
                                        onChange={(e) => setNewAbility({ ...newAbility, buffValue: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-purple-500/50"
                                        min="0"
                                    />
                                </div>
                            )}

                            {newAbility.abilityType === 'debuff' && (
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Valor do Debuff</label>
                                    <input
                                        type="number"
                                        value={newAbility.debuffValue}
                                        onChange={(e) => setNewAbility({ ...newAbility, debuffValue: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-purple-500/50"
                                        min="0"
                                    />
                                </div>
                            )}

                            {newAbility.abilityType === 'protection' && (
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-2">Valor da Proteção</label>
                                    <input
                                        type="number"
                                        value={newAbility.protectionValue}
                                        onChange={(e) => setNewAbility({ ...newAbility, protectionValue: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-purple-500/50"
                                        min="0"
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAbilityModal(false);
                                        setSelectedCharacterForAbility(null);
                                    }}
                                    className="flex-1 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                                >
                                    Criar Habilidade
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Combat Log */}
            {combatLog.length > 0 && (
                <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl p-4 shadow-2xl z-40">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold">📜 Log de Combate</h3>
                        <button
                            onClick={() => setCombatLog([])}
                            className="text-xs px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded"
                        >
                            Limpar
                        </button>
                    </div>
                    <div className="space-y-2">
                        {combatLog.map((log: any, idx: number) => (
                            <div key={idx} className={`p-3 rounded-lg text-sm ${log.hit ? 'bg-red-500/10 border border-red-500/30' : 'bg-neutral-800/50'}`}>
                                <p className="font-semibold">
                                    {log.attackerName} → {log.targetName}
                                </p>
                                <p className="text-xs text-neutral-400">
                                    🎲 Rolou {log.attackRoll} + {log.attackBonus} = {log.totalAttack} vs Defesa {log.targetDefense}
                                </p>
                                {log.hit ? (
                                    <p className="text-xs text-red-400 font-semibold">
                                        {log.critical ? '💥 CRÍTICO! ' : '✅ ACERTOU! '}
                                        Dano: {log.damage} | HP Restante: {log.remainingHp}
                                    </p>
                                ) : (
                                    <p className="text-xs text-neutral-500">❌ ERROU!</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
