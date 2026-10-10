import { requireSupabaseUser } from "@/lib/server-auth";
import { purgeOwnedNote } from "@/lib/note-operations-server";
import { noteOperationError, noteOperationJson, readNoteOperationBody } from "@/lib/note-operations-http";

export const maxDuration = 60;
export async function POST(request, { params }) {
  try {
    const user = await requireSupabaseUser(request);
    const { id } = await params;
    const body = await readNoteOperationBody(request);
    return noteOperationJson(await purgeOwnedNote(user.id, id, body.expectedVersion));
  } catch (error) { return noteOperationError(error); }
}
