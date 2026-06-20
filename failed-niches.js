// Logic for Failed Niches Dashboard
let failedData = [];
let supabaseClient = null;
let currentUser = null;
let userRole = 'worker';

document.addEventListener('DOMContentLoaded', async () => {
    // Theme setup
    const savedTheme = localStorage.getItem('rank_rent_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    document.getElementById('themeToggleBtn').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('rank_rent_theme', newTheme);
        updateThemeIcon(newTheme);
    });

    // Enforce Authentication
    const isAuthenticated = await window.AuthService.requireAuth();
    if (!isAuthenticated) return;

    supabaseClient = window.AuthService.getClient();

    // Get User Details
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        currentUser = user;
        if (currentUser) {
            userRole = window.AuthService.getUserRole(currentUser);
            
            // Show Badge
            const userBadgeContainer = document.getElementById('userBadgeContainer');
            const userBadgeEmail = document.getElementById('userBadgeEmail');
            const userBadgeRole = document.getElementById('userBadgeRole');
            
            if (userBadgeContainer && userBadgeEmail && userBadgeRole) {
                userBadgeEmail.textContent = currentUser.email;
                userBadgeRole.textContent = userRole.toUpperCase();
                
                // Color code badges
                if (userRole === 'admin') {
                    userBadgeRole.style.background = 'var(--primary)';
                    userBadgeRole.style.color = '#ffffff';
                } else {
                    userBadgeRole.style.background = 'var(--stage-2-bg)';
                    userBadgeRole.style.color = 'var(--stage-2)';
                }
                userBadgeContainer.style.display = 'flex';
            }

            // Adjust navigation links based on role
            const navFunnelLink = document.getElementById('navFunnelLink');
            if (navFunnelLink) {
                if (userRole === 'admin') {
                    navFunnelLink.href = '/stage1';
                    navFunnelLink.innerHTML = '<i class="fa-solid fa-filter"></i> Funnel Stage 1';
                } else {
                    const cleanRole = userRole.replace('_', ''); // 'stage1', 'stage2', etc.
                    navFunnelLink.href = `/${cleanRole}`;
                    navFunnelLink.innerHTML = `<i class="fa-solid fa-filter"></i> Funnel ${userRole.toUpperCase().replace('_', ' ')}`;
                }
            }

            if (userRole === 'admin') {
                document.getElementById('navAdminLink').style.display = 'inline-flex';
                document.getElementById('navDashboardLink').style.display = 'inline-flex';
                document.getElementById('thActions').style.display = 'table-cell';
            }
        }
    } catch (e) {
        console.error("Failed to load user info:", e);
    }

    // Event listeners
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await window.AuthService.logout();
    });

    // Auto-detection logic for keyword typing
    const keywordInput = document.getElementById('keywordInput');
    const detectedNiche = document.getElementById('detectedNiche');
    const detectedCity = document.getElementById('detectedCity');

    keywordInput.addEventListener('input', () => {
        const val = keywordInput.value.trim();
        if (!val) {
            detectedNiche.value = '';
            detectedCity.value = '';
            return;
        }

        // Auto-detection rules:
        // Last word is city, preceding words are niche
        const words = val.split(/\s+/);
        if (words.length > 1) {
            const city = words[words.length - 1];
            const niche = words.slice(0, -1).join(' ');
            
            detectedNiche.value = niche.toLowerCase();
            detectedCity.value = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        } else {
            detectedNiche.value = val.toLowerCase();
            detectedCity.value = '';
        }
    });

    // Form submit listener
    const form = document.getElementById('failedNicheForm');
    form.addEventListener('submit', handleFormSubmit);

    // Filter listeners
    document.getElementById('searchInput').addEventListener('input', renderTable);
    document.getElementById('stateFilter').addEventListener('change', renderTable);

    // Initial data fetch
    await fetchFailedNiches();
});

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
}

// Fetch list of failed niches
async function fetchFailedNiches() {
    try {
        const { data, error } = await supabaseClient
            .from('failed_niches')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        failedData = data || [];
        renderTable();
    } catch (error) {
        console.warn("Supabase fetch failed, falling back to LocalStorage:", error);
        loadLocalFailedNiches();
    }
}

// Fallback: load local storage data
function loadLocalFailedNiches() {
    const local = localStorage.getItem('rank_rent_failed_niches');
    failedData = local ? JSON.parse(local) : getMockFailedData();
    renderTable();
}

// Fallback mock data
function getMockFailedData() {
    return [
        {
            id: 'mock-1',
            keyword: 'pest control springfield',
            niche: 'pest control',
            city: 'Springfield',
            state: 'IL',
            created_by: 'worker1@rankrent.com',
            created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: 'mock-2',
            keyword: 'towing service dallas',
            niche: 'towing service',
            city: 'Dallas',
            state: 'TX',
            created_by: 'worker2@rankrent.com',
            created_at: new Date(Date.now() - 172800000).toISOString()
        }
    ];
}

// Save list to local fallback
function saveLocalFailedNiches() {
    localStorage.setItem('rank_rent_failed_niches', JSON.stringify(failedData));
}

// Render data table
function renderTable() {
    const tbody = document.getElementById('failedTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    const stateFilter = document.getElementById('stateFilter').value;

    const filtered = failedData.filter(item => {
        const matchesSearch = 
            item.keyword.toLowerCase().includes(searchQuery) ||
            item.niche.toLowerCase().includes(searchQuery) ||
            (item.city && item.city.toLowerCase().includes(searchQuery)) ||
            (item.created_by && item.created_by.toLowerCase().includes(searchQuery));

        const matchesState = stateFilter === 'all' || item.state === stateFilter;

        return matchesSearch && matchesState;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${userRole === 'admin' ? 9 : 8}" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No failed niches found.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        const dateStr = new Date(item.created_at).toLocaleString();

        // Failed stage badge
        let stageBadgeBg = 'var(--text-muted)';
        let stageLabel = '—';
        if (item.failed_stage) {
            stageLabel = `S${item.failed_stage}`;
            if (item.failed_stage === 1) stageBadgeBg = 'var(--stage-1, #10b981)';
            else if (item.failed_stage === 2) stageBadgeBg = 'var(--stage-2, #3b82f6)';
            else if (item.failed_stage === 3) stageBadgeBg = 'var(--stage-3, #f59e0b)';
            else if (item.failed_stage === 4) stageBadgeBg = 'var(--stage-4, #ef4444)';
        }

        let actionCell = '';
        if (userRole === 'admin') {
            actionCell = `
                <td style="text-align: center;">
                    <button class="action-btn delete-btn" data-id="${item.id}" title="Delete Record" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2);">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
        }

        tr.innerHTML = `
            <td style="font-weight: 600;">${escapeHtml(item.niche)}</td>
            <td>${escapeHtml(item.city || '')}</td>
            <td><code style="background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.8rem;">${escapeHtml(item.keyword)}</code></td>
            <td><span class="status-badge" style="background: var(--glass-bg); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.75rem;">${item.state ? item.state.toUpperCase() : '—'}</span></td>
            <td style="color: var(--secondary); font-weight: 600;">${item.volume || 0}</td>
            <td><span style="background: ${stageBadgeBg}; color: #000; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">${stageLabel}</span></td>
            <td style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(item.created_by || 'Auto')}</td>
            <td style="color: var(--text-muted); font-size: 0.85rem;">${dateStr}</td>
            ${actionCell}
        `;

        tbody.appendChild(tr);
    });

    // Attach delete button listeners
    if (userRole === 'admin') {
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const button = e.currentTarget;
                const id = button.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this failed niche?')) {
                    await deleteFailedNiche(id);
                }
            });
        });
    }
}

// Handle Log Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();

    const keyword = document.getElementById('keywordInput').value.trim();
    const state = document.getElementById('stateSelect').value;
    const niche = document.getElementById('detectedNiche').value.trim();
    const city = document.getElementById('detectedCity').value.trim();

    if (!keyword || !state || !niche) {
        showToast('Please fill in all required fields.', true);
        return;
    }

    // Check for duplicates in memory
    const isDuplicate = failedData.some(item => 
        item.keyword.toLowerCase() === keyword.toLowerCase() && 
        item.state.toLowerCase() === state.toLowerCase()
    );

    if (isDuplicate) {
        showToast('This keyword is already marked as a failed niche for this state!', true);
        return;
    }

    const newRecord = {
        keyword: keyword,
        niche: niche,
        city: city || null,
        state: state,
        created_by: currentUser ? currentUser.email : 'system@rankrent.com'
    };

    try {
        const { data, error } = await supabaseClient
            .from('failed_niches')
            .insert([newRecord])
            .select();

        if (error) throw error;
        
        if (data && data[0]) {
            failedData.unshift(data[0]);
        } else {
            // If insert succeeded but select didn't return
            newRecord.id = 'gen-' + Date.now();
            newRecord.created_at = new Date().toISOString();
            failedData.unshift(newRecord);
        }
        
        showToast('Failed niche logged successfully!');
    } catch (error) {
        console.warn('Database insert failed, writing to local storage fallback:', error);
        
        // Local fallback insert
        newRecord.id = 'local-' + Date.now();
        newRecord.created_at = new Date().toISOString();
        
        failedData.unshift(newRecord);
        saveLocalFailedNiches();
        
        showToast('Failed niche saved locally (offline mode).');
    }

    // Reset form & refresh table
    document.getElementById('keywordInput').value = '';
    document.getElementById('detectedNiche').value = '';
    document.getElementById('detectedCity').value = '';
    document.getElementById('stateSelect').selectedIndex = 0;
    
    renderTable();
}

// Delete Failed Niche
async function deleteFailedNiche(id) {
    try {
        const { error } = await supabaseClient
            .from('failed_niches')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        failedData = failedData.filter(item => item.id !== id);
        showToast('Failed niche deleted successfully!');
        renderTable();
    } catch (error) {
        console.warn('Database delete failed, removing from local storage fallback:', error);
        
        failedData = failedData.filter(item => item.id !== id);
        saveLocalFailedNiches();
        
        showToast('Failed niche deleted locally.');
        renderTable();
    }
}

// Toast helper
function showToast(message, isError = false) {
    const toast = document.getElementById('funnelToast');
    const toastText = document.getElementById('funnelToastText');
    if (!toast || !toastText) return;

    toastText.textContent = message;
    
    // Set icon & background based on error status
    const icon = toast.querySelector('i');
    if (isError) {
        icon.className = 'fa-solid fa-circle-exclamation';
        toast.style.borderLeft = '4px solid var(--danger)';
    } else {
        icon.className = 'fa-solid fa-check-circle';
        toast.style.borderLeft = '4px solid var(--success)';
    }

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// HTML escape helper
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}
