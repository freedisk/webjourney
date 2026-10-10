import { requireSupabaseUser } from "@/lib/server-auth";
import { cleanupOwnedImages } from "@/lib/note-operations-server";
import { noteOperationError, noteOperationJson, readNoteOperationBody } from "@/lib/note-operations-http";

export const maxDuration = 60;
export async function POST(request, { params }) {
  try {
    const user = await requireSupabaseUser(request);
    const { id } = await params;
    const body = await readNoteOperationBody(request);
    return noteOperationJson(await cleanupOwnedImages(user.id, id, body.imageIds));
  } catch (error) { return noteOperationError(error); }
}
