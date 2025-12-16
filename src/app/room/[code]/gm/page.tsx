"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

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
    }>;
    stories: Array<{
        id: string;
        title: string;
        summary: string | null;
        status: string;
        acts: Array<{
            id: string;
            title: string;
            description: string | null;
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

    // Scene Image States
    const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});

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
            setRoom(data.room);
            setLoading(false);
        } catch (e) {
            console.error("Erro ao carregar sala:", e);
            router.push("/lobby");
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
                const data = await res.json();
                setShowStoryModal(false);
                setStoryTheme("");
                loadRoom(); // Recarregar para mostrar a nova história
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
            {/* Decorative background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
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
                                <p className="text-neutral-400 text-sm">Código: {room.joinCode}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push(`/room/${code}/player`)}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all"
                            >
                                🎮 Jogar como Jogador
                            </button>
                            <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-sm font-semibold">
                                👑 Game Master
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 font-medium overflow-x-auto pb-2">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'overview'
                                ? 'bg-purple-600 text-white'
                                : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700/50'
                                }`}
                        >
                            Visão Geral
                        </button>
                        <button
                            onClick={() => setActiveTab('characters')}
                            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'characters'
                                ? 'bg-purple-600 text-white'
                                : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700/50'
                                }`}
                        >
                            Personagens ({room.characterRooms.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('encounters')}
                            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'encounters'
                                ? 'bg-purple-600 text-white'
                                : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700/50'
                                }`}
                        >
                            Encontros
                        </button>
                        <button
                            onClick={() => setActiveTab('stories')}
                            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'stories'
                                ? 'bg-purple-600 text-white'
                                : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700/50'
                                }`}
                        >
                            História (IA)
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative max-w-7xl mx-auto px-4 py-8">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Room Info */}
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
                                    <p className="text-2xl font-bold">
                                        {room.encounters.filter(e => e.isActive).length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Members */}
                        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-4">Membros da Sala</h2>
                            <div className="space-y-2">
                                {room.members.map((member) => (
                                    <div
                                        key={member.userId}
                                        className="flex items-center justify-between bg-neutral-800/50 rounded-xl p-4"
                                    >
                                        <div>
                                            <p className="font-semibold">
                                                {member.user.displayName || member.user.email}
                                            </p>
                                            <p className="text-neutral-400 text-sm">{member.user.email}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${member.role === 'gm'
                                            ? 'bg-purple-500/20 text-purple-400'
                                            : 'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                            {member.role === 'gm' ? 'GM' : 'Jogador'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

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
                                    <div
                                        key={cr.id}
                                        className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-5"
                                    >
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-purple-500/20 flex items-center justify-center text-2xl">
                                                {cr.character.avatarUrl ? (
                                                    <img
                                                        src={cr.character.avatarUrl}
                                                        alt={cr.character.name}
                                                        className="w-full h-full rounded-xl object-cover"
                                                    />
                                                ) : (
                                                    "⚔️"
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg">{cr.character.name}</h3>
                                                <p className="text-neutral-400 text-sm">
                                                    {cr.character.class || "Sem classe"} • {cr.character.race || "Sem raça"}
                                                </p>
                                            </div>
                                        </div>

                                        {cr.roomStats && (
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="bg-neutral-900/50 rounded-lg p-2">
                                                    <p className="text-neutral-500 text-xs">HP</p>
                                                    <p className="font-bold">{cr.roomStats.hp}</p>
                                                </div>
                                                <div className="bg-neutral-900/50 rounded-lg p-2">
                                                    <p className="text-neutral-500 text-xs">Mana</p>
                                                    <p className="font-bold">{cr.roomStats.mana}</p>
                                                </div>
                                                <div className="bg-neutral-900/50 rounded-lg p-2">
                                                    <p className="text-neutral-500 text-xs">Força</p>
                                                    <p className="font-bold">{cr.roomStats.forca}</p>
                                                </div>
                                                <div className="bg-neutral-900/50 rounded-lg p-2">
                                                    <p className="text-neutral-500 text-xs">Destreza</p>
                                                    <p className="font-bold">{cr.roomStats.destreza}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'encounters' && (
                    <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Encontros</h2>
                            <button className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all">
                                Criar Encontro
                            </button>
                        </div>
                        <div className="text-center py-12">
                            <p className="text-neutral-500">Sistema de encontros em desenvolvimento.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'stories' && (
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold">Campanha & História</h2>
                            <button
                                onClick={() => setShowStoryModal(true)}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-lg shadow-purple-500/25"
                            >
                                ✨ Criar História com IA
                            </button>
                        </div>

                        <div className="space-y-8">
                            {room?.stories?.map((story) => (
                                <div key={story.id} className="bg-neutral-900/50 border border-neutral-800/50 rounded-3xl p-6">
                                    <div className="border-b border-neutral-800/50 pb-4 mb-6">
                                        <h3 className="text-2xl font-bold text-purple-400 mb-2">{story.title}</h3>
                                        <p className="text-neutral-400">{story.summary}</p>
                                    </div>

                                    <div className="space-y-4">
                                        {story.acts.map((act) => (
                                            <div key={act.id} className="bg-neutral-800/30 rounded-xl p-4 border border-neutral-700/30">
                                                <h4 className="font-bold text-lg mb-2 text-emerald-300">{act.title}</h4>
                                                <p className="text-neutral-300 text-sm mb-4">{act.description}</p>

                                                <div className="space-y-3 pl-4 border-l-2 border-neutral-700">
                                                    {act.scenes.map((scene, idx) => (
                                                        <div key={scene.id} className="mb-6 pb-4 border-b border-neutral-700/30 last:border-0">
                                                            <div className="flex justify-between items-start gap-4 mb-3">
                                                                <div>
                                                                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Cena {idx + 1}</p>
                                                                    <p className="text-neutral-300 italic">"{scene.content}"</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleGenerateSceneImage(scene.id)}
                                                                    disabled={generatingImages[scene.id]}
                                                                    className="flex-shrink-0 p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 hover:text-indigo-300 transition-all text-xs font-semibold border border-indigo-500/30"
                                                                >
                                                                    {generatingImages[scene.id] ? "🎨..." : scene.imageUrl ? "🔄 Re-roll" : "🎨 Arte"}
                                                                </button>
                                                            </div>

                                                            {scene.imageUrl && (
                                                                <div className="relative group">
                                                                    <img
                                                                        src={scene.imageUrl}
                                                                        alt="Cena da história"
                                                                        className="w-full max-w-lg rounded-xl shadow-lg border border-neutral-700/50"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {(!room?.stories || room.stories.length === 0) && (
                                <div className="text-center py-20 bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-800">
                                    <p className="text-neutral-500 text-lg">Nenhuma história criada ainda.</p>
                                    <p className="text-neutral-600">Use a IA para gerar uma campanha épica!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Create Story Modal */}
            {showStoryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Criar História com IA</h2>
                        <form onSubmit={handleGenerateStory} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Tema / Conceito</label>
                                <textarea
                                    placeholder="Ex: Uma praga zumbi em um reino medieval onde a magia está morrendo..."
                                    value={storyTheme}
                                    onChange={(e) => setStoryTheme(e.target.value)}
                                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 min-h-[120px]"
                                    required
                                />
                                <p className="text-xs text-neutral-500 mt-2">
                                    O Mistral irá gerar uma estrutura de 4 a 10 atos baseada neste tema.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowStoryModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all font-semibold"
                                    disabled={generatingStory}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all disabled:opacity-50 shadow-lg shadow-purple-900/20"
                                    disabled={generatingStory}
                                >
                                    {generatingStory ? "✨ Gerando..." : "✨ Criar História"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
