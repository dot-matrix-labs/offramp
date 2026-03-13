import { sqlite } from "db";
import { signJwt, verifyJwt } from "../auth/jwt";

// Helper to parse cookies from headers
export function parseCookies(cookieHeader: string | null): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        if (parts.length >= 2) {
            cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
    return cookies;
}

// Helper to verify auth from a Request object
export async function getAuthenticatedUser(req: Request): Promise<{ id: string; username: string } | null> {
    const cookies = parseCookies(req.headers.get("Cookie"));
    const token = cookies["calypso_auth"];

    if (!token) return null;

    try {
        const payload = await verifyJwt<{ id: string; username: string }>(token);
        return payload;
    } catch {
        return null;
    }
}

// Helper to get CORS headers dynamically
export function getCorsHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get("Origin") || "http://localhost:5174";
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

export async function handleAuthRequest(req: Request, url: URL): Promise<Response | null> {
    const corsHeaders = getCorsHeaders(req);

    // Preflight CORS
    if (req.method === "OPTIONS" && url.pathname.startsWith("/api/auth")) {
        return new Response(null, { headers: corsHeaders });
    }

    // 1. POST /api/auth/register
    if (req.method === "POST" && url.pathname === "/api/auth/register") {
        try {
            const { username, password } = await req.json();
            if (!username || !password || password.length < 6) {
                return new Response(JSON.stringify({ error: "Invalid username or password" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Check if user exists
            const existingUser = sqlite.query("SELECT id FROM users WHERE username = ?").get(username);
            if (existingUser) {
                return new Response(JSON.stringify({ error: "Username already taken" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            const id = crypto.randomUUID();
            const hash = await Bun.password.hash(password);

            sqlite.query("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").run(id, username, hash);

            const token = await signJwt({ id, username });

            return new Response(JSON.stringify({ user: { id, username } }), {
                status: 201,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                    "Set-Cookie": `calypso_auth=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`
                }
            });
        } catch (err) {
            console.error("REGISTER ERROR:", err);
            return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers: corsHeaders });
        }
    }

    // 2. POST /api/auth/login
    if (req.method === "POST" && url.pathname === "/api/auth/login") {
        try {
            const { username, password } = await req.json();
            const user = sqlite.query("SELECT id, username, password_hash FROM users WHERE username = ?").get(username) as { id: string, username: string, password_hash: string } | undefined;

            if (!user) {
                return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            const isMatch = await Bun.password.verify(password, user.password_hash);
            if (!isMatch) {
                return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            const token = await signJwt({ id: user.id, username: user.username });

            return new Response(JSON.stringify({ user: { id: user.id, username: user.username } }), {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                    "Set-Cookie": `calypso_auth=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`
                }
            });
        } catch {
            return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers: corsHeaders });
        }
    }

    // 3. GET /api/auth/me
    // Validates the session cookie and returns user profile
    if (req.method === "GET" && url.pathname === "/api/auth/me") {
        const user = await getAuthenticatedUser(req);
        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ user }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. POST /api/auth/logout
    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
                "Set-Cookie": "calypso_auth=; HttpOnly; Path=/; Max-Age=0"
            }
        });
    }

    return null;
}
