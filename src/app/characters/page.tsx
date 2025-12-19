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
    const [abilityTemplates, setAbilityTemplates] = useState<any[]>([]);

    // Modais
    const [showClassModal, setShowClassModal] = useState(false);
    const [showRaceModal, setShowRaceModal] = useState(false);
    const [showWeaponModal, setShowWeaponModal] = useState(false);
    const [showAbilityModal, setShowAbilityModal] = useState(false);

    // Preview de avatar
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
    const [generatingPreview, setGeneratingPreview] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);

    // Habilidades selecionadas
    const [selectedAbilities, setSelectedAbilities] = useState<any[]>([]);

    // Estado para nova habilidade customizada
    const [customAbility, setCustomAbility] = useState({
        name: "",
        description: "",
        manaCost: 0,
        // Campos compatíveis com o sistema completo
        effectType: 'DAMAGE' as 'DAMAGE' | 'HEAL' | 'BUFF' | 'DEBUFF',
        rarity: "comum" as "comum" | "incomum" | "raro" | "epico" | "lendario",
        baseDamage: 0,
        diceCount: 1,
        diceType: 6,
        scalingStat: 'forca' as 'forca' | 'destreza' | 'inteligencia',
        targetStat: 'defesa' as 'forca' | 'destreza' | 'inteligencia' | 'defesa' | 'velocidade',
        effectValue: 0,
        duration: 1
    });
    const [isGeneratingAbility, setIsGeneratingAbility] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [abilityModalTab, setAbilityModalTab] = useState<'list' | 'create'>('list');

    // Inferir atributo de escala baseado na classe
    useEffect(() => {
        if (!newChar.class) return;
        const cls = newChar.class.toLowerCase();
        let stat: 'forca' | 'destreza' | 'inteligencia' = 'forca';

        if (cls.includes('mag') || cls.includes('wiz') || cls.includes('feit') || cls.includes('brux') || cls.includes('clér') || cls.includes('sacer')) {
            stat = 'inteligencia';
        } else if (cls.includes('lad') || cls.includes('rog') || cls.includes('arq') || cls.includes('rang') || cls.includes('cac')) {
            stat = 'destreza';
        }

        setCustomAbility(prev => ({ ...prev, scalingStat: stat }));
    }, [newChar.class]);

    // Recalcular stats quando raridade ou tipo mudar
    useEffect(() => {
        const stats = calculateAbilityStats(customAbility.effectType, customAbility.rarity);
        setCustomAbility(prev => ({
            ...prev,
            ...stats
        }));
    }, [customAbility.effectType, customAbility.rarity]);

    function calculateAbilityStats(type: string, rarity: string) {
        // Valores base
        let diceCount = 1;
        let diceType = 6;
        let baseDamage = 0;
        let manaCost = 3;
        let effectValue = 2;
        let duration = 2;

        switch (rarity) {
            case 'comum':
                diceCount = 1; diceType = 6; baseDamage = 0; manaCost = 3;
                effectValue = 2; duration = 2;
                break;
            case 'incomum':
                diceCount = 1; diceType = 8; baseDamage = 2; manaCost = 5;
                effectValue = 3; duration = 3;
                break;
            case 'raro':
                diceCount = 2; diceType = 6; baseDamage = 5; manaCost = 8;
                effectValue = 4; duration = 3;
                break;
            case 'epico':
                diceCount = 3; diceType = 6; baseDamage = 8; manaCost = 12;
                effectValue = 5; duration = 4;
                break;
            case 'lendario':
                diceCount = 4; diceType = 8; baseDamage = 12; manaCost = 20;
                effectValue = 8; duration = 5;
                break;
        }

        return { diceCount, diceType, baseDamage, manaCost, effectValue, duration };
    }

    const analyzeAbility = async () => {
        if (!customAbility.name) return;
        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/ai/analyze-ability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: customAbility.name })
            });

            if (res.ok) {
                const data = await res.json();
                // Atualizar estado com dados da IA
                // O useEffect vai disparar e calcular os dados numéricos baseados na raridade/tipo
                setCustomAbility(prev => ({
                    ...prev,
                    rarity: data.rarity || 'comum',
                    effectType: data.effectType || 'DAMAGE',
                    scalingStat: data.scalingStat || 'forca',
                    targetStat: data.targetStat || 'defesa',
                    description: data.description || prev.description
                }));
            } else {
                alert("Erro ao analisar habilidade.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const generateAbilityDescription = async () => {
        if (!customAbility.name) {
            alert("Preencha o nome da habilidade primeiro!");
            return;
        }
        setIsGeneratingAbility(true);
        try {
            // Criar contexto para a IA
            let context = `Tipo: ${customAbility.effectType === 'DAMAGE' ? 'Dano' : customAbility.effectType === 'HEAL' ? 'Cura' : customAbility.effectType === 'BUFF' ? 'Buff' : 'Debuff'}
            Raridade: ${customAbility.rarity}`;

            if (customAbility.effectType === 'DAMAGE' || customAbility.effectType === 'HEAL') {
                context += `\nDados: ${customAbility.diceCount}d${customAbility.diceType} + ${customAbility.baseDamage}`;
            } else {
                context += `\nValor: ${customAbility.effectValue}, Duração: ${customAbility.duration} turnos`;
            }

            const res = await fetch('/api/ai/generate-description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'ability',
                    name: customAbility.name,
                    context: context
                })
            });

            if (res.ok) {
                const data = await res.json();
                setCustomAbility(prev => ({
                    ...prev,
                    description: data.description
                }));
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar descrição com IA");
        } finally {
            setIsGeneratingAbility(false);
        }
    };

    const commonWeapons = [
        "Espada Longa", "Espada Curta", "Machado de Batalha", "Martelo de Guerra",
        "Arco Longo", "Besta", "Adaga", "Lança", "Cajado", "Varinha Mágica",
        "Machado Duplo", "Foice", "Maça", "Mangual", "Katana"
    ];

    const calculatedStats = useMemo(() => {
        const classT = classTemplates.find(c => c.name.toLowerCase() === newChar.class?.toLowerCase());
        const raceT = raceTemplates.find(r => r.name.toLowerCase() === newChar.race?.toLowerCase());

        // Valores base padrão se não encontrar template
        const base = classT || {
            baseHp: 10, baseMana: 5, baseForca: 3, baseDestreza: 3,
            baseInteligencia: 3, baseDefesa: 3, baseVelocidade: 3
        };

        // Se achou template usa, senão se tiver nome digitado simula um bônus genérico visual
        const mod = raceT || (newChar.race ? {
            modHp: 3, modMana: 3, modForca: 1, modDestreza: 0,
            modInteligencia: 0, modDefesa: 0, modVelocidade: 0
        } : {
            modHp: 0, modMana: 0, modForca: 0, modDestreza: 0,
            modInteligencia: 0, modDefesa: 0, modVelocidade: 0
        });

        let bonus = { forca: 0, destreza: 0, inteligencia: 0, defesa: 0, velocidade: 0 };

        if (newChar.weapon) {
            const w = newChar.weapon.toLowerCase();
            if (['espada longa', 'machado de batalha', 'martelo de guerra', 'machado duplo', 'maça'].some(t => w.includes(t))) {
                bonus.forca = 2;
            } else if (['arco', 'besta', 'foice'].some(t => w.includes(t))) {
                bonus.destreza = 2;
            } else if (['adaga', 'espada curta', 'katana', 'mangual'].some(t => w.includes(t))) {
                bonus.forca = 1; bonus.destreza = 1;
            } else if (['cajado', 'varinha'].some(t => w.includes(t))) {
                bonus.inteligencia = 2;
            } else {
                // Estimativa para arma custom (Backend fará aleatório, aqui mostramos +1/+1 genérico)
                bonus.forca = 1; bonus.velocidade = 1;
            }
        }

        return {
            hp: (base.baseHp || 10) + (mod.modHp || 0),
            mana: (base.baseMana || 5) + (mod.modMana || 0),
            forca: (base.baseForca || 3) + (mod.modForca || 0) + bonus.forca,
            destreza: (base.baseDestreza || 3) + (mod.modDestreza || 0) + bonus.destreza,
            inteligencia: (base.baseInteligencia || 3) + (mod.modInteligencia || 0) + bonus.inteligencia,
            defesa: (base.baseDefesa || 3) + (mod.modDefesa || 0) + bonus.defesa,
            velocidade: (base.baseVelocidade || 3) + (mod.modVelocidade || 0) + bonus.velocidade,
        };
    }, [newChar.class, newChar.race, newChar.weapon, classTemplates, raceTemplates]);

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
            const [classesRes, racesRes, abilitiesRes] = await Promise.all([
                fetch('/api/templates/classes'),
                fetch('/api/templates/races'),
                fetch('/api/templates/abilities'),
            ]);

            if (classesRes.ok) {
                const data = await classesRes.json();
                setClassTemplates(data.classes || []);
            }
            if (racesRes.ok) {
                const data = await racesRes.json();
                setRaceTemplates(data.races || []);
            }
            if (abilitiesRes.ok) {
                const data = await abilitiesRes.json();
                setAbilityTemplates(data.abilities || []);
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
        setImageLoading(true); // Preparar para carregamento da imagem
        setPreviewAvatar(null); // Limpar anterior para mostrar loading
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
                    abilities: selectedAbilities,
                    withStats: true,
                    // Se já temos um preview, enviamos ele como o avatar final
                    avatarUrl: previewAvatar,
                    // Só geramos no backend se o usuário quer e NÃO gerou um preview ainda
                    generateAvatar: newChar.generateAvatar && !previewAvatar
                }),
            });

            if (res.ok) {
                setShowCreateForm(false);
                setNewChar({ name: "", class: "", race: "", weapon: "", appearance: "", generateAvatar: true });
                setSelectedAbilities([]);
                setPreviewAvatar(null);
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
                alert("Personagem deletado com sucesso!");
                loadCharacters();
            } else {
                const error = await res.json();
                console.error("Erro ao deletar:", error);
                alert(`Erro ao deletar personagem: ${error.error}\n${error.details || ''}`);
            }
        } catch (e) {
            console.error("Erro ao deletar personagem", e);
            alert("Erro ao deletar personagem. Verifique o console para mais detalhes.");
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
                                        <p className="text-[10px] text-neutral-500 mt-2 text-center italic">
                                            * Estimativa: Armas e Raças novas recebem bônus aleatórios ao criar.
                                        </p>
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

                            {/* Habilidades */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-300 mb-2">Habilidades (Máx 3)</label>
                                <div className="space-y-2">
                                    {selectedAbilities.map((ability, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
                                            <div>
                                                <div className="font-bold text-emerald-400">{ability.name}</div>
                                                <div className="text-xs text-neutral-400">{ability.description ? (ability.description.length > 50 ? ability.description.slice(0, 50) + '...' : ability.description) : ''}</div>
                                                <div className="text-xs text-blue-400 mt-1">{ability.manaCost} Mana • {ability.abilityType || 'Geral'}</div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newAbilities = [...selectedAbilities];
                                                    newAbilities.splice(index, 1);
                                                    setSelectedAbilities(newAbilities);
                                                }}
                                                className="text-red-400 hover:text-red-300 px-2"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}

                                    {selectedAbilities.length < 3 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAbilityModal(true)}
                                            className="w-full py-3 rounded-xl border-2 border-dashed border-neutral-700 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-neutral-400 hover:text-emerald-400 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span>✨ Adicionar Habilidade</span>
                                        </button>
                                    )}
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
                                            <p className="font-semibold text-indigo-300 mb-2">Seu Avatar</p>
                                            <p className="text-xs text-neutral-400 mb-3">
                                                {previewAvatar
                                                    ? "Este avatar será salvo com seu personagem. Clique abaixo para trocar."
                                                    : "Gere um avatar único agora ou deixe para gerar automaticamente ao salvar."}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handlePreviewAvatar}
                                                disabled={generatingPreview || !newChar.name}
                                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                                            >
                                                {generatingPreview ? "🎨 Pintando..." : previewAvatar ? "🎲 Gerar Outra Opção" : "✨ Gerar Avatar Agora"}
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
                                    <div className="flex-shrink-0 relative w-32 h-32">
                                        {(generatingPreview || (previewAvatar && imageLoading)) && (
                                            <div className="absolute inset-0 z-10 bg-neutral-800/80 rounded-xl border-2 border-dashed border-indigo-500/30 flex flex-col items-center justify-center backdrop-blur-sm gap-2">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                                <span className="text-[10px] text-indigo-300 font-medium animate-pulse">Gerando...</span>
                                            </div>
                                        )}

                                        {previewAvatar ? (
                                            <img
                                                key={previewAvatar}
                                                src={previewAvatar}
                                                alt="Novo Avatar"
                                                onLoad={() => setImageLoading(false)}
                                                onError={() => setImageLoading(false)}
                                                className={`w-32 h-32 rounded-xl object-cover border-2 border-indigo-500/50`}
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

            {/* Modal de Seleção de Habilidades */}
            {showAbilityModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowAbilityModal(false)}>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

                        <div className="flex border-b border-neutral-800 mb-6">
                            <button
                                onClick={() => setAbilityModalTab('list')}
                                className={`flex-1 pb-3 text-center transition-colors font-bold ${abilityModalTab === 'list' ? 'text-white border-b-2 border-emerald-500' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                📋 Selecionar Lista
                            </button>
                            <button
                                onClick={() => setAbilityModalTab('create')}
                                className={`flex-1 pb-3 text-center transition-colors font-bold ${abilityModalTab === 'create' ? 'text-white border-b-2 border-emerald-500' : 'text-neutral-500 hover:text-neutral-300'}`}
                            >
                                ✨ Criar Nova
                            </button>
                        </div>

                        {abilityModalTab === 'list' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {abilityTemplates.map((ability) => (
                                    <button
                                        key={ability.id}
                                        onClick={() => {
                                            if (selectedAbilities.length >= 3) {
                                                alert("Máximo de 3 habilidades!");
                                                return;
                                            }
                                            if (selectedAbilities.find(a => a.id === ability.id)) {
                                                alert("Habilidade já selecionada!");
                                                return;
                                            }
                                            setSelectedAbilities([...selectedAbilities, ability]);
                                            setShowAbilityModal(false);
                                        }}
                                        className="p-4 rounded-xl bg-neutral-800/50 hover:bg-emerald-600/50 border border-neutral-700/50 hover:border-emerald-500 transition-all text-left"
                                    >
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold">{ability.name}</p>
                                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                                {ability.manaCost} MP
                                            </span>
                                        </div>
                                        <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{ability.description}</p>
                                        {ability.abilityType && (
                                            <span className="text-xs text-neutral-500 mt-2 block capitalize">
                                                Tipo: {ability.abilityType}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-300 mb-1">Nome da Habilidade</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={customAbility.name}
                                            onChange={(e) => setCustomAbility({ ...customAbility, name: e.target.value })}
                                            className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl focus:outline-none focus:border-emerald-500 text-white placeholder-neutral-500"
                                            placeholder="Ex: Bola de Fogo"
                                        />
                                        <button
                                            onClick={analyzeAbility}
                                            disabled={isAnalyzing || !customAbility.name}
                                            className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20"
                                            title="Preencher automaticamente com IA"
                                        >
                                            {isAnalyzing ? <span className="animate-spin">⏳</span> : '✨ Auto'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Digite o nome e clique em Auto para a IA criar tudo.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-300 mb-1">Tipo de Efeito</label>
                                        <select
                                            value={customAbility.effectType}
                                            onChange={(e) => setCustomAbility({ ...customAbility, effectType: e.target.value as any })}
                                            className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
                                        >
                                            <option value="DAMAGE">💥 Dano</option>
                                            <option value="HEAL">💚 Cura</option>
                                            <option value="BUFF">⬆️ Buff</option>
                                            <option value="DEBUFF">⬇️ Debuff</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-neutral-300 mb-1">Raridade</label>
                                        <select
                                            value={customAbility.rarity}
                                            onChange={(e) => setCustomAbility({ ...customAbility, rarity: e.target.value as any })}
                                            className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl focus:outline-none focus:border-emerald-500 text-white capitalize"
                                        >
                                            <option value="comum">Comum</option>
                                            <option value="incomum">Incomum</option>
                                            <option value="raro">Raro</option>
                                            <option value="epico">Épico</option>
                                            <option value="lendario">Lendário</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Preview Automático dos Stats */}
                                <div className="bg-neutral-800/30 border border-neutral-700/30 rounded-xl p-4">
                                    <h4 className="text-sm font-semibold text-neutral-400 mb-3 flex items-center gap-2">
                                        ⚙️ Configuração Automática (Baseada na Raridade)
                                    </h4>

                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-2 bg-neutral-900/50 rounded-lg">
                                            <div className="text-xs text-neutral-500 uppercase">Custo Mana</div>
                                            <div className="text-xl font-bold text-blue-400">{customAbility.manaCost}</div>
                                        </div>
                                        {(customAbility.effectType === 'DAMAGE' || customAbility.effectType === 'HEAL') ? (
                                            <>
                                                <div className="p-2 bg-neutral-900/50 rounded-lg">
                                                    <div className="text-xs text-neutral-500 uppercase">Dados</div>
                                                    <div className="text-xl font-bold text-purple-400">
                                                        {customAbility.diceCount}d{customAbility.diceType}
                                                    </div>
                                                </div>
                                                <div className="p-2 bg-neutral-900/50 rounded-lg">
                                                    <div className="text-xs text-neutral-500 uppercase">Base</div>
                                                    <div className="text-xl font-bold text-emerald-400">+{customAbility.baseDamage}</div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-2 bg-neutral-900/50 rounded-lg">
                                                    <div className="text-xs text-neutral-500 uppercase">Valor</div>
                                                    <div className="text-xl font-bold text-purple-400">{customAbility.effectValue}</div>
                                                </div>
                                                <div className="p-2 bg-neutral-900/50 rounded-lg">
                                                    <div className="text-xs text-neutral-500 uppercase">Duração</div>
                                                    <div className="text-xl font-bold text-emerald-400">{customAbility.duration}t</div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Configuração de Escala */}
                                    <div className="mt-4 pt-4 border-t border-neutral-700/30">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-neutral-500 uppercase mb-1">Escala com</label>
                                                <select
                                                    value={customAbility.scalingStat}
                                                    onChange={(e) => setCustomAbility({ ...customAbility, scalingStat: e.target.value as any })}
                                                    className="w-full px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-sm text-neutral-300"
                                                >
                                                    <option value="forca">Força</option>
                                                    <option value="destreza">Destreza</option>
                                                    <option value="inteligencia">Inteligência</option>
                                                </select>
                                            </div>
                                            {(customAbility.effectType === 'BUFF' || customAbility.effectType === 'DEBUFF') && (
                                                <div>
                                                    <label className="block text-xs text-neutral-500 uppercase mb-1">Afeta</label>
                                                    <select
                                                        value={customAbility.targetStat}
                                                        onChange={(e) => setCustomAbility({ ...customAbility, targetStat: e.target.value as any })}
                                                        className="w-full px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-sm text-neutral-300"
                                                    >
                                                        <option value="forca">Força</option>
                                                        <option value="destreza">Destreza</option>
                                                        <option value="inteligencia">Inteligência</option>
                                                        <option value="defesa">Defesa</option>
                                                        <option value="velocidade">Velocidade</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <label className="block text-sm font-semibold text-neutral-300">Descrição</label>
                                        <button
                                            onClick={generateAbilityDescription}
                                            disabled={isGeneratingAbility}
                                            className="text-xs px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 rounded-full transition-all disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {isGeneratingAbility ? '⏳ Gerando...' : '✨ Gerar com IA'}
                                        </button>
                                    </div>
                                    <textarea
                                        value={customAbility.description}
                                        onChange={(e) => setCustomAbility({ ...customAbility, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl focus:outline-none focus:border-emerald-500 text-white placeholder-neutral-500"
                                        rows={3}
                                        placeholder={isGeneratingAbility ? "A IA está escrevendo..." : "Descreva o efeito visual da habilidade..."}
                                        disabled={isGeneratingAbility}
                                    />
                                </div>

                                <button
                                    onClick={() => {
                                        if (!customAbility.name) {
                                            alert("Nome é obrigatório!");
                                            return;
                                        }
                                        if (selectedAbilities.length >= 3) {
                                            alert("Máximo de 3 habilidades!");
                                            return;
                                        }
                                        // Converter estado local para formato da ability TEMPLATE
                                        // O backend espera { name, description, amount, etc }
                                        // Mas aqui estamos criando um objeto que será enviado no array 'abilities'
                                        // O endpoint POST /api/characters vai receber e criar as CharacterRoomAbilities

                                        setSelectedAbilities([...selectedAbilities, {
                                            ...customAbility,
                                            id: 'custom-' + Date.now(),
                                            // Mapear campos para visualização na lista
                                            abilityType: customAbility.effectType === 'DAMAGE' ? 'Ataque' : customAbility.effectType === 'HEAL' ? 'Cura' : 'Suporte'
                                        }]);

                                        // Resetar form
                                        const defaultStats = calculateAbilityStats('DAMAGE', 'comum');
                                        setCustomAbility({
                                            name: "",
                                            description: "",
                                            effectType: "DAMAGE",
                                            rarity: "comum",
                                            scalingStat: 'forca',
                                            targetStat: 'defesa',
                                            ...defaultStats
                                        });
                                        setShowAbilityModal(false);
                                    }}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all text-white shadow-lg shadow-emerald-900/20"
                                >
                                    Adicionar Habilidade
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setShowAbilityModal(false)}
                            className="mt-6 w-full px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
