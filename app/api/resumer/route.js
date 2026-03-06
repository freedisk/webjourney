// API Route — Résumé IA via Anthropic (server-side, clé secrète)
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Vérifier que la clé API est configurée
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API Anthropic non configurée sur le serveur." },
        { status: 500 }
      );
    }

    const { titre, contenu } = await request.json();

    // Vérifier que le contenu est fourni
    if (!titre && !contenu) {
      return NextResponse.json(
        { error: "Titre ou contenu requis pour générer un résumé." },
        { status: 400 }
      );
    }

    // Appel à l'API Anthropic
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 150,
        system: "Tu es un assistant qui résume des notes. Génère un résumé concis en 2 phrases maximum, en français. Réponds uniquement avec le texte du résumé, sans formatage markdown, sans préfixe comme \"Résumé :\" et sans guillemets.",
        messages: [
          {
            role: "user",
            content: `Titre : ${titre || "(sans titre)"}\n\nContenu : ${contenu || "(vide)"}`,
          },
        ],
      }),
    });

    // Gérer les erreurs de l'API Anthropic
    if (!response.ok) {
      const erreur = await response.text();
      console.error("Erreur API Anthropic :", response.status, erreur);
      return NextResponse.json(
        { error: "Erreur de l'API Anthropic (" + response.status + ")" },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Extraire le texte et nettoyer le markdown résiduel
    const texte = data.content?.[0]?.text || "Impossible de générer un résumé.";
    const resume = texte
      .replace(/\*\*/g, "")
      .replace(/^résumé\s*:\s*/i, "")
      .trim();

    return NextResponse.json({ resume });
  } catch (err) {
    console.error("Erreur serveur résumé :", err);
    return NextResponse.json(
      { error: "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
