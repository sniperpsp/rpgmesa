import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: encounterId } = await params;
        const { participantId } = await request.json();

        if (!participantId) {
            return NextResponse.json({ error: "Participant ID required" }, { status: 400 });
        }

        // Delete the participant
        await prisma.encounterParticipant.delete({
            where: {
                id: participantId,
                encounterId: encounterId // Security check to ensure it belongs to this encounter
            }
        });

        // Check if there are any participants left, maybe update initiative?
        // For now just deleting is enough.

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Error removing participant:", e);
        return NextResponse.json({ error: "Failed to remove participant" }, { status: 500 });
    }
}
