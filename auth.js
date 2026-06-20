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
        window.location.href = '/admin';
        return false;
    }
    const { data: { session }, error } = await authClient.auth.getSession();
    if (error || !session) {
        window.location.href = '/admin';
        return false;
    }
    return true;
}

// Redirect away from login if already authenticated
async function requireNoAuth() {
    if (!authClient) return;
    const { data: { session } } = await authClient.auth.getSession();
    if (session) {
        window.location.href = '/admin-dashboard';
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
    window.location.href = '/admin';
}

// Extract role or stage for the authenticated user
function getUserRole(user) {
    if (!user) return 'stage_1';
    const email = (user.email || '').toLowerCase();
    
    // Check metadata first
    const metadata = user.user_metadata || {};
    const stageVal = metadata.stage;
    if (stageVal !== undefined && stageVal !== null) {
        const sStr = String(stageVal).toLowerCase().trim();
        if (sStr === 'admin') return 'admin';
        if (sStr === '1' || sStr === 'stage1' || sStr === 'stage_1') return 'stage_1';
        if (sStr === '2' || sStr === 'stage2' || sStr === 'stage_2') return 'stage_2';
        if (sStr === '3' || sStr === 'stage3' || sStr === 'stage_3') return 'stage_3';
        if (sStr === '4' || sStr === 'stage4' || sStr === 'stage_4') return 'stage_4';
    }
    
    // Fallback: Check email prefix patterns
    if (email.includes('admin')) return 'admin';
    if (email.includes('stage1') || email.includes('worker1')) return 'stage_1';
    if (email.includes('stage2') || email.includes('worker2')) return 'stage_2';
    if (email.includes('stage3') || email.includes('worker3')) return 'stage_3';
    if (email.includes('stage4') || email.includes('worker4')) return 'stage_4';
    
    return 'stage_1';
}

// Expose to global window
window.AuthService = {
    requireAuth,
    requireNoAuth,
    login,
    logout,
    getUserRole,
    getClient: () => authClient
};
