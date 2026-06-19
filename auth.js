// Authentication Service for Admin Panel

const supabaseUrl = localStorage.getItem('supabase_url') || 'https://vbxxwiqkyjijqlloyhsz.supabase.co';
const supabaseKey = localStorage.getItem('supabase_key') || 'sb_publishable_CpOBGqQsKggJ7VejenxLBw_Coy6fMgS';

let authClient = null;

if (window.supabase) {
    authClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
    console.error("Supabase CDN library not loaded.");
}

// Guard route for protected pages
async function requireAuth() {
    if (!authClient) {
        window.location.href = 'admin-login.html';
        return false;
    }
    const { data: { session }, error } = await authClient.auth.getSession();
    if (error || !session) {
        window.location.href = 'admin-login.html';
        return false;
    }
    return true;
}

// Redirect away from login if already authenticated
async function requireNoAuth() {
    if (!authClient) return;
    const { data: { session } } = await authClient.auth.getSession();
    if (session) {
        window.location.href = 'admin-dashboard.html';
    }
}

// Handle Login
async function login(email, password) {
    if (!authClient) throw new Error("Supabase client not initialized. Check your connection.");
    
    const { data, error } = await authClient.auth.signInWithPassword({
        email: email,
        password: password,
    });
    
    if (error) {
        throw error;
    }
    
    return data;
}

// Handle Logout
async function logout() {
    if (!authClient) return;
    await authClient.auth.signOut();
    window.location.href = 'admin-login.html';
}

// Expose to global window
window.AuthService = {
    requireAuth,
    requireNoAuth,
    login,
    logout,
    getClient: () => authClient
};
