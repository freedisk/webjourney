export async function noteOperationRequest(supabase, noteId, operation, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Reconnecte-toi avant de réessayer.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch("/api/notes/" + encodeURIComponent(noteId) + "/" + operation, {
      method: "POST", cache: "no-store", signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Impossible d’effectuer cette action.");
    return result;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("L’action prend plus de temps que prévu. Actualise pour vérifier son état avant de réessayer.");
    throw error;
  } finally { clearTimeout(timer); }
}
