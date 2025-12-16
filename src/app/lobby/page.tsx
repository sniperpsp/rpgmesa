"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Room {
    id: string;
    name: string;
    joinCode: string;
    gmUserId: string;
    userRole: 'gm' | 'player';
    diceSystem?: string;
    _count?: {
        members: number;
        characterRooms: number;
    };
    gm?: {
        displayName: string | null;
        email: string;
    };
}

export default function LobbyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [myRooms, setMyRooms] = useState<Room[]>([]);
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [showJoinRoom, setShowJoinRoom] = useState(false);
    const [roomName, setRoomName] = useState("");
    const [diceSystem, setDiceSystem] = useState("D20");
    const [joinCode, setJoinCode] = useState("");
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState(false);

    // States para Edit/Delete
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            // Carregar dados do usuário
            const userRes = await fetch("/api/auth/me");
            if (!userRes.ok) {
                router.push("/login");
                return;
            }
            const userData = await userRes.json();
            setUser(userData.user);

            // Carregar salas do usuário
            const roomsRes = await fetch("/api/rooms/mine");
            if (roomsRes.ok) {
                const roomsData = await roomsRes.json();
                setMyRooms(roomsData.rooms);
            }

            setLoading(false);
        } catch (e) {
            console.error("Erro ao carregar dados", e);
            setLoading(false);
        }
    }

    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/");
        } catch (e) {
            console.error("Logout failed", e);
        }
    }

    function openCreateModal() {
        setModalMode('create');
        setEditingRoom(null);
        setRoomName("");
        setDiceSystem("D20");
        setShowCreateRoom(true);
    }

    function openEditModal(room: Room) {
        setModalMode('edit');
        setEditingRoom(room);
        setRoomName(room.name);
        setDiceSystem(room.diceSystem || "D20");
        setShowCreateRoom(true);
    }

    function openDeleteModal(room: Room) {
        setRoomToDelete(room);
        setShowDeleteModal(true);
    }

    async function handleCreateOrEditRoom(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            if (modalMode === 'create') {
                const res = await fetch("/api/rooms/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: roomName, diceSystem }),
                });

                if (res.ok) {
                    const data = await res.json();
                    setShowCreateRoom(false);
                    router.push(`/room/${data.room.joinCode}/gm`);
                } else {
                    alert("Erro ao criar sala");
                }
            } else {
                // Edit Mode
                if (!editingRoom) return;

                const res = await fetch(`/api/rooms/${editingRoom.joinCode}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: roomName, diceSystem }),
                });

                if (res.ok) {
                    const data = await res.json();
                    setMyRooms(prev => prev.map(r => r.id === editingRoom.id ? { ...r, ...data.room } : r));
                    setShowCreateRoom(false);
                } else {
                    alert("Erro ao editar sala");
                }
            }
        } catch (e) {
            console.error("Erro ao salvar sala:", e);
            alert("Erro ao salvar sala");
        } finally {
            setCreating(false);
        }
    }

    async function handleDeleteRoom() {
        if (!roomToDelete) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/rooms/${roomToDelete.joinCode}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setMyRooms(prev => prev.filter(r => r.id !== roomToDelete.id));
                setShowDeleteModal(false);
                setRoomToDelete(null);
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao deletar sala");
            }
        } catch (e) {
            console.error("Erro ao deletar sala:", e);
            alert("Erro ao deletar sala");
        } finally {
            setDeleting(false);
        }
    }

    async function handleJoinRoom(e: React.FormEvent) {
        e.preventDefault();
        setJoining(true);
        try {
            const res = await fetch("/api/rooms/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ joinCode: joinCode.toUpperCase() }),
            });

            if (res.ok) {
                const data = await res.json();
                setShowJoinRoom(false);
                setJoinCode("");
                // Redirecionar para a sala
                router.push(`/room/${data.room.joinCode}/player`);
            } else {
                const error = await res.json();
                alert(error.error || "Erro ao entrar na sala");
            }
        } catch (e) {
            console.error("Erro ao entrar na sala:", e);
            alert("Erro ao entrar na sala");
        } finally {
            setJoining(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
                <LoadingSpinner text="Carregando lobby" size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100">
            {/* Decorative background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <header className="relative border-b border-neutral-800/50 bg-neutral-900/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">
                        RPG Mesa
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-neutral-400">{user?.name}</span>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-400 transition-all"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative max-w-7xl mx-auto px-4 py-8">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {/* Personagens */}
                    <Link
                        href="/characters"
                        className="group relative bg-gradient-to-br from-emerald-900/20 to-emerald-900/5 backdrop-blur-sm border border-emerald-800/30 rounded-3xl p-6 hover:border-emerald-500/50 transition-all overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Personagens</h3>
                            <p className="text-neutral-400 text-sm">Gerencie seus personagens</p>
                        </div>
                    </Link>

                    {/* Criar Sala */}
                    {/* Criar Sala */}
                    <button
                        onClick={openCreateModal}
                        className="group relative bg-gradient-to-br from-purple-900/20 to-purple-900/5 backdrop-blur-sm border border-purple-800/30 rounded-3xl p-6 hover:border-purple-500/50 transition-all overflow-hidden text-left"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Criar Sala</h3>
                            <p className="text-neutral-400 text-sm">Seja o Mestre de uma nova aventura</p>
                        </div>
                    </button>

                    {/* Entrar em Sala */}
                    <button
                        onClick={() => setShowJoinRoom(true)}
                        className="group relative bg-gradient-to-br from-amber-900/20 to-amber-900/5 backdrop-blur-sm border border-amber-800/30 rounded-3xl p-6 hover:border-amber-500/50 transition-all overflow-hidden text-left"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Entrar em Sala</h3>
                            <p className="text-neutral-400 text-sm">Use um código para participar</p>
                        </div>
                    </button>

                    {/* Templates */}
                    <Link
                        href="/templates"
                        className="group relative bg-gradient-to-br from-blue-900/20 to-blue-900/5 backdrop-blur-sm border border-blue-800/30 rounded-3xl p-6 hover:border-blue-500/50 transition-all overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2">Templates</h3>
                            <p className="text-neutral-400 text-sm">Classes, raças e habilidades</p>
                        </div>
                    </Link>
                </div>

                {/* Minhas Salas */}
                <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-3xl p-6">
                    <h2 className="text-2xl font-bold mb-6">Minhas Salas</h2>

                    {myRooms.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-neutral-500">Você ainda não está em nenhuma sala.</p>
                            <p className="text-neutral-600 text-sm mt-2">Crie uma sala ou entre em uma existente!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {myRooms.map((room) => (
                                <div
                                    key={room.id}
                                    className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-5 hover:border-emerald-500/50 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg mb-1">{room.name || "Sala sem nome"}</h3>
                                            <p className="text-neutral-500 text-xs">Código: {room.joinCode} {room.diceSystem && `(${room.diceSystem})`}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {room.userRole === 'gm' && (
                                                <>
                                                    <button
                                                        onClick={() => openEditModal(room)}
                                                        className="p-1 px-2 rounded-lg bg-neutral-700/50 hover:bg-neutral-600/50 text-neutral-400 hover:text-white transition-all text-xs"
                                                        title="Editar"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(room)}
                                                        className="p-1 px-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-500 hover:text-red-400 transition-all text-xs"
                                                        title="Excluir"
                                                    >
                                                        🗑️
                                                    </button>
                                                </>
                                            )}
                                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${room.userRole === 'gm'
                                                ? 'bg-purple-500/20 text-purple-400'
                                                : 'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                {room.userRole === 'gm' ? 'GM' : 'Jogador'}
                                            </span>
                                        </div>
                                    </div>

                                    {room.gm && (
                                        <p className="text-neutral-400 text-sm mb-3">
                                            Mestre: {room.gm.displayName || room.gm.email}
                                        </p>
                                    )}

                                    <div className="flex gap-4 text-xs text-neutral-500 mb-4">
                                        <span>👥 {room._count?.members || 0} membros</span>
                                        <span>⚔️ {room._count?.characterRooms || 0} personagens</span>
                                    </div>

                                    <Link
                                        href={`/room/${room.joinCode}/${room.userRole}`}
                                        className="block px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-center transition-all font-semibold"
                                    >
                                        Abrir Sala
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create/Edit Room Modal */}
            {showCreateRoom && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">
                            {modalMode === 'create' ? 'Criar Nova Sala' : 'Editar Sala'}
                        </h2>
                        <form onSubmit={handleCreateOrEditRoom} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nome da sala"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
                                required
                            />
                            <div className="mt-4">
                                <label className="block text-sm text-neutral-400 mb-2">Sistema de Dados</label>
                                <select
                                    value={diceSystem}
                                    onChange={(e) => setDiceSystem(e.target.value)}
                                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 focus:outline-none focus:border-purple-500/50"
                                >
                                    <option value="D20">Sistema D20 (D&D, Pathfinder - Padrão)</option>
                                    <option value="D6">Sistema D6 (Vampiro, GURPS)</option>
                                    <option value="D100">Sistema D100 (Call of Cthulhu)</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateRoom(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                                    disabled={creating}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all disabled:opacity-50"
                                    disabled={creating}
                                >
                                    {creating ? "Salvando..." : (modalMode === 'create' ? "Criar" : "Salvar")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full border-l-4 border-l-red-600">
                        <h2 className="text-2xl font-bold mb-4 text-red-500">Excluir Sala?</h2>
                        <p className="text-neutral-300 mb-6">
                            Tem certeza que deseja excluir a sala <strong>{roomToDelete?.name}</strong>?
                            Esta ação não pode ser desfeita e todos os personagens e dados da sala serão perdidos.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all font-semibold"
                                disabled={deleting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteRoom}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-all shadow-lg shadow-red-900/20"
                                disabled={deleting}
                            >
                                {deleting ? "Excluindo..." : "Excluir Definitivamente"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Room Modal */}
            {showJoinRoom && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Entrar em Sala</h2>
                        <form onSubmit={handleJoinRoom} className="space-y-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Código da Sala</label>
                                <input
                                    type="text"
                                    placeholder="Ex: ABC123"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 uppercase"
                                    maxLength={6}
                                    required
                                />
                                <p className="text-xs text-neutral-500 mt-2">Digite o código de 6 caracteres fornecido pelo Mestre</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowJoinRoom(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                                    disabled={joining}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all disabled:opacity-50"
                                    disabled={joining}
                                >
                                    {joining ? "Entrando..." : "Entrar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
