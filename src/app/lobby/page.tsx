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
}

export default function LobbyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [myRooms, setMyRooms] = useState<Room[]>([]);
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [roomName, setRoomName] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            // TODO: Carregar dados do usuário e salas
            setTimeout(() => {
                setUser({ name: "Usuário", id: "123" });
                setLoading(false);
            }, 500);
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

    async function handleCreateRoom(e: React.FormEvent) {
        e.preventDefault();
        // TODO: Implementar criação de sala
        console.log("Criar sala:", roomName);
        setShowCreateRoom(false);
        setRoomName("");
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                    <button
                        onClick={() => setShowCreateRoom(true)}
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
                                    className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl p-4 hover:border-emerald-500/50 transition-all"
                                >
                                    <h3 className="font-bold mb-2">{room.name}</h3>
                                    <p className="text-neutral-500 text-sm mb-4">Código: {room.joinCode}</p>
                                    <Link
                                        href={`/room/${room.joinCode}/gm`}
                                        className="block px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-center transition-all"
                                    >
                                        Abrir
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Room Modal */}
            {showCreateRoom && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold mb-6">Criar Nova Sala</h2>
                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nome da sala"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-100 placeholder-neutral-500"
                                required
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateRoom(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all"
                                >
                                    Criar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
