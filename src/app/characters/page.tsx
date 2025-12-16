"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Character {
    id: string;
    name: string;
    class: string | null;
    race: string | null;
    avatarUrl: string | null;
    stats?: any;
}

export default function CharactersPage() {
    const router = useRouter();
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editingChar, setEditingChar] = useState<Character | null>(null);
    const [updating, setUpdating] = useState(false);
    const [newChar, setNewChar] = useState({
        name: "",
        class: "",
        race: "",
        weapon: "",
        appearance: "",
        generateAvatar: true
    });

    // Templates
    const [classTemplates, setClassTemplates] = useState<any[]>([]);
    const [raceTemplates, setRaceTemplates] = useState<any[]>([]);

    // Modais
    const [showClassModal, setShowClassModal] = useState(false);
    const [showRaceModal, setShowRaceModal] = useState(false);
    const [showWeaponModal, setShowWeaponModal] = useState(false);

    // Preview de avatar
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
    const [generatingPreview, setGeneratingPreview] = useState(false);

    const commonWeapons = [
        "Espada Longa", "Espada Curta", "Machado de Batalha", "Martelo de Guerra",
        "Arco Longo", "Besta", "Adaga", "Lança", "Cajado", "Varinha Mágica",
        "Machado Duplo", "Foice", "Maça", "Mangual", "Katana"
    ];

    const calculatedStats = useMemo(() => {
        const classT = classTemplates.find(c => c.name === newChar.class);
        const raceT = raceTemplates.find(r => r.name === newChar.race);

        // Valores base padrão se não encontrar template
        const base = classT || {
            baseHp: 10, baseMana: 5, baseForca: 3, baseDestreza: 3,
            baseInteligencia: 3, baseDefesa: 3, baseVelocidade: 3
        };

        const mod = raceT || {
            modHp: 0, modMana: 0, modForca: 0, modDestreza: 0,
            modInteligencia: 0, modDefesa: 0, modVelocidade: 0
        };

        return {
            hp: (base.baseHp || 10) + (mod.modHp || 0),
            mana: (base.baseMana || 5) + (mod.modMana || 0),
            forca: (base.baseForca || 3) + (mod.modForca || 0),
            destreza: (base.baseDestreza || 3) + (mod.modDestreza || 0),
            inteligencia: (base.baseInteligencia || 3) + (mod.modInteligencia || 0),
            defesa: (base.baseDefesa || 3) + (mod.modDefesa || 0),
            velocidade: (base.baseVelocidade || 3) + (mod.modVelocidade || 0),
        };
    }, [newChar.class, newChar.race, classTemplates, raceTemplates]);

    useEffect(() => {
        loadCharacters();
        loadTemplates();
    }, []);

    async function loadCharacters() {
        try {
            const res = await fetch("/api/characters");
            if (res.ok) {
                const data = await res.json();
                setCharacters(data.characters);
            }
        } catch (e) {
            console.error("Erro ao carregar personagens", e);
        } finally {
            setLoading(false);
        }
    }

    async function loadTemplates() {
        try {
            const [classesRes, racesRes] = await Promise.all([
                fetch('/api/templates/classes'),
                fetch('/api/templates/races'),
            ]);

            if (classesRes.ok) {
                const data = await classesRes.json();
                setClassTemplates(data.classes || []);
            }
            if (racesRes.ok) {
                const data = await racesRes.json();
                setRaceTemplates(data.races || []);
            }
        } catch (e) {
            console.error("Erro ao carregar templates:", e);
        }
    }

    function selectClass(className: string) {
        setNewChar({ ...newChar, class: className });
        setShowClassModal(false);
    }

    function selectRace(raceName: string) {
        setNewChar({ ...newChar, race: raceName });
        setShowRaceModal(false);
    }

    function selectWeapon(weaponName: string) {
        setNewChar({ ...newChar, weapon: weaponName });
        setShowWeaponModal(false);
    }

    async function handlePreviewAvatar() {
        if (!newChar.name) {
            alert("Por favor, preencha pelo menos o nome do personagem");
            return;
        }

        setGeneratingPreview(true);
        try {
            // Chamar API para gerar preview
            const res = await fetch("/api/characters/preview-avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newChar.name,
                    class: newChar.class,
                    race: newChar.race,
                    weapon: newChar.weapon,
                    appearance: newChar.appearance,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setPreviewAvatar(data.avatarUrl);
            } else {
                alert("Erro ao gerar preview do avatar");
            }
        } catch (e) {
            console.error("Erro ao gerar preview:", e);
            alert("Erro ao gerar preview do avatar");
        } finally {
            setGeneratingPreview(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch("/api/characters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newChar.name,
                    class: newChar.class,
                    race: newChar.race,
                    weapon: newChar.weapon,
                    appearance: newChar.appearance,
                    withStats: true,
                    generateAvatar: newChar.generateAvatar
                }),
            });

            if (res.ok) {
                setShowCreateForm(false);
                setNewChar({ name: "", class: "", race: "", weapon: "", appearance: "", generateAvatar: true });
                loadCharacters();
                loadTemplates();
            } else {
                const error = await res.json();
                alert(error.error || "Erro ao criar personagem");
            }
        } catch (e) {
            console.error("Erro ao criar personagem", e);
            alert("Erro ao criar personagem");
        } finally {
            setCreating(false);
        }
    }

    function handleEdit(char: Character) {
        setEditingChar(char);
        setNewChar({
            name: char.name,
            class: char.class || "",
            race: char.race || "",
            weapon: "",
            appearance: "",
            generateAvatar: false
        });
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        if (!editingChar) return;

        setUpdating(true);
        try {
            const updateData: any = {
                name: newChar.name,
                class: newChar.class,
                race: newChar.race,
            };

            // Se tiver preview de avatar, incluir na atualização
            if (previewAvatar) {
                updateData.avatarUrl = previewAvatar;
            }

            const res = await fetch(`/api/characters/${editingChar.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            });

            if (res.ok) {
                setEditingChar(null);
                setPreviewAvatar(null);
                setNewChar({ name: "", class: "", race: "", weapon: "", appearance: "", generateAvatar: true });
                loadCharacters();
                loadTemplates();
            } else {
                const error = await res.json();
                alert(error.error || "Erro ao atualizar personagem");
            }
        } catch (e) {
            console.error("Erro ao atualizar personagem", e);
            alert("Erro ao atualizar personagem");
        } finally {
            setUpdating(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Tem certeza que deseja deletar este personagem?")) return;

        try {
            const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
            if (res.ok) {
                loadCharacters();
            }
        } catch (e) {
            console.error("Erro ao deletar personagem", e);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
                <LoadingSpinner text="Carregando personagens" size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100">
            {/* Header */}
            <header className="border-b border-neutral-800/50 bg-neutral-900/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
                        Meus Personagens
                    </h1>
                    <Link
                        href="/lobby"
                        className="px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-400 transition-all"
                    >
                        ← Voltar ao Lobby
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Create Button */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all"
                    >
                        {showCreateForm ? "Cancelar" : "+ Novo Personagem"}
                    </button>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                    <div className="mb-8 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-4">Criar Novo Personagem</h2>
                        <p className="text-neutral-400 text-sm mb-6">
                            Preencha os dados do personagem. Classes e raças novas serão adicionadas automaticamente aos templates! 🎨
                        </p>
                        <form onSubmit={handleCreate} className="space-y-6">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Nome do Personagem *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Aragorn, o Montante"
                                    value={newChar.name}
                                    onChange={(e) => setNewChar({ ...newChar, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Classe */}
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-300 mb-2">Classe</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Digite ou selecione"
                                            value={newChar.class}
                                            onChange={(e) => setNewChar({ ...newChar, class: e.target.value })}
                                            className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowClassModal(true)}
                                            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>

                                {/* Raça */}
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-300 mb-2">Raça</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Digite ou selecione"
                                            value={newChar.race}
                                            onChange={(e) => setNewChar({ ...newChar, race: e.target.value })}
                                            className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRaceModal(true)}
                                            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>

                                {/* Stats Preview */}
                                {(newChar.class || newChar.race) && (
                                    <div className="bg-neutral-800/30 border border-neutral-700/30 rounded-xl p-4 mb-4">
                                        <h4 className="text-sm font-semibold text-neutral-400 mb-2">Atributos Estimados</h4>
                                        <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-center">
                                            <div className="bg-neutral-900/50 rounded-lg p-2">
                                                <div className="text-xs text-neutral-500">HP</div>
                                                <div className="font-bold text-emerald-400">{calculatedStats.hp}</div>
                                            </div>
                                            <div className="bg-neutral-900/50 rounded-lg p-2">
                                                <div className="text-xs text-neutral-500">Mana</div>
                                                <div className="font-bold text-blue-400">{calculatedStats.mana}</div>
                                            </div>
                                            <div className="bg-neutral-900/50 rounded-lg p-2">
                                                <div className="text-xs text-neutral-500">FOR</div>
                                                <div className="font-bold">{calculatedStats.forca}</div>
                                            </div>
                                            <div className="bg-neutral-900/50 rounded-lg p-2">
                                                <div className="text-xs text-neutral-500">DES</div>
                                                <div className="font-bold">{calculatedStats.destreza}</div>
                                            </div>
                                            <div className="bg-neutral-900/50 rounded-lg p-2">
                                                <div className="text-xs text-neutral-500">INT</div>
                                                <div className="font-bold">{calculatedStats.inteligencia}</div>
                                            </div>
                                            <div className="bg-neutral-900/50 rounded-lg p-2">
                                                <div className="text-xs text-neutral-500">DEF</div>
                                                <div className="font-bold">{calculatedStats.defesa}</div>
                                            </div>
                                            <div className="bg-neutral-900/50 rounded-lg p-2">
                                                <div className="text-xs text-neutral-500">VEL</div>
                                                <div className="font-bold">{calculatedStats.velocidade}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Arma */}
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-300 mb-2">Arma Principal</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Digite ou selecione"
                                            value={newChar.weapon}
                                            onChange={(e) => setNewChar({ ...newChar, weapon: e.target.value })}
                                            className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowWeaponModal(true)}
                                            className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Aparência */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Aparência Física</label>
                                <textarea
                                    placeholder="Descreva a aparência: altura, cor de cabelo, olhos, roupas, cicatrizes, tatuagens, etc..."
                                    value={newChar.appearance}
                                    onChange={(e) => setNewChar({ ...newChar, appearance: e.target.value })}
                                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                                    rows={4}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    Quanto mais detalhes, melhor será o avatar gerado pela IA
                                </p>
                            </div>

                            {/* Gerar Avatar */}
                            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newChar.generateAvatar}
                                        onChange={(e) => setNewChar({ ...newChar, generateAvatar: e.target.checked })}
                                        className="w-5 h-5 rounded bg-neutral-800 border-neutral-600 text-purple-600 focus:ring-purple-500"
                                    />
                                    <div>
                                        <p className="font-semibold text-purple-300">🎨 Gerar Avatar com IA</p>
                                        <p className="text-xs text-neutral-400">
                                            Mistral AI irá criar um prompt otimizado e gerar um avatar único para seu personagem
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Preview de Avatar */}
                            {newChar.generateAvatar && (
                                <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-4">
                                    <div className="flex items-start gap-4">
                                        {previewAvatar ? (
                                            <div className="flex-shrink-0">
                                                <img
                                                    src={previewAvatar}
                                                    alt="Preview do Avatar"
                                                    className="w-32 h-32 rounded-xl object-cover border-2 border-indigo-500/50"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex-shrink-0 w-32 h-32 rounded-xl bg-neutral-800/50 border-2 border-dashed border-indigo-500/30 flex items-center justify-center">
                                                <span className="text-4xl">👤</span>
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="font-semibold text-indigo-300 mb-2">🔮 Pré-visualizar Avatar</p>
                                            <p className="text-xs text-neutral-400 mb-3">
                                                Veja como ficará o avatar antes de criar o personagem
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handlePreviewAvatar}
                                                disabled={generatingPreview || !newChar.name}
                                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {generatingPreview ? "🎨 Gerando..." : previewAvatar ? "🔄 Gerar Novo" : "✨ Gerar Preview"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                                <p className="text-blue-400 text-sm">
                                    💡 <strong>Dica:</strong> Classes, raças e armas novas serão automaticamente adicionadas aos templates com atributos baseados no tipo!
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
                            >
                                {creating ? "🎨 Criando personagem..." : "✨ Criar Personagem"}
                            </button>
                        </form>
                    </div>
                )}

                {/* Edit Form */}
                {editingChar && (
                    <div className="mb-8 bg-neutral-900/50 backdrop-blur-xl border border-orange-800/50 rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-4">Editar Personagem</h2>
                        <p className="text-neutral-400 text-sm mb-6">
                            Atualize os dados do personagem. O avatar não será alterado. 🎨
                        </p>
                        <form onSubmit={handleUpdate} className="space-y-6">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Nome do Personagem *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Aragorn, o Montante"
                                    value={newChar.name}
                                    onChange={(e) => setNewChar({ ...newChar, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-orange-500/50"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Classe */}
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-300 mb-2">Classe</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Digite ou selecione"
                                            value={newChar.class}
                                            onChange={(e) => setNewChar({ ...newChar, class: e.target.value })}
                                            className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-orange-500/50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowClassModal(true)}
                                            className="px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-all"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>

                                {/* Raça */}
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-300 mb-2">Raça</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Digite ou selecione"
                                            value={newChar.race}
                                            onChange={(e) => setNewChar({ ...newChar, race: e.target.value })}
                                            className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-orange-500/50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRaceModal(true)}
                                            className="px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-all"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>

                                {/* Arma */}
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-300 mb-2">Arma Principal</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Digite ou selecione"
                                            value={newChar.weapon}
                                            onChange={(e) => setNewChar({ ...newChar, weapon: e.target.value })}
                                            className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-orange-500/50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowWeaponModal(true)}
                                            className="px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-all"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Aparência Física */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Aparência Física</label>
                                <textarea
                                    placeholder="Descreva a aparência: altura, cor de cabelo, olhos, roupas, cicatrizes, tatuagens, etc..."
                                    value={newChar.appearance}
                                    onChange={(e) => setNewChar({ ...newChar, appearance: e.target.value })}
                                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-orange-500/50"
                                    rows={3}
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    Essencial para gerar um avatar preciso
                                </p>
                            </div>

                            {/* Preview de Avatar para Edição */}
                            <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-xl p-4">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                    <div className="flex-shrink-0">
                                        {previewAvatar ? (
                                            <img
                                                src={previewAvatar}
                                                alt="Novo Avatar"
                                                className="w-32 h-32 rounded-xl object-cover border-2 border-indigo-500/50"
                                            />
                                        ) : editingChar?.avatarUrl ? (
                                            <img
                                                src={editingChar.avatarUrl}
                                                alt="Avatar Atual"
                                                className="w-32 h-32 rounded-xl object-cover border-2 border-neutral-600/50"
                                            />
                                        ) : (
                                            <div className="w-32 h-32 rounded-xl bg-neutral-800/50 border-2 border-dashed border-indigo-500/30 flex items-center justify-center">
                                                <span className="text-4xl">👤</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-indigo-300 mb-2">
                                            {previewAvatar ? "🎨 Novo Avatar" : "🔄 Recriar Avatar"}
                                        </p>
                                        <p className="text-xs text-neutral-400 mb-3">
                                            {previewAvatar
                                                ? "Este será o novo avatar do personagem"
                                                : "Gere um novo avatar baseado nos dados atualizados"}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handlePreviewAvatar}
                                                disabled={generatingPreview || !newChar.name}
                                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {generatingPreview ? "🎨 Gerando..." : previewAvatar ? "🔄 Gerar Outro" : "✨ Gerar Novo Avatar"}
                                            </button>
                                            {previewAvatar && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewAvatar(null)}
                                                    className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-semibold transition-all"
                                                >
                                                    ❌ Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                                <p className="text-orange-400 text-sm">
                                    ⚠️ <strong>Nota:</strong> Classes e raças novas serão automaticamente adicionadas aos templates!
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingChar(null);
                                        setNewChar({ name: "", class: "", race: "", weapon: "", appearance: "", generateAvatar: true });
                                    }}
                                    className="flex-1 px-6 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 text-white font-semibold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
                                >
                                    {updating ? "💾 Salvando..." : "💾 Salvar Alterações"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Characters Grid */}
                {characters.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-neutral-500 text-lg">Nenhum personagem criado ainda.</p>
                        <p className="text-neutral-600 text-sm mt-2">Clique em "Novo Personagem" para começar!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {characters.map((char) => (
                            <div
                                key={char.id}
                                className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6 hover:border-emerald-500/50 transition-all group"
                            >
                                {/* Avatar */}
                                {char.avatarUrl && (
                                    <div className="mb-4">
                                        <img
                                            src={char.avatarUrl}
                                            alt={char.name}
                                            className="w-full aspect-square object-cover rounded-2xl"
                                        />
                                    </div>
                                )}

                                {/* Info */}
                                <h3 className="text-xl font-bold mb-2">{char.name}</h3>
                                <div className="flex gap-2 mb-4">
                                    {char.class && (
                                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm border border-emerald-500/30">
                                            {char.class}
                                        </span>
                                    )}
                                    {char.race && (
                                        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm border border-purple-500/30">
                                            {char.race}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(char)}
                                        className="flex-1 px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 text-center transition-all"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(char.id)}
                                        className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                                    >
                                        Deletar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal de Seleção de Classe */}
            {showClassModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowClassModal(false)}>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4">Selecionar Classe</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {classTemplates.map((cls) => (
                                <button
                                    key={cls.id}
                                    onClick={() => selectClass(cls.name)}
                                    className="p-4 rounded-xl bg-neutral-800/50 hover:bg-emerald-600 border border-neutral-700/50 hover:border-emerald-500 transition-all text-left"
                                >
                                    <p className="font-bold">{cls.name}</p>
                                    {cls.isGlobal && <span className="text-xs text-blue-400">Global</span>}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowClassModal(false)}
                            className="mt-6 w-full px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Seleção de Raça */}
            {showRaceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowRaceModal(false)}>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4">Selecionar Raça</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {raceTemplates.map((race) => (
                                <button
                                    key={race.id}
                                    onClick={() => selectRace(race.name)}
                                    className="p-4 rounded-xl bg-neutral-800/50 hover:bg-purple-600 border border-neutral-700/50 hover:border-purple-500 transition-all text-left"
                                >
                                    <p className="font-bold">{race.name}</p>
                                    {race.isGlobal && <span className="text-xs text-blue-400">Global</span>}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowRaceModal(false)}
                            className="mt-6 w-full px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Seleção de Arma */}
            {showWeaponModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowWeaponModal(false)}>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-4">Selecionar Arma</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {commonWeapons.map((weapon) => (
                                <button
                                    key={weapon}
                                    onClick={() => selectWeapon(weapon)}
                                    className="p-4 rounded-xl bg-neutral-800/50 hover:bg-orange-600 border border-neutral-700/50 hover:border-orange-500 transition-all text-left"
                                >
                                    <p className="font-bold">{weapon}</p>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowWeaponModal(false)}
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
