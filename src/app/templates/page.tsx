"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type TemplateType = 'classes' | 'races' | 'abilities' | 'weapons' | 'items' | 'monsters';

interface BaseTemplate {
    id: string;
    name: string;
    description: string | null;
    isGlobal: boolean;
}

export default function TemplatesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TemplateType>('classes');

    const [templates, setTemplates] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [processing, setProcessing] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userLoading, setUserLoading] = useState(true);
    const [selectedStoryType, setSelectedStoryType] = useState<string>('todos');

    const [formData, setFormData] = useState<any>({});
    const [counts, setCounts] = useState({
        classes: 0, races: 0, abilities: 0, weapons: 0, items: 0, monsters: 0
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Lógica para calcular stats de habilidade
    function calculateAbilityStats(type: string, rarity: string) {
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
                diceCount = 2; diceType = 6; baseDamage = 4; manaCost = 8;
                effectValue = 5; duration = 3;
                break;
            case 'épico':
                diceCount = 4; diceType = 6; baseDamage = 8; manaCost = 15;
                effectValue = 8; duration = 4;
                break;
            case 'lendário':
                diceCount = 4; diceType = 8; baseDamage = 12; manaCost = 20;
                effectValue = 12; duration = 5;
                break;
        }

        return { diceCount, diceType, baseDamage, manaCost, effectValue, duration };
    }

    // Auto-cálculo de stats quando raridade muda (apenas para habilidades)
    useEffect(() => {
        if (activeTab === 'abilities' && modalMode === 'create' && formData.rarity) {
            const stats = calculateAbilityStats(formData.effectType || 'DAMAGE', formData.rarity);
            setFormData((prev: any) => ({ ...prev, ...stats }));
        }
    }, [formData.rarity, formData.effectType, activeTab, modalMode]);

    const analyzeAbility = async () => {
        if (!formData.name) return;
        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/ai/analyze-ability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formData.name })
            });

            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({
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

    // Derivar storyTypes únicos dos templates
    const storyTypes = Array.from(new Set(templates.map(t => t.storyType).filter(Boolean)));

    const filteredTemplates = selectedStoryType === 'todos'
        ? templates
        : templates.filter(t => t.storyType === selectedStoryType);

    const tabConfig = {
        classes: { label: 'Classes', icon: '⚔️', color: 'emerald' },
        races: { label: 'Raças', icon: '👥', color: 'purple' },
        abilities: { label: 'Habilidades', icon: '✨', color: 'blue' },
        weapons: { label: 'Armas', icon: '🗡️', color: 'orange' },
        items: { label: 'Itens', icon: '📦', color: 'yellow' },
        monsters: { label: 'Monstros', icon: '👹', color: 'red' }
    };

    useEffect(() => {
        checkUser();
    }, []);

    useEffect(() => {
        if (!userLoading) {
            loadTemplates();
            loadCounts();
        }
    }, [activeTab, userLoading]);

    async function checkUser() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setIsAdmin(data.user.isAdmin === true);
            }
        } catch (e) {
            console.error("Erro ao verificar usuário", e);
        } finally {
            setUserLoading(false);
        }
    }

    async function loadCounts() {
        try {
            const res = await fetch('/api/templates/stats');
            if (res.ok) {
                const data = await res.json();
                setCounts(data);
            }
        } catch (e) {
            console.error("Erro ao carregar contagens:", e);
        }
    }

    async function loadTemplates() {
        setLoading(true);
        try {
            const res = await fetch(`/api/templates/${activeTab}`);
            if (res.ok) {
                const data = await res.json();
                setTemplates(data[activeTab] || []);
            }
        } catch (e) {
            console.error("Erro ao carregar templates:", e);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setModalMode('create');
        setEditingTemplate(null);
        setFormData(getDefaultFormData());
        setShowModal(true);
    }

    function openEditModal(template: any) {
        setModalMode('edit');
        setEditingTemplate(template);
        setFormData({ ...template });
        setShowModal(true);
    }

    function getDefaultFormData() {
        const base = { name: '', description: '', storyType: '' };

        switch (activeTab) {
            case 'classes':
                return { ...base, baseHp: 10, baseMana: 5, baseForca: 3, baseDestreza: 3, baseInteligencia: 3, baseDefesa: 3, baseVelocidade: 3 };
            case 'races':
                return { ...base, modHp: 0, modMana: 0, modForca: 0, modDestreza: 0, modInteligencia: 0, modDefesa: 0, modVelocidade: 0 };
            case 'abilities':
                return {
                    ...base,
                    manaCost: 3,
                    rarity: 'comum',
                    school: '',
                    effectType: 'DAMAGE',
                    diceCount: 1,
                    diceType: 6,
                    baseDamage: 0,
                    effectValue: 0,
                    duration: 1,
                    scalingStat: 'forca',
                    targetStat: 'defesa'
                };
            case 'weapons':
                return {
                    ...base,
                    damage: 5, damageType: 'físico', range: 'corpo-a-corpo',
                    modHp: 0, modMana: 0, modForca: 2, modDestreza: 0, modInteligencia: 0, modDefesa: 0, modVelocidade: 0
                };
            case 'items':
                return { ...base, itemType: 'consumível', effect: '' };
            case 'monsters':
                return { ...base, hp: 50, attack: 10, defense: 5, level: 1 };
            default:
                return base;
        }
    }

    async function handleSave() {
        setProcessing(true);
        try {
            const url = modalMode === 'create'
                ? `/api/templates/${activeTab}`
                : `/api/templates/${activeTab}`;

            const method = modalMode === 'create' ? 'POST' : 'PATCH';

            const body = modalMode === 'edit'
                ? { ...formData, id: editingTemplate.id }
                : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setShowModal(false);
                loadTemplates();
                loadCounts();
            } else {
                const error = await res.json();
                alert(error.error || 'Erro ao salvar template');
            }
        } catch (e) {
            console.error("Erro ao salvar:", e);
            alert('Erro ao salvar template');
        } finally {
            setProcessing(false);
        }
    }

    async function handleDelete(template: any) {
        if (!isAdmin) return;
        if (!confirm(`Tem certeza que deseja deletar "${template.name}"?`)) return;

        try {
            const res = await fetch(`/api/templates/${activeTab}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: template.id }),
            });

            if (res.ok) {
                loadTemplates();
                loadCounts();
            } else {
                const error = await res.json();
                alert(error.error || 'Erro ao deletar template');
            }
        } catch (e) {
            console.error("Erro ao deletar:", e);
            alert('Erro ao deletar template');
        }
    }

    function renderTemplateCard(template: any) {
        const config = tabConfig[activeTab];

        return (
            <div
                key={template.id}
                className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-5 hover:border-neutral-700/50 transition-all"
            >
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <span>{config.icon}</span>
                        {template.name}
                    </h3>
                    <div className="flex gap-2">
                        {template.storyType && (
                            <span className="px-2 py-1 rounded-lg bg-neutral-800 text-neutral-400 text-xs font-semibold">
                                {template.storyType}
                            </span>
                        )}
                        {template.isGlobal && (
                            <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold">
                                Global
                            </span>
                        )}
                    </div>
                </div>

                {template.description && (
                    <p className="text-neutral-400 text-sm mb-4">{template.description}</p>
                )}

                {renderTemplateStats(template)}

                {isAdmin && (
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => openEditModal(template)}
                            className="flex-1 px-3 py-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-700/50 text-sm transition-all"
                        >
                            ✏️ Editar
                        </button>
                        <button
                            onClick={() => handleDelete(template)}
                            className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm transition-all"
                        >
                            🗑️
                        </button>
                    </div>
                )}
            </div>
        );
    }

    function renderTemplateStats(template: any) {
        switch (activeTab) {
            case 'classes':
                return (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">HP</p>
                            <p className="font-bold">{template.baseHp}</p>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Mana</p>
                            <p className="font-bold">{template.baseMana}</p>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Força</p>
                            <p className="font-bold">{template.baseForca}</p>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Destreza</p>
                            <p className="font-bold">{template.baseDestreza}</p>
                        </div>
                    </div>
                );
            case 'races':
                return (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Mod. HP</p>
                            <p className="font-bold">{template.modHp >= 0 ? '+' : ''}{template.modHp}</p>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Mod. Mana</p>
                            <p className="font-bold">{template.modMana >= 0 ? '+' : ''}{template.modMana}</p>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Mod. Força</p>
                            <p className="font-bold">{template.modForca >= 0 ? '+' : ''}{template.modForca}</p>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Mod. Destreza</p>
                            <p className="font-bold">{template.modDestreza >= 0 ? '+' : ''}{template.modDestreza}</p>
                        </div>
                    </div>
                );
            case 'abilities':
                return (
                    <div className="flex gap-2 text-xs">
                        <div className="bg-neutral-800/50 rounded-lg p-2 flex-1">
                            <p className="text-neutral-500">Custo Mana</p>
                            <p className="font-bold">{template.manaCost}</p>
                        </div>
                        {template.rarity && (
                            <div className="bg-neutral-800/50 rounded-lg p-2 flex-1">
                                <p className="text-neutral-500">Raridade</p>
                                <p className="font-bold capitalize">{template.rarity}</p>
                            </div>
                        )}
                    </div>
                );
            case 'weapons':
                return (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Dano</p>
                            <p className="font-bold">{template.damage}</p>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Mods</p>
                            <div className="flex flex-wrap gap-1">
                                {template.modForca > 0 && <span className="bg-red-500/20 text-red-300 px-1 rounded">+{template.modForca} FOR</span>}
                                {template.modDestreza > 0 && <span className="bg-green-500/20 text-green-300 px-1 rounded">+{template.modDestreza} DES</span>}
                                {template.modInteligencia > 0 && <span className="bg-blue-500/20 text-blue-300 px-1 rounded">+{template.modInteligencia} INT</span>}
                            </div>
                        </div>
                    </div>
                );
            case 'items':
                return (
                    <div className="bg-neutral-800/50 rounded-lg p-2 text-xs">
                        <p className="text-neutral-500">Tipo</p>
                        <p className="font-bold capitalize">{template.itemType}</p>
                    </div>
                );
            case 'monsters':
                return (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">HP</p>
                            <p className="font-bold">{template.hp}</p>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Ataque</p>
                            <p className="font-bold">{template.attack}</p>
                        </div>
                        <div className="bg-neutral-800/50 rounded-lg p-2">
                            <p className="text-neutral-500">Nível</p>
                            <p className="font-bold">{template.level}</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    function renderFormFields() {
        return (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-neutral-400 mb-2">Nome *</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="flex-1 px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50"
                            placeholder="Nome do template"
                        />
                        <button
                            onClick={analyzeAbility}
                            disabled={isAnalyzing || !formData.name}
                            className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20"
                            title="Preencher automaticamente com IA"
                        >
                            {isAnalyzing ? <span className="animate-spin">⏳</span> : '✨ Auto'}
                        </button>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm text-neutral-400">Descrição</label>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!formData.name) {
                                    alert('Digite um nome primeiro!');
                                    return;
                                }

                                setProcessing(true);
                                try {
                                    const res = await fetch('/api/ai/generate-description', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            type: activeTab.slice(0, -1), // Remove 's' do final
                                            name: formData.name,
                                            context: formData
                                        })
                                    });

                                    if (res.ok) {
                                        const data = await res.json();
                                        setFormData({ ...formData, description: data.description });
                                    } else {
                                        alert('Erro ao gerar descrição');
                                    }
                                } catch (e) {
                                    console.error(e);
                                    alert('Erro ao gerar descrição');
                                } finally {
                                    setProcessing(false);
                                }
                            }}
                            disabled={processing || !formData.name}
                            className="px-3 py-1 text-xs rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? '⏳ Gerando...' : '✨ Gerar com IA'}
                        </button>
                    </div>
                    <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50"
                        rows={5}
                        placeholder="Descrição do template (deixe vazio para gerar automaticamente com IA)"
                    />
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-2">Grupo (Tipo de História)</label>
                    <input
                        type="text"
                        value={formData.storyType || ''}
                        onChange={(e) => setFormData({ ...formData, storyType: e.target.value })}
                        className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50 mb-4"
                        placeholder="Ex: Fantasia, Sci-Fi, Horror (Opcional)"
                        list="storyTypesList"
                    />
                    <datalist id="storyTypesList">
                        {storyTypes.map(type => (
                            <option key={type} value={type} />
                        ))}
                    </datalist>
                </div>

                {/* Campos específicos por tipo */}
                {activeTab === 'classes' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">HP Base</label>
                            <input type="number" value={formData.baseHp || 0} onChange={(e) => setFormData({ ...formData, baseHp: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Mana Base</label>
                            <input type="number" value={formData.baseMana || 0} onChange={(e) => setFormData({ ...formData, baseMana: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Força</label>
                            <input type="number" value={formData.baseForca || 0} onChange={(e) => setFormData({ ...formData, baseForca: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Destreza</label>
                            <input type="number" value={formData.baseDestreza || 0} onChange={(e) => setFormData({ ...formData, baseDestreza: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Inteligência</label>
                            <input type="number" value={formData.baseInteligencia || 0} onChange={(e) => setFormData({ ...formData, baseInteligencia: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Defesa</label>
                            <input type="number" value={formData.baseDefesa || 0} onChange={(e) => setFormData({ ...formData, baseDefesa: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Velocidade</label>
                            <input type="number" value={formData.baseVelocidade || 0} onChange={(e) => setFormData({ ...formData, baseVelocidade: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                    </div>
                )}

                {activeTab === 'races' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Mod. HP</label>
                            <input type="number" value={formData.modHp || 0} onChange={(e) => setFormData({ ...formData, modHp: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Mod. Mana</label>
                            <input type="number" value={formData.modMana || 0} onChange={(e) => setFormData({ ...formData, modMana: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Mod. Força</label>
                            <input type="number" value={formData.modForca || 0} onChange={(e) => setFormData({ ...formData, modForca: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Mod. Destreza</label>
                            <input type="number" value={formData.modDestreza || 0} onChange={(e) => setFormData({ ...formData, modDestreza: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Mod. Inteligência</label>
                            <input type="number" value={formData.modInteligencia || 0} onChange={(e) => setFormData({ ...formData, modInteligencia: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Mod. Defesa</label>
                            <input type="number" value={formData.modDefesa || 0} onChange={(e) => setFormData({ ...formData, modDefesa: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Mod. Velocidade</label>
                            <input type="number" value={formData.modVelocidade || 0} onChange={(e) => setFormData({ ...formData, modVelocidade: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                    </div>
                )}

                {activeTab === 'abilities' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Tipo de Efeito</label>
                                <select
                                    value={formData.effectType || 'DAMAGE'}
                                    onChange={(e) => setFormData({ ...formData, effectType: e.target.value })}
                                    className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50"
                                >
                                    <option value="DAMAGE">💥 Dano</option>
                                    <option value="HEAL">💚 Cura</option>
                                    <option value="BUFF">⬆️ Buff</option>
                                    <option value="DEBUFF">⬇️ Debuff</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Raridade</label>
                                <select value={formData.rarity || 'comum'} onChange={(e) => setFormData({ ...formData, rarity: e.target.value })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50">
                                    <option value="comum">Comum</option>
                                    <option value="incomum">Incomum</option>
                                    <option value="raro">Raro</option>
                                    <option value="épico">Épico</option>
                                    <option value="lendário">Lendário</option>
                                </select>
                            </div>
                        </div>

                        {/* Configuração Automática (Read Only) */}
                        <div className="bg-neutral-800/30 p-4 rounded-xl border border-neutral-800">
                            <h4 className="flex items-center gap-2 text-xs font-bold text-neutral-500 uppercase mb-3">
                                ⚙️ Configuração Automática (Baseada na Raridade)
                            </h4>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Custo Mana</p>
                                    <p className="text-xl font-bold text-blue-400">{formData.manaCost} <span className="text-xs text-neutral-500">MP</span></p>
                                </div>
                                {(formData.effectType === 'DAMAGE' || formData.effectType === 'HEAL') ? (
                                    <>
                                        <div>
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Dados</p>
                                            <p className="text-xl font-bold text-purple-400">{formData.diceCount}d{formData.diceType}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Base</p>
                                            <p className="text-xl font-bold text-emerald-400">+{formData.baseDamage}</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Valor</p>
                                            <p className="text-xl font-bold text-yellow-400">{formData.effectValue}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Duração</p>
                                            <p className="text-xl font-bold text-orange-400">{formData.duration} <span className="text-xs text-neutral-500">turnos</span></p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-neutral-700/50 grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-neutral-500 mb-1">Escala Com</label>
                                    <select
                                        value={formData.scalingStat || 'forca'}
                                        onChange={(e) => setFormData({ ...formData, scalingStat: e.target.value })}
                                        className="w-full px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-300"
                                    >
                                        <option value="forca">Força (Físico)</option>
                                        <option value="destreza">Destreza (Ágil)</option>
                                        <option value="inteligencia">Inteligência (Mágico)</option>
                                    </select>
                                </div>
                                {(formData.effectType === 'BUFF' || formData.effectType === 'DEBUFF') && (
                                    <div>
                                        <label className="block text-xs text-neutral-500 mb-1">Atributo Alvo</label>
                                        <select
                                            value={formData.targetStat || 'defesa'}
                                            onChange={(e) => setFormData({ ...formData, targetStat: e.target.value })}
                                            className="w-full px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm text-neutral-300"
                                        >
                                            <option value="vida">Vida</option>
                                            <option value="mana">Mana</option>
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
                )}

                {activeTab === 'weapons' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Dano</label>
                                <input type="number" value={formData.damage || 0} onChange={(e) => setFormData({ ...formData, damage: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Tipo de Dano</label>
                                <select value={formData.damageType || 'físico'} onChange={(e) => setFormData({ ...formData, damageType: e.target.value })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50">
                                    <option value="físico">Físico</option>
                                    <option value="mágico">Mágico</option>
                                    <option value="fogo">Fogo</option>
                                    <option value="gelo">Gelo</option>
                                    <option value="raio">Raio</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm text-neutral-400 mb-2">Alcance</label>
                                <select value={formData.range || 'corpo-a-corpo'} onChange={(e) => setFormData({ ...formData, range: e.target.value })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50">
                                    <option value="corpo-a-corpo">Corpo-a-corpo</option>
                                    <option value="curto">Curto (5m)</option>
                                    <option value="médio">Médio (15m)</option>
                                    <option value="longo">Longo (30m+)</option>
                                </select>
                            </div>
                        </div>
                        <div className="bg-neutral-800/30 p-4 rounded-xl">
                            <h4 className="text-sm font-bold text-neutral-300 mb-3">Modificadores de Atributos</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs text-neutral-500">Mod. HP</label><input type="number" value={formData.modHp || 0} onChange={(e) => setFormData({ ...formData, modHp: parseInt(e.target.value) })} className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm" /></div>
                                <div><label className="text-xs text-neutral-500">Mod. Mana</label><input type="number" value={formData.modMana || 0} onChange={(e) => setFormData({ ...formData, modMana: parseInt(e.target.value) })} className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm" /></div>
                                <div><label className="text-xs text-neutral-500">Mod. Força</label><input type="number" value={formData.modForca || 0} onChange={(e) => setFormData({ ...formData, modForca: parseInt(e.target.value) })} className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm" /></div>
                                <div><label className="text-xs text-neutral-500">Mod. Destreza</label><input type="number" value={formData.modDestreza || 0} onChange={(e) => setFormData({ ...formData, modDestreza: parseInt(e.target.value) })} className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm" /></div>
                                <div><label className="text-xs text-neutral-500">Mod. Inteligência</label><input type="number" value={formData.modInteligencia || 0} onChange={(e) => setFormData({ ...formData, modInteligencia: parseInt(e.target.value) })} className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm" /></div>
                                <div><label className="text-xs text-neutral-500">Mod. Defesa</label><input type="number" value={formData.modDefesa || 0} onChange={(e) => setFormData({ ...formData, modDefesa: parseInt(e.target.value) })} className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm" /></div>
                                <div><label className="text-xs text-neutral-500">Mod. Velocidade</label><input type="number" value={formData.modVelocidade || 0} onChange={(e) => setFormData({ ...formData, modVelocidade: parseInt(e.target.value) })} className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm" /></div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'items' && (
                    <>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Tipo de Item</label>
                            <select value={formData.itemType || 'consumível'} onChange={(e) => setFormData({ ...formData, itemType: e.target.value })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50">
                                <option value="consumível">Consumível</option>
                                <option value="equipamento">Equipamento</option>
                                <option value="quest">Quest</option>
                                <option value="material">Material</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Efeito</label>
                            <textarea value={formData.effect || ''} onChange={(e) => setFormData({ ...formData, effect: e.target.value })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" rows={2} placeholder="Descreva o efeito do item" />
                        </div>
                    </>
                )}

                {activeTab === 'monsters' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">HP</label>
                            <input type="number" value={formData.hp || 0} onChange={(e) => setFormData({ ...formData, hp: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Ataque</label>
                            <input type="number" value={formData.attack || 0} onChange={(e) => setFormData({ ...formData, attack: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Defesa</label>
                            <input type="number" value={formData.defense || 0} onChange={(e) => setFormData({ ...formData, defense: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div>
                            <label className="block text-sm text-neutral-400 mb-2">Nível</label>
                            <input type="number" value={formData.level || 1} onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-blue-500/50" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
                <LoadingSpinner text="Carregando templates" size="lg" />
            </div>
        );
    }

    const config = tabConfig[activeTab];

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100">
            {/* Header */}
            <header className="border-b border-neutral-800/50 bg-neutral-900/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push("/lobby")}
                                className="p-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                            >
                                ←
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold">Templates</h1>
                                <p className="text-neutral-400 text-sm">Gerencie seus templates de RPG</p>
                            </div>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={openCreateModal}
                                className={`px-4 py-2 rounded-xl bg-${config.color}-600 hover:bg-${config.color}-500 text-white font-semibold transition-all`}
                            >
                                + Criar {config.label.slice(0, -1)}
                            </button>
                        )}
                    </div>

                    {/* Filtros de Story Type */}
                    {storyTypes.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
                            <button
                                onClick={() => setSelectedStoryType('todos')}
                                className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap transition-all ${selectedStoryType === 'todos'
                                    ? 'bg-white text-black font-semibold'
                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                    }`}
                            >
                                Todos
                            </button>
                            {storyTypes.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedStoryType(type as string)}
                                    className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap transition-all ${selectedStoryType === type
                                        ? 'bg-white text-black font-semibold'
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {Object.entries(tabConfig).map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key as TemplateType)}
                                className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === key
                                    ? `bg-${cfg.color}-600 text-white`
                                    : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700/50'
                                    }`}
                            >
                                {cfg.icon} {cfg.label} ({counts[key as TemplateType] || 0})
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {templates.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-neutral-500 text-lg">Nenhum template criado ainda.</p>
                        {isAdmin && (
                            <button
                                onClick={openCreateModal}
                                className="mt-4 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all"
                            >
                                + Criar Primeiro Template
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTemplates.map(renderTemplateCard)}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowModal(false)}>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-6">
                            {modalMode === 'create' ? 'Criar' : 'Editar'} {config.label.slice(0, -1)}
                        </h2>
                        {renderFormFields()}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                                disabled={processing}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className={`flex-1 px-4 py-3 rounded-xl bg-${config.color}-600 hover:bg-${config.color}-500 text-white font-semibold transition-all disabled:opacity-50`}
                                disabled={processing || !formData.name}
                            >
                                {processing ? 'Salvando...' : modalMode === 'create' ? 'Criar' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
