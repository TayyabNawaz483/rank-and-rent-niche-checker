// Logic for Failed Niches Dashboard
let failedData = [];
let supabaseClient = null;
let currentUser = null;
let userRole = 'worker';
let currentPage = 1;
const PAGE_SIZE = 50;

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

        // Robust auto-detection logic
        const words = val.split(/\s+/);
        const lowerWords = words.map(w => w.toLowerCase());
        const serviceIndicators = [
            'repair', 'control', 'dentist', 'dentistry', 'plumber', 'plumbing', 
            'roofing', 'roof', 'concrete', 'removal', 'towing', 'cleaning', 
            'landscaping', 'service', 'services', 'contractors', 'contractor', 
            'installation', 'care', 'electrician', 'painter', 'painting', 
            'mover', 'movers', 'hvac', 'attorney', 'lawyer', 'tow', 'damage', 
            'restoration', 'cleanup', 'detoxing'
        ];
        
        const citySuffixes = ['falls', 'city', 'bay', 'rapids', 'beach', 'springs', 'valley', 'hills', 'heights', 'lake', 'junction', 'pines', 'forks', 'haven', 'wood', 'port'];
        const cityPrefixes = ['sioux', 'rapid', 'green', 'las', 'vegas', 'san', 'los', 'new', 'santa', 'grand', 'fort', 'el', 'st', 'saint', 'mount', 'port', 'lake', 'palm', 'south', 'north', 'west', 'east', 'ann', 'baton', 'corpus'];

        let nicheFound = '';
        let cityFound = '';

        // 1. Check if any service indicator is present in the middle
        let splitDone = false;
        for (let i = 0; i < words.length - 1; i++) {
            if (serviceIndicators.includes(lowerWords[i])) {
                nicheFound = words.slice(0, i + 1).join(' ');
                cityFound = words.slice(i + 1).join(' ');
                splitDone = true;
                break;
            }
        }

        if (!splitDone && words.length >= 4) {
            const last3Lower = lowerWords.slice(-3).join(' ');
            if (last3Lower === 'salt lake city' || last3Lower === 'west palm beach') {
                nicheFound = words.slice(0, -3).join(' ');
                cityFound = words.slice(-3).join(' ');
                splitDone = true;
            }
        }

        if (!splitDone && words.length >= 3) {
            const lastWord = lowerWords[words.length - 1];
            const secondLastWord = lowerWords[words.length - 2];
            if (citySuffixes.includes(lastWord) || cityPrefixes.includes(secondLastWord)) {
                nicheFound = words.slice(0, -2).join(' ');
                cityFound = words.slice(-2).join(' ');
                splitDone = true;
            }
        }

        if (!splitDone) {
            nicheFound = words.slice(0, -1).join(' ');
            cityFound = words.slice(-1).join(' ');
        }

        detectedNiche.value = nicheFound.toLowerCase();
        // Capitalize city properly
        detectedCity.value = cityFound.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    });

    // Form submit listener
    const form = document.getElementById('failedNicheForm');
    form.addEventListener('submit', handleFormSubmit);

    // Modal Listeners
    const openLogModalBtn = document.getElementById('openLogModalBtn');
    const closeLogModalBtn = document.getElementById('closeLogModalBtn');
    const addFailedModal = document.getElementById('addFailedModal');

    if (openLogModalBtn && addFailedModal) {
        openLogModalBtn.addEventListener('click', () => {
            addFailedModal.classList.add('active');
            document.getElementById('keywordInput').focus();
        });
    }

    if (closeLogModalBtn && addFailedModal) {
        closeLogModalBtn.addEventListener('click', () => {
            addFailedModal.classList.remove('active');
        });
    }

    // Close on outside click
    if (addFailedModal) {
        addFailedModal.addEventListener('click', (e) => {
            if (e.target === addFailedModal) {
                addFailedModal.classList.remove('active');
            }
        });
    }

    // Filter listeners
    document.getElementById('searchInput').addEventListener('input', () => {
        currentPage = 1;
        renderTable();
    });
    document.getElementById('stateFilter').addEventListener('change', () => {
        currentPage = 1;
        renderTable();
    });
    if(document.getElementById('nicheFilter')) {
        document.getElementById('nicheFilter').addEventListener('change', () => {
            currentPage = 1;
            renderTable();
        });
    }
    if(document.getElementById('cityFilter')) {
        document.getElementById('cityFilter').addEventListener('change', () => {
            currentPage = 1;
            renderTable();
        });
    }

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
    let remoteFailed = [];
    let remotePipelineFailed = [];

    try {
        if (supabaseClient) {
            // 1. Fetch from failed_niches
            try {
                const { data, error } = await supabaseClient
                    .from('failed_niches')
                    .select('*');
                if (!error && data) {
                    remoteFailed = data;
                }
            } catch (e) {
                console.warn("Failed to fetch failed_niches table:", e);
            }

            // 2. Fetch from pipeline_keywords where status is failed
            try {
                const { data, error } = await supabaseClient
                    .from('pipeline_keywords')
                    .select('*')
                    .eq('status', 'failed');
                if (!error && data) {
                    remotePipelineFailed = data.map(pk => ({
                        id: pk.id,
                        keyword: pk.keyword,
                        niche: pk.niche,
                        city: pk.city,
                        state: pk.state,
                        volume: pk.volume || 0,
                        failed_stage: pk.stage + 1, // stage check failure is (last completed stage + 1)
                        fail_reason: 'Failed during pipeline stage check',
                        created_by: pk.created_by || 'system@rankrent.com',
                        created_at: pk.checked_at || pk.created_at
                    }));
                }
            } catch (e) {
                console.warn("Failed to fetch pipeline failed keywords:", e);
            }
        }

        // 3. Fetch from localStorage
        let localFailed = [];
        try {
            const local = localStorage.getItem('rank_rent_failed_niches');
            if (local) {
                localFailed = JSON.parse(local);
            }
        } catch (e) {
            console.warn("Failed to load local failed niches:", e);
        }

        // Deduplicate and merge sources: primary failed_niches first, then pipeline failed keywords, then local cache
        const merged = [];
        const existingKeys = new Set();

        const addRecord = (item) => {
            const key = `${(item.keyword || '').toLowerCase()}|${(item.state || '').toLowerCase()}`;
            if (!existingKeys.has(key)) {
                // Auto-heal failed_stage for keywords with volume >= 50 that are incorrectly marked as Stage 1 (S1)
                const fs = parseInt(item.failed_stage, 10);
                const vol = parseInt(item.volume || 0, 10);
                if (fs === 1 && vol >= 50) {
                    const reason = (item.fail_reason || '').toLowerCase();
                    if (reason.includes('stage 3') || reason.includes('gmb')) {
                        item.failed_stage = 3;
                    } else if (reason.includes('stage 4') || reason.includes('traffic') || reason.includes('da')) {
                        item.failed_stage = 4;
                    } else if (reason.includes('stage 5') || reason.includes('directory')) {
                        item.failed_stage = 5;
                    } else {
                        item.failed_stage = 2; // Default to Stage 2 KD Check failure
                    }
                }
                merged.push(item);
                existingKeys.add(key);
            }
        };

        remoteFailed.forEach(addRecord);
        remotePipelineFailed.forEach(addRecord);
        localFailed.forEach(addRecord);

        if (merged.length > 0) {
            localStorage.setItem('rank_rent_failed_initialized', 'true');
        }
        merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        failedData = merged;

        // Self-healing database correction block for mismatched niche
        const badRow = failedData.find(d => 
            d.keyword && d.keyword.toLowerCase() === 'appliance repair sioux falls' && 
            d.niche === 'appliance repair sioux'
        );
        if (badRow && supabaseClient) {
            console.log("Fixing incorrect failed niche in database...", badRow.id);
            try {
                await supabaseClient
                    .from('failed_niches')
                    .update({ niche: 'appliance repair', city: 'Sioux Falls' })
                    .eq('id', badRow.id);
                badRow.niche = 'appliance repair';
                badRow.city = 'Sioux Falls';
                console.log("Database successfully updated.");
            } catch(e) {
                console.error("Database update failed:", e);
            }
        }

        // Self-healing database correction block for mismatched niche (Lexington)
        const badLexingtonRow = failedData.find(d =>
            d.keyword && d.keyword.toLowerCase() === 'refrigerator repair lexington' &&
            d.niche === 'appliance'
        );
        if (badLexingtonRow && supabaseClient) {
            console.log("Fixing incorrect lexington failed niche in database...", badLexingtonRow.id);
            try {
                await supabaseClient
                    .from('failed_niches')
                    .update({ niche: 'appliance repair', city: 'Lexington' })
                    .eq('id', badLexingtonRow.id);
                badLexingtonRow.niche = 'appliance repair';
                badLexingtonRow.city = 'Lexington';
                console.log("Lexington database successfully updated.");
            } catch(e) {
                console.error("Lexington database update failed:", e);
            }
        }

        // General Self-healing for niche === 'appliance' in failed_niches
        const applianceRows = failedData.filter(d => d.niche && d.niche.toLowerCase() === 'appliance');
        if (applianceRows.length > 0 && supabaseClient) {
            console.log(`Self-healing ${applianceRows.length} appliance niches in failed_niches table...`);
            for (const row of applianceRows) {
                let newCity = row.city || '';
                if (newCity.toLowerCase().startsWith('repair ')) {
                    newCity = newCity.substring(7).trim();
                } else if (newCity.toLowerCase().startsWith('repair')) {
                    newCity = newCity.replace(/^repair\s+/i, '').trim();
                }
                try {
                    await supabaseClient
                        .from('failed_niches')
                        .update({ niche: 'appliance repair', city: newCity })
                        .eq('id', row.id);
                    row.niche = 'appliance repair';
                    row.city = newCity;
                    console.log(`Healed failed_niches row ${row.id} to appliance repair / ${newCity}`);
                } catch (e) {
                    console.error(`Failed to heal failed_niches row ${row.id}:`, e);
                }
            }
        }

        // General Self-healing for niche === 'appliance' in pipeline_keywords
        if (supabaseClient) {
            try {
                const { data: pkRows, error: pkError } = await supabaseClient
                    .from('pipeline_keywords')
                    .select('id, city')
                    .ilike('niche', 'appliance');
                if (!pkError && pkRows && pkRows.length > 0) {
                    console.log(`Self-healing ${pkRows.length} pipeline_keywords rows where niche is appliance...`);
                    for (const pkRow of pkRows) {
                        let newCity = pkRow.city || '';
                        if (newCity.toLowerCase().startsWith('repair ')) {
                            newCity = newCity.substring(7).trim();
                        } else if (newCity.toLowerCase().startsWith('repair')) {
                            newCity = newCity.replace(/^repair\s+/i, '').trim();
                        }
                        await supabaseClient
                            .from('pipeline_keywords')
                            .update({ niche: 'appliance repair', city: newCity })
                            .eq('id', pkRow.id);
                    }
                }
            } catch (e) {
                console.error("Failed to heal pipeline_keywords table:", e);
            }
        }

        // Correct in Supabase pipeline_keywords if any match exists (specific ones)
        if (supabaseClient) {
            try {
                await supabaseClient
                    .from('pipeline_keywords')
                    .update({ niche: 'appliance repair', city: 'Sioux Falls' })
                    .eq('keyword', 'appliance repair sioux falls')
                    .eq('niche', 'appliance repair sioux');
            } catch(e) {}
            try {
                await supabaseClient
                    .from('pipeline_keywords')
                    .update({ niche: 'appliance repair', city: 'Lexington' })
                    .eq('keyword', 'refrigerator repair lexington')
                    .eq('niche', 'appliance');
            } catch(e) {}
        }

        // Correct in localStorage
        try {
            let localFailedStr = localStorage.getItem('rank_rent_failed_niches');
            if (localFailedStr) {
                let parsed = JSON.parse(localFailedStr);
                let fixed = false;
                parsed.forEach(item => {
                    if (item.keyword && item.keyword.toLowerCase() === 'appliance repair sioux falls' && item.niche === 'appliance repair sioux') {
                        item.niche = 'appliance repair';
                        item.city = 'Sioux Falls';
                        fixed = true;
                    }
                    if (item.keyword && item.keyword.toLowerCase() === 'refrigerator repair lexington' && item.niche === 'appliance') {
                        item.niche = 'appliance repair';
                        item.city = 'Lexington';
                        fixed = true;
                    }
                    if (item.niche && item.niche.toLowerCase() === 'appliance') {
                        item.niche = 'appliance repair';
                        let c = item.city || '';
                        if (c.toLowerCase().startsWith('repair ')) {
                            c = c.substring(7).trim();
                        } else if (c.toLowerCase().startsWith('repair')) {
                            c = c.replace(/^repair\s+/i, '').trim();
                        }
                        item.city = c;
                        fixed = true;
                    }
                });
                if (fixed) {
                    localStorage.setItem('rank_rent_failed_niches', JSON.stringify(parsed));
                }
            }
            let localPipeline = localStorage.getItem('rank_rent_pipeline');
            if (localPipeline) {
                let parsed = JSON.parse(localPipeline);
                let fixed = false;
                parsed.forEach(item => {
                    if (item.keyword && item.keyword.toLowerCase() === 'appliance repair sioux falls' && item.niche === 'appliance repair sioux') {
                        item.niche = 'appliance repair';
                        item.city = 'Sioux Falls';
                        fixed = true;
                    }
                    if (item.keyword && item.keyword.toLowerCase() === 'refrigerator repair lexington' && item.niche === 'appliance') {
                        item.niche = 'appliance repair';
                        item.city = 'Lexington';
                        fixed = true;
                    }
                    if (item.niche && item.niche.toLowerCase() === 'appliance') {
                        item.niche = 'appliance repair';
                        let c = item.city || '';
                        if (c.toLowerCase().startsWith('repair ')) {
                            c = c.substring(7).trim();
                        } else if (c.toLowerCase().startsWith('repair')) {
                            c = c.replace(/^repair\s+/i, '').trim();
                        }
                        item.city = c;
                        fixed = true;
                    }
                });
                if (fixed) {
                    localStorage.setItem('rank_rent_pipeline', JSON.stringify(parsed));
                }
            }
        } catch(e) {}

        populateFilters();
        renderTable();
    } catch (error) {
        console.warn("Supabase fetch failed, falling back to LocalStorage:", error);
        loadLocalFailedNiches();
    }
}

// Fallback: load local storage data
function loadLocalFailedNiches() {
    const local = localStorage.getItem('rank_rent_failed_niches');
    if (local) {
        failedData = JSON.parse(local);
    } else {
        if (!localStorage.getItem('rank_rent_failed_initialized')) {
            failedData = getMockFailedData();
            localStorage.setItem('rank_rent_failed_initialized', 'true');
        } else {
            failedData = [];
        }
    }
    populateFilters();
    renderTable();
}

// Populate niche and city filters
function populateFilters() {
    const nicheSelect = document.getElementById('nicheFilter');
    const citySelect = document.getElementById('cityFilter');
    if (!nicheSelect || !citySelect) return;

    const niches = new Set();
    const cities = new Set();

    failedData.forEach(item => {
        if (item.niche) niches.add(item.niche);
        if (item.city) cities.add(item.city);
    });

    nicheSelect.innerHTML = '<option value="all">All Niches</option>';
    citySelect.innerHTML = '<option value="all">All Cities</option>';

    Array.from(niches).sort().forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        nicheSelect.appendChild(opt);
    });

    Array.from(cities).sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        citySelect.appendChild(opt);
    });
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

    // Update Stats counters on top
    const total = failedData.length;
    const uniqueStates = new Set(
        failedData
            .map(item => item.state ? item.state.trim().toUpperCase() : '')
            .filter(Boolean)
    );
    const totalVolume = failedData.reduce((sum, item) => sum + (parseInt(item.volume) || 0), 0);

    const totalEl = document.getElementById('statFailedTotal');
    const statesEl = document.getElementById('statFailedStates');
    const volumeEl = document.getElementById('statFailedVolume');

    function formatCount(num) {
        const n = parseInt(num) || 0;
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return n.toString();
    }

    if (totalEl) totalEl.textContent = formatCount(total);
    if (statesEl) statesEl.textContent = formatCount(uniqueStates.size);
    if (volumeEl) volumeEl.textContent = formatCount(totalVolume);

    tbody.innerHTML = '';

    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    const stateFilter = document.getElementById('stateFilter').value;
    const nicheFilter = document.getElementById('nicheFilter') ? document.getElementById('nicheFilter').value : 'all';
    const cityFilter = document.getElementById('cityFilter') ? document.getElementById('cityFilter').value : 'all';

    const filtered = failedData.filter(item => {
        const matchesSearch = 
            item.keyword.toLowerCase().includes(searchQuery) ||
            item.niche.toLowerCase().includes(searchQuery) ||
            (item.city && item.city.toLowerCase().includes(searchQuery)) ||
            (item.created_by && item.created_by.toLowerCase().includes(searchQuery));

        const matchesState = stateFilter === 'all' || item.state === stateFilter;
        const matchesNiche = nicheFilter === 'all' || item.niche === nicheFilter;
        const matchesCity = cityFilter === 'all' || item.city === cityFilter;

        return matchesSearch && matchesState && matchesNiche && matchesCity;
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    
    // Safety check on currentPage
    if (currentPage > totalPages) {
        currentPage = totalPages || 1;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = currentPage * PAGE_SIZE;
    const paginatedItems = filtered.slice(startIdx, endIdx);

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${userRole === 'admin' ? 9 : 8}" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No failed niches found.
                </td>
            </tr>
        `;
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    paginatedItems.forEach(item => {
        const tr = document.createElement('tr');
        const dateStr = new Date(item.created_at).toLocaleString();

        // Failed stage badge
        let stageBadgeBg = 'var(--text-muted)';
        let stageLabel = '—';
        if (item.failed_stage) {
            stageLabel = `S${item.failed_stage}`;
            const fs = parseInt(item.failed_stage, 10);
            if (fs === 1) stageBadgeBg = 'var(--stage-1)';
            else if (fs === 2) stageBadgeBg = 'var(--stage-2)';
            else if (fs === 3) stageBadgeBg = 'var(--stage-3)';
            else if (fs === 4) stageBadgeBg = 'var(--stage-4)';
            else if (fs === 5) stageBadgeBg = 'var(--stage-5)';
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
            <td><span style="background: ${stageBadgeBg}; color: #000; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; cursor: help;" title="${escapeHtml(item.fail_reason || 'No reason specified')}">${stageLabel}</span></td>
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

    // Render Pagination Controls
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
        paginationContainer.innerHTML = `
            <div class="pagination-bar">
                <div class="pagination-left">
                    <button id="prevPageBtn" class="btn btn-secondary pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>&larr; Prev</button>
                    <span id="pageIndicator" class="page-indicator">Page ${currentPage} of ${totalPages || 1}</span>
                    <button id="nextPageBtn" class="btn btn-secondary pagination-btn" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>Next &rarr;</button>
                </div>
                <div class="pagination-right">
                    <button id="copyKeywordsBtn" class="btn btn-secondary pagination-action-btn"><i class="fa-regular fa-clipboard"></i> Copy keywords</button>
                    <button id="exportCsvBtn" class="btn btn-secondary pagination-action-btn"><i class="fa-solid fa-file-csv"></i> Export filtered CSV</button>
                </div>
            </div>
        `;

        // Bind pagination button events
        document.getElementById('prevPageBtn').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });

        document.getElementById('nextPageBtn').addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });

        // Bind copy keywords event
        document.getElementById('copyKeywordsBtn').addEventListener('click', () => {
            const keywordsText = filtered.map(item => item.keyword).join('\n');
            navigator.clipboard.writeText(keywordsText).then(() => {
                showToast('Copied all filtered keywords to clipboard!');
            }).catch(err => {
                console.error('Failed to copy keywords:', err);
                alert('Failed to copy keywords.');
            });
        });

        // Bind export filtered CSV event
        document.getElementById('exportCsvBtn').addEventListener('click', () => {
            if (filtered.length === 0) {
                showToast('No records to export.', true);
                return;
            }

            const headers = ["Niche", "City", "Keyword", "State", "Volume", "Failed Stage", "Logged By", "Logged At"];
            const rows = filtered.map(item => [
                `"${item.niche}"`,
                `"${item.city || ''}"`,
                `"${item.keyword}"`,
                item.state || "",
                item.volume || 0,
                item.failed_stage ? `Stage ${item.failed_stage}` : 'Unknown',
                `"${item.created_by || 'Auto'}"`,
                new Date(item.created_at).toLocaleDateString()
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map(r => r.join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `failed_niches_filtered_${Date.now()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Exported filtered CSV successfully!');
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
    
    // Close modal
    const addFailedModal = document.getElementById('addFailedModal');
    if (addFailedModal) {
        addFailedModal.classList.remove('active');
    }

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
        
        localStorage.setItem('rank_rent_failed_initialized', 'true');
        failedData = failedData.filter(item => item.id !== id);
        saveLocalFailedNiches();
        showToast('Failed niche deleted successfully!');
        renderTable();
    } catch (error) {
        console.warn('Database delete failed, removing from local storage fallback:', error);
        
        localStorage.setItem('rank_rent_failed_initialized', 'true');
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
