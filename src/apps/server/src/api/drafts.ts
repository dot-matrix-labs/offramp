import { sqlite } from "db";
import { getAuthenticatedUser, getCorsHeaders } from "./auth";

export async function handleDraftsRequest(req: Request, url: URL): Promise<Response | null> {
    const corsHeaders = getCorsHeaders(req);

    // Preflight CORS
    if (req.method === "OPTIONS" && url.pathname.startsWith("/api/drafts")) {
        return new Response(null, { headers: corsHeaders });
    }

    // 1. GET /api/drafts - Fetch all drafts for the authenticated user
    if (req.method === "GET" && url.pathname === "/api/drafts") {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const drafts = sqlite.query("SELECT * FROM drafts WHERE user_id = ? ORDER BY updated_at DESC").all(user.id) as { articles: string }[];

            // Parse the JSON stringified articles arrays back to real arrays for the client
            const parsedDrafts = drafts.map((draft: { articles: string }) => ({
                ...draft,
                articles: JSON.parse(draft.articles)
            }));

            return new Response(JSON.stringify(parsedDrafts), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (err) {
            console.error(err);
            return new Response(JSON.stringify({ error: "Failed to fetch drafts" }), { status: 500, headers: corsHeaders });
        }
    }

    // 2. POST /api/drafts - Create or Update a draft
    if (req.method === "POST" && url.pathname === "/api/drafts") {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        try {
            const { id, synopsis, articles } = await req.json();

            const articlesJson = JSON.stringify(articles || []);
            const synopsisStr = synopsis || "";

            if (id) {
                // Update existing draft
                // Verify ownership first
                const existing = sqlite.query("SELECT id FROM drafts WHERE id = ? AND user_id = ?").get(id, user.id);
                if (!existing) {
                    return new Response(JSON.stringify({ error: "Draft not found or unauthorized" }), { status: 404, headers: corsHeaders });
                }

                sqlite.query("UPDATE drafts SET synopsis = ?, articles = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(synopsisStr, articlesJson, id);

                return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } else {
                // Create new draft
                const newId = crypto.randomUUID();
                sqlite.query("INSERT INTO drafts (id, user_id, synopsis, articles) VALUES (?, ?, ?, ?)").run(newId, user.id, synopsisStr, articlesJson);

                return new Response(JSON.stringify({ success: true, id: newId }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
        } catch (err) {
            console.error(err);
            return new Response(JSON.stringify({ error: "Failed to save draft" }), { status: 500, headers: corsHeaders });
        }
    }

    return null;
}
