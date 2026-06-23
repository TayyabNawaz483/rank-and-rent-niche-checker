// Application Logic for Rank & Rent Niche Evaluator

// Application State
let nichesData = [];
let supabaseClient = null;
let currentViewBy = 'cities';
let currentFilters = {
    keyword: '',
    state: 'all',
    niche: 'all',
    city: 'all',
    status: 'all',
    zips: null,
    maxKd: null,
    maxVolume: null,
    maxGmbReviews: null,
    maxGmbCount: null,
    minTraffic: null,
    exactDa: null,
    exactDirectory: null,
    exactRr: null,
    minPopulation: null,
    maxPopulation: null
};

let currentPage = 1;
const PAGE_SIZE = 50;





const searchNiche = document.getElementById('searchNiche');
const filterState = document.getElementById('filterState');
const filterNiche = document.getElementById('filterNiche');
const filterCity = document.getElementById('filterCity');
const filterZips = document.getElementById('filterZips');

const toggleAdvancedFiltersBtn = document.getElementById('toggleAdvancedFiltersBtn');
const advancedFiltersPanel = document.getElementById('advancedFiltersPanel');
const clearAdvancedFiltersBtn = document.getElementById('clearAdvancedFiltersBtn');
const filterMaxKd = document.getElementById('filterMaxKd');
const filterMaxVolume = document.getElementById('filterMaxVolume');
const filterMaxGmbReviews = document.getElementById('filterMaxGmbReviews');
const filterMaxGmbCount = document.getElementById('filterMaxGmbCount');
const filterMinTraffic = document.getElementById('filterMinTraffic');
const filterExactDa = document.getElementById('filterExactDa');
const filterExactDirectory = document.getElementById('filterExactDirectory');
const filterExactRr = document.getElementById('filterExactRr');
const filterMinPopulation = document.getElementById('filterMinPopulation');
const filterMaxPopulation = document.getElementById('filterMaxPopulation');
const statusPills = document.querySelectorAll('.status-pill[data-status]');
const nicheGrid = document.getElementById('nicheGrid');

const statTotal = document.getElementById('statTotal');
const statCities = document.getElementById('statCities');
const statStates = document.getElementById('statStates');
const statTotalVolume = document.getElementById('statTotalVolume');

const accordionHeader = document.getElementById('accordionHeader');
const accordionContent = document.getElementById('accordionContent');
const accordionArrow = document.getElementById('accordionArrow');

// Initial Setup
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();

    // Enforce Admin Authentication
    if (window.AuthService) {
        const isAuthenticated = await window.AuthService.requireAuth();
        if (!isAuthenticated) return;

        const client = window.AuthService.getClient();
        if (client) {
            try {
                const { data: { user } } = await client.auth.getUser();
                const role = window.AuthService.getUserRole(user);
                if (role !== 'admin') {
                    window.location.replace('/stage1');
                    return;
                }
            } catch (e) {
                console.error("Admin verification failed:", e);
                window.location.replace('/admin');
                return;
            }
        }
    }

    initSupabase();
    loadNiches();
    setupEventListeners();
});

// Theme Initialization
function initTheme() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');

    // Check local storage or default to dark
    const savedTheme = localStorage.getItem('rank_rent_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('rank_rent_theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        if (theme === 'light') {
            themeIcon.className = 'fa-solid fa-moon';
        } else {
            themeIcon.className = 'fa-solid fa-sun';
        }
    }
}

// Initialize Supabase Client
function initSupabase() {
    const url = localStorage.getItem('supabase_url') || 'https://vbxxwiqkyjijqlloyhsz.supabase.co';
    const key = localStorage.getItem('supabase_key') || 'sb_publishable_CpOBGqQsKggJ7VejenxLBw_Coy6fMgS';

    if (url && key) {
        try {
            // Using window.supabase from the loaded CDN
            if (window.supabase) {
                supabaseClient = window.supabase.createClient(url, key);
            } else {
                console.error("Supabase CDN library not loaded yet.");
                fallbackToLocal();
            }
        } catch (e) {
            console.error("Error creating Supabase client:", e);
            fallbackToLocal();
        }
    } else {
        fallbackToLocal();
    }
}

function fallbackToLocal() {
    supabaseClient = null;
}

// Load Niche Records
async function loadNiches() {
    let remoteNiches = [];
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('niches')
                .select('*');

            if (!error && data) {
                remoteNiches = data;
            }
        } catch (e) {
            console.error("Supabase fetch failed:", e);
        }
    }

    // Load Local Storage
    let localNiches = [];
    try {
        const local = localStorage.getItem('rank_rent_niches');
        if (local) {
            localNiches = JSON.parse(local);
        }
    } catch (e) {
        console.warn("Failed to load local niches:", e);
    }

    // Merge without duplicates
    const merged = [...remoteNiches];
    const existingKeys = new Set(merged.map(item => `${(item.keyword || '').toLowerCase()}|${(item.state || '').toLowerCase()}`));

    localNiches.forEach(item => {
        const key = `${(item.keyword || '').toLowerCase()}|${(item.state || '').toLowerCase()}`;
        if (!existingKeys.has(key)) {
            merged.push(item);
            existingKeys.add(key);
        }
    });

    if (merged.length > 0) {
        localStorage.setItem('rank_rent_initialized', 'true');
    }

    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    nichesData = merged;

    if (nichesData.length === 0) {
        if (!localStorage.getItem('rank_rent_initialized')) {
            nichesData = getMockData();
            localStorage.setItem('rank_rent_initialized', 'true');
        } else {
            nichesData = [];
        }
    }

    renderDashboard();
}

function loadLocalNiches() {
    const local = localStorage.getItem('rank_rent_niches');
    nichesData = local ? JSON.parse(local) : getMockData();
}

function saveLocalNiches() {
    localStorage.setItem('rank_rent_niches', JSON.stringify(nichesData));
}

// Generate premium mock data if no items exist in local storage
function getMockData() {
    const mocks = [
        {
            id: 'mock-1',
            niche: 'plumbing',
            city: 'Dallas',
            state: 'TX',
            population: 1300000,
            zip_codes: 5,
            keyword: 'plumber dallas tx',
            kd: 5,
            volume: 250,
            da_count: 4,
            gmb_reviews: [25, 45, 12],
            gmb_count: 12,
            competitor_traffic: 75,
            directory_count: 2,
            has_rr_site: true,
            status: 'PASS',
            fail_reasons: [],
            created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: 'mock-2',
            niche: 'pest control',
            city: 'Orlando',
            state: 'FL',
            population: 300000,
            zip_codes: 3,
            keyword: 'pest control orlando',
            kd: 12,
            volume: 450,
            da_count: 2,
            gmb_reviews: [120, 80, 200],
            gmb_count: 8,
            competitor_traffic: 45,
            directory_count: 0,
            has_rr_site: false,
            status: 'FAIL',
            fail_reasons: [
                'Keyword Difficulty is too high (12 > 10)',
                'Only 2 SERP sites with DA < 10 (needs at least 4)',
                'Map Pack has competitor GMBs with more than 100 reviews',
                'Too few GMB profiles in the area (8 < 10)',
                'Competitor traffic is too low (45 < 50)',
                'No existing Rank & Rent / EMD / Micro Site found in SERP'
            ],
            created_at: new Date(Date.now() - 172800000).toISOString()
        },
        {
            id: 'mock-3',
            niche: 'towing',
            city: 'Miami',
            state: 'FL',
            population: 440000,
            zip_codes: 1,
            keyword: 'tow truck miami',
            kd: 18,
            volume: 90,
            da_count: 5,
            gmb_reviews: [12, 45, 30],
            gmb_count: 15,
            competitor_traffic: 85,
            directory_count: 1,
            has_rr_site: true,
            status: 'FAIL',
            fail_reasons: [
                'Search Volume is too low (90 < 100)'
            ],
            created_at: new Date(Date.now() - 259200000).toISOString()
        }
    ];
    localStorage.setItem('rank_rent_niches', JSON.stringify(mocks));
    return mocks;
}

// Setup Event Listeners
function setupEventListeners() {
    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (window.AuthService) {
                await window.AuthService.logout();
            }
        });
    }

    // View By Toggle Switchers
    const viewBtnCities = document.getElementById('viewBtnCities');
    const viewBtnStates = document.getElementById('viewBtnStates');
    
    if (viewBtnCities && viewBtnStates) {
        viewBtnCities.addEventListener('click', () => {
            if (currentViewBy === 'cities') return;
            currentViewBy = 'cities';
            viewBtnCities.classList.add('active');
            viewBtnStates.classList.remove('active');
            currentPage = 1;
            renderNicheGrid();
        });
        
        viewBtnStates.addEventListener('click', () => {
            if (currentViewBy === 'states') return;
            currentViewBy = 'states';
            viewBtnStates.classList.add('active');
            viewBtnCities.classList.remove('active');
            currentPage = 1;
            renderNicheGrid();
        });
    }

    // Accordion
    accordionHeader.addEventListener('click', () => {
        accordionContent.classList.toggle('open');
        accordionArrow.style.transform = accordionContent.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    // Filter controls
    searchNiche.addEventListener('input', (e) => {
        currentFilters.keyword = e.target.value.toLowerCase();
        currentPage = 1;
        renderNicheGrid();
    });

    filterState.addEventListener('change', (e) => {
        currentFilters.state = e.target.value;
        currentPage = 1;
        renderNicheGrid();
    });

    filterNiche.addEventListener('change', (e) => {
        currentFilters.niche = e.target.value;
        currentPage = 1;
        renderNicheGrid();
    });

    filterCity.addEventListener('change', (e) => {
        currentFilters.city = e.target.value;
        currentPage = 1;
        renderNicheGrid();
    });

    filterZips.addEventListener('input', (e) => {
        currentFilters.zips = e.target.value ? parseInt(e.target.value) : null;
        currentPage = 1;
        renderNicheGrid();
    });

    if (toggleAdvancedFiltersBtn) {
        toggleAdvancedFiltersBtn.addEventListener('click', () => {
            const isHidden = advancedFiltersPanel.style.display === 'none';
            advancedFiltersPanel.style.display = isHidden ? 'block' : 'none';
        });

        [filterMaxKd, filterMaxVolume, filterMaxGmbReviews, filterMaxGmbCount, filterMinTraffic, filterExactDa, filterExactDirectory, filterExactRr, filterMinPopulation, filterMaxPopulation].forEach(input => {
            if (input) {
                input.addEventListener('input', (e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    if (e.target.id === 'filterMaxKd') currentFilters.maxKd = val;
                    if (e.target.id === 'filterMaxVolume') currentFilters.maxVolume = val;
                    if (e.target.id === 'filterMaxGmbReviews') currentFilters.maxGmbReviews = val;
                    if (e.target.id === 'filterMaxGmbCount') currentFilters.maxGmbCount = val;
                    if (e.target.id === 'filterMinTraffic') currentFilters.minTraffic = val;
                    if (e.target.id === 'filterExactDa') currentFilters.exactDa = val;
                    if (e.target.id === 'filterExactDirectory') currentFilters.exactDirectory = val;
                    if (e.target.id === 'filterExactRr') currentFilters.exactRr = val;
                    if (e.target.id === 'filterMinPopulation') currentFilters.minPopulation = val;
                    if (e.target.id === 'filterMaxPopulation') currentFilters.maxPopulation = val;
                    currentPage = 1;
                    renderNicheGrid();
                });
            }
        });

        clearAdvancedFiltersBtn.addEventListener('click', () => {
            filterMaxKd.value = '';
            filterMaxVolume.value = '';
            filterMaxGmbReviews.value = '';
            filterMaxGmbCount.value = '';
            filterMinTraffic.value = '';
            filterExactDa.value = '';
            filterExactDirectory.value = '';
            filterExactRr.value = '';
            if (filterMinPopulation) filterMinPopulation.value = '';
            if (filterMaxPopulation) filterMaxPopulation.value = '';

            currentFilters.maxKd = null;
            currentFilters.maxVolume = null;
            currentFilters.maxGmbReviews = null;
            currentFilters.maxGmbCount = null;
            currentFilters.minTraffic = null;
            currentFilters.exactDa = null;
            currentFilters.exactDirectory = null;
            currentFilters.exactRr = null;
            currentFilters.minPopulation = null;
            currentFilters.maxPopulation = null;
            currentPage = 1;
            renderNicheGrid();
        });
    }

    statusPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            statusPills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            currentFilters.status = e.target.dataset.status;
            currentPage = 1;
            renderNicheGrid();
        });
    });

    // Export CSV Actions
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => exportDataCSV(true));
    }
}




// Evaluates the Rank & Rent Niche Criteria
function evaluateNicheCriteria(data) {
    if (!data) data = {};
    
    // Normalize properties to support database (zip_codes, has_directory, has_rr_site) vs form (zips) vs legacy records
    const zips = data.zips !== undefined ? data.zips : (data.zip_codes !== undefined ? data.zip_codes : 0);
    const kd = data.kd !== undefined ? data.kd : 0;
    const volume = data.volume !== undefined ? data.volume : 0;
    const da_count = data.da_count !== undefined ? data.da_count : 0;
    
    let gmb_reviews = data.gmb_reviews;
    if (!Array.isArray(gmb_reviews)) {
        if (typeof gmb_reviews === 'string') {
            try {
                gmb_reviews = JSON.parse(gmb_reviews);
            } catch (e) {
                gmb_reviews = [];
            }
        } else {
            gmb_reviews = [];
        }
    }
    gmb_reviews = gmb_reviews.map(r => parseInt(r) || 0);
    while (gmb_reviews.length < 3) {
        gmb_reviews.push(0);
    }

    const gmb_count = data.gmb_count !== undefined ? data.gmb_count : 0;
    
    let directory_count = 0;
    if (data.directory_count !== undefined) {
        directory_count = parseInt(data.directory_count) || 0;
    } else if (data.has_directory !== undefined) {
        directory_count = data.has_directory ? 1 : 0;
    }
    
    const competitor_traffic = data.competitor_traffic !== undefined ? data.competitor_traffic : 0;
    
    let rr_site_count = 0;
    if (data.rr_site_count !== undefined) {
        rr_site_count = parseInt(data.rr_site_count) || 0;
    } else if (data.has_rr_site !== undefined) {
        rr_site_count = data.has_rr_site ? 1 : 0;
    }

    const rules = {
        zips: {
            pass: zips >= 2,
            text: `${zips} City Zip Codes (min 2 required)`
        },
        kd: {
            pass: kd <= 10,
            text: `KD is ${kd} (must be 10 or less)`
        },
        volume: {
            pass: volume >= 100,
            text: `Search Volume is ${volume} (min 100 required)`
        },
        daCount: {
            pass: da_count >= 4,
            text: `${da_count} sites with DA < 10 (min 4 required)`
        },
        gmbReviews: {
            pass: gmb_reviews.every(reviews => reviews <= 100),
            text: `GMB map reviews: [${gmb_reviews.join(', ')}] (all must be <= 100)`
        },
        gmbCount: {
            pass: gmb_count >= 10,
            text: `${gmb_count} GMB profiles in area (min 10 required)`
        },
        directory: {
            pass: directory_count >= 1,
            text: `Directory ranks in SERP: ${directory_count} (min 1 required)`
        },
        traffic: {
            pass: competitor_traffic >= 50,
            text: `Competitor Traffic: ${competitor_traffic} (min 50 required)`
        },
        rrSite: {
            pass: rr_site_count >= 1,
            text: `Existing R&R/EMD/Micro site available in SERP: ${rr_site_count} (min 1 required)`
        }
    };

    const failReasons = [];
    if (!rules.zips.pass) failReasons.push(`City must have at least 2 zip codes (has ${zips})`);
    if (!rules.kd.pass) failReasons.push(`Keyword Difficulty is too high (${kd} > 10)`);
    if (!rules.volume.pass) failReasons.push(`Search Volume is too low (${volume} < 100)`);
    if (!rules.daCount.pass) failReasons.push(`Only ${da_count} SERP sites with DA < 10 (needs at least 4)`);
    if (!rules.gmbReviews.pass) failReasons.push(`Map Pack has competitor GMBs with more than 100 reviews`);
    if (!rules.gmbCount.pass) failReasons.push(`Too few GMB profiles in the area (${gmb_count} < 10)`);
    if (!rules.directory.pass) failReasons.push(`No major business directory rankings found in SERP (${directory_count} < 1)`);
    if (!rules.traffic.pass) failReasons.push(`Competitor traffic is too low (${competitor_traffic} < 50)`);
    if (!rules.rrSite.pass) failReasons.push(`No existing Rank & Rent / EMD / Micro Site found in SERP (${rr_site_count} < 1)`);

    const status = failReasons.length === 0 ? 'PASS' : 'FAIL';

    return {
        status,
        rules,
        failReasons
    };
}



// // Simple Toast Notification
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const bg = type === 'success' ? 'var(--success)' : 'var(--danger)';
    
    toast.style.cssText = `
        background: ${bg};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-weight: 500;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
    `;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Handle Delete Data Row
async function deleteNiche(id) {
    const confirmedData = await new Promise((resolve) => {
        const modal = document.getElementById('deleteModal');
        if (!modal) {
            resolve({ confirmed: confirm('Are you sure you want to delete this niche evaluation?') });
            return;
        }
        
        const msgEl = document.getElementById('deleteModalMessage');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        
        msgEl.textContent = 'Are you sure you want to delete this niche evaluation?';
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Delete';
        
        // Toggle the active class first
        modal.classList.add('active');
        
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('position', 'fixed', 'important');
        modal.style.setProperty('top', '0', 'important');
        modal.style.setProperty('left', '0', 'important');
        modal.style.setProperty('width', '100vw', 'important');
        modal.style.setProperty('height', '100vh', 'important');
        modal.style.setProperty('background', 'rgba(15, 23, 42, 0.85)', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('pointer-events', 'auto', 'important');
        modal.style.setProperty('align-items', 'center', 'important');
        modal.style.setProperty('justify-content', 'center', 'important');
        
        const cleanup = () => {
            modal.classList.remove('active');
            modal.style.setProperty('display', 'none', 'important');
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('pointer-events');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };
        
        const onConfirm = () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
            resolve({ confirmed: true, cleanup });
        };
        const onCancel = () => { cleanup(); resolve({ confirmed: false }); };
        
        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });

    if (!confirmedData.confirmed) return;

    localStorage.setItem('rank_rent_initialized', 'true');

    if (supabaseClient && (!id || !id.toString().startsWith('local-'))) {
        try {
            const { error } = await supabaseClient
                .from('niches')
                .delete()
                .eq('id', id);

            if (error) throw error;
            nichesData = nichesData.filter(item => item.id !== id);
            saveLocalNiches(); // keep local cache in sync
            showToast("Evaluation deleted successfully!");
        } catch (error) {
            console.error("Failed to delete from Supabase:", error);
            showToast("Failed remote delete. Deleted locally instead.", "error");
            nichesData = nichesData.filter(item => item.id !== id);
            saveLocalNiches(); // actually persist the fallback delete
        }
    } else {
        nichesData = nichesData.filter(item => item.id !== id);
        saveLocalNiches();
        showToast("Evaluation deleted locally!");
    }
    if (confirmedData.cleanup) confirmedData.cleanup();
    renderDashboard();
}

// Generate Dummy Niches based on current filters and save directly to Database
window.generateDummyNiches = async function() {
    const dummyNames = ['Plumbing', 'Roofing', 'Pest Control', 'HVAC', 'Tree Service', 'Landscaping', 'Tow Truck', 'Electrician'];
    const dummyCities = ['Austin', 'Denver', 'Mesa', 'Tampa', 'Raleigh', 'Tulsa', 'Omaha', 'Fresno'];
    const dummyStates = ['TX', 'CO', 'AZ', 'FL', 'NC', 'OK', 'NE', 'CA'];
    
    let generated = [];
    for(let i=0; i<5; i++) {
        const randIdx = Math.floor(Math.random() * dummyNames.length);
        const nName = currentFilters.niche !== 'all' ? currentFilters.niche : dummyNames[randIdx];
        const cCity = currentFilters.city !== 'all' ? currentFilters.city : dummyCities[randIdx];
        const sState = currentFilters.state !== 'all' ? currentFilters.state : dummyStates[randIdx];
        
        let key = currentFilters.keyword || `${nName} ${cCity} ${sState}`.toLowerCase();
        // Add random suffix to prevent duplicate keyword clashes during batch generation
        key = key + " " + Math.floor(Math.random() * 1000);
        
        const kd = currentFilters.maxKd !== null ? Math.floor(Math.random() * currentFilters.maxKd) : Math.floor(Math.random() * 20);
        const volume = currentFilters.maxVolume !== null ? Math.floor(Math.random() * currentFilters.maxVolume) : Math.floor(Math.random() * 1000) + 50;
        const da = currentFilters.exactDa !== null ? currentFilters.exactDa : Math.floor(Math.random() * 8);
        const revs = [Math.floor(Math.random()*150), Math.floor(Math.random()*150), Math.floor(Math.random()*150)];
        const gcount = currentFilters.maxGmbCount !== null ? Math.floor(Math.random() * currentFilters.maxGmbCount) : Math.floor(Math.random() * 20) + 5;
        const traffic = currentFilters.minTraffic !== null ? currentFilters.minTraffic + Math.floor(Math.random() * 100) : Math.floor(Math.random() * 200);
        const dirCount = currentFilters.exactDirectory !== null ? currentFilters.exactDirectory : Math.floor(Math.random() * 3);
        const rrSite = currentFilters.exactRr !== null ? currentFilters.exactRr : Math.floor(Math.random() * 2);
        const pop = 50000 + Math.floor(Math.random() * 500000);
        const zips = currentFilters.zips !== null ? currentFilters.zips : Math.floor(Math.random() * 10) + 1;

        const evalResult = evaluateNicheCriteria({
            kd, volume, da_count: da, gmb_reviews: revs, gmb_count: gcount, 
            competitor_traffic: traffic, directory_count: dirCount, rr_site_count: rrSite, zips
        });
        
        generated.push({
            niche: nName,
            city: cCity,
            state: sState,
            population: pop,
            zip_codes: zips,
            keyword: key,
            kd,
            volume,
            da_count: da,
            gmb_reviews: revs,
            gmb_count: gcount,
            competitor_traffic: traffic,
            directory_count: dirCount,
            rr_site_count: rrSite,
            status: evalResult.status,
            fail_reasons: evalResult.failReasons
        });
    }

    if (supabaseClient) {
        showToast("Generating and saving dummy data to database...", "success");
        try {
            const { data, error } = await supabaseClient
                .from('niches')
                .insert(generated)
                .select();
            if (error) throw error;
            if (data) {
                nichesData = [...data, ...nichesData];
            } else {
                await loadNiches();
            }
            showToast("Dummy data saved successfully to database!", "success");
        } catch (e) {
            console.error("Supabase insert error:", e);
            showToast("Failed to save dummy data to database. Saving locally.", "error");
            // Fallback
            generated.forEach(g => {
                g.id = 'local-' + Math.random().toString(36).substr(2, 9);
                g.created_at = new Date().toISOString();
            });
            nichesData = [...generated, ...nichesData];
            saveLocalNiches();
        }
    } else {
        generated.forEach(g => {
            g.id = 'local-' + Math.random().toString(36).substr(2, 9);
            g.created_at = new Date().toISOString();
        });
        nichesData = [...generated, ...nichesData];
        saveLocalNiches();
        showToast("Dummy data generated locally!", "success");
    }
    
    // Refresh the view
    if (typeof renderNicheGrid === 'function') {
        renderNicheGrid();
    } else if (typeof renderDashboard === 'function') {
        renderDashboard();
    }
};

// Render Dashboard Data & Stats
function renderDashboard() {
    updateFilterOptions();
    renderStats();
    renderNicheGrid();
}

function updateFilterOptions() {
    const states = new Set();
    const niches = new Set();
    const cities = new Set();

    nichesData.forEach(item => {
        if (item.state) states.add(item.state.trim().toUpperCase());
        if (item.niche) niches.add(item.niche.trim().toLowerCase());
        if (item.city) cities.add(item.city.trim());
    });

    // Capture currently selected value to preserve selection if possible
    const selectedState = filterState.value || 'all';
    const selectedNiche = filterNiche.value || 'all';
    const selectedCity = filterCity.value || 'all';



    // Repopulate Niche Select
    filterNiche.innerHTML = '<option value="all">All Niches</option>';
    Array.from(niches).sort().forEach(niche => {
        const option = document.createElement('option');
        option.value = niche.toLowerCase();
        option.textContent = niche.charAt(0).toUpperCase() + niche.slice(1);
        if (niche.toLowerCase() === selectedNiche.toLowerCase()) option.selected = true;
        filterNiche.appendChild(option);
    });

    // Repopulate City Select
    filterCity.innerHTML = '<option value="all">All Cities</option>';
    Array.from(cities).sort().forEach(city => {
        const option = document.createElement('option');
        option.value = city.toLowerCase();
        option.textContent = city;
        if (city.toLowerCase() === selectedCity.toLowerCase()) option.selected = true;
        filterCity.appendChild(option);
    });
}

function renderStats() {
    function formatCount(num) {
        const n = parseInt(num) || 0;
        if (n >= 1000000) {
            return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (n >= 1000) {
            return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        }
        return n.toString();
    }

    const total = nichesData.length;
    
    // Unique Cities count
    const uniqueCities = new Set(
        nichesData
            .map(item => {
                const city = (item.city || '').trim().toLowerCase();
                const state = (item.state || '').trim().toLowerCase();
                return city && state ? `${city}|${state}` : city;
            })
            .filter(Boolean)
    );
    
    // Unique States count
    const uniqueStates = new Set(
        nichesData
            .map(item => item.state ? item.state.trim().toUpperCase() : '')
            .filter(Boolean)
    );
    
    // Total Search Volume
    const totalVolume = nichesData.reduce((sum, item) => sum + (parseInt(item.volume) || 0), 0);

    statTotal.textContent = formatCount(total);
    statCities.textContent = formatCount(uniqueCities.size);
    statStates.textContent = formatCount(uniqueStates.size);
    statTotalVolume.textContent = totalVolume.toLocaleString();
}

function renderNicheGrid() {
    nicheGrid.innerHTML = '';

    const filtered = nichesData.filter(item => {
        const matchesSearch = !currentFilters.keyword ||
            item.niche.toLowerCase().includes(currentFilters.keyword) ||
            item.city.toLowerCase().includes(currentFilters.keyword) ||
            item.keyword.toLowerCase().includes(currentFilters.keyword) ||
            (item.state && item.state.toLowerCase().includes(currentFilters.keyword));

        const matchesState = currentFilters.state === 'all' ||
            (item.state && item.state.toLowerCase() === currentFilters.state.toLowerCase());

        const matchesNiche = currentFilters.niche === 'all' ||
            item.niche.toLowerCase() === currentFilters.niche.toLowerCase();

        const matchesCity = currentFilters.city === 'all' ||
            item.city.toLowerCase() === currentFilters.city.toLowerCase();

        const matchesStatus = currentFilters.status === 'all' ||
            item.status.toLowerCase() === currentFilters.status;

        const matchesZips = currentFilters.zips === null || item.zip_codes >= currentFilters.zips;

        const matchesAdvanced =
            (currentFilters.maxKd === null || item.kd <= currentFilters.maxKd) &&
            (currentFilters.maxVolume === null || item.volume <= currentFilters.maxVolume) &&
            (currentFilters.maxGmbCount === null || item.gmb_count <= currentFilters.maxGmbCount) &&
            (currentFilters.minTraffic === null || item.competitor_traffic >= currentFilters.minTraffic) &&
            (currentFilters.exactDa === null || item.da_count === currentFilters.exactDa) &&
            (currentFilters.maxGmbReviews === null || (item.gmb_reviews && item.gmb_reviews.every(r => r <= currentFilters.maxGmbReviews))) &&
            (currentFilters.exactDirectory === null || item.directory_count === currentFilters.exactDirectory) &&
            (currentFilters.exactRr === null || item.rr_site_count === currentFilters.exactRr) &&
            (currentFilters.minPopulation === null || item.population >= currentFilters.minPopulation) &&
            (currentFilters.maxPopulation === null || item.population <= currentFilters.maxPopulation);

        return matchesSearch && matchesState && matchesNiche && matchesCity && matchesStatus && matchesZips && matchesAdvanced;
    });

    if (filtered.length === 0) {
        nicheGrid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <h3>No Matching Niches Found</h3>
                <p>Try clearing your search filters or check your funnel submissions.</p>
            </div>
        `;
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    // Build unique states aggregated data if states view is selected
    let aggregated = [];
    if (currentViewBy !== 'cities') {
        const stateData = {};
        filtered.forEach(item => {
            if (item.state) {
                const stateUpper = item.state.toUpperCase();
                if (!stateData[stateUpper]) {
                    stateData[stateUpper] = {
                        cities: new Set(),
                        niches: new Set()
                    };
                }
                if (item.city) stateData[stateUpper].cities.add(item.city.toLowerCase());
                if (item.niche) stateData[stateUpper].niches.add(item.niche.toLowerCase());
            }
        });

        aggregated = Object.entries(stateData).map(([state, data]) => ({
            state,
            cityCount: data.cities.size,
            nicheCount: data.niches.size
        })).sort((a, b) => b.cityCount - a.cityCount);
    }

    const totalItems = currentViewBy === 'cities' ? filtered.length : aggregated.length;
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
    
    const paginatedCities = currentViewBy === 'cities' ? filtered.slice(startIdx, endIdx) : [];
    const paginatedStates = currentViewBy !== 'cities' ? aggregated.slice(startIdx, endIdx) : [];

    const tableContainer = document.createElement('div');
    tableContainer.className = 'niche-table-container';

    const table = document.createElement('table');
    table.className = 'niche-table';

    if (currentViewBy === 'cities') {
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 80px;">#</th>
                    <th>Niche Keyword</th>
                    <th>City</th>
                    <th style="width: 120px;">State</th>
                    <th style="width: 100px; text-align: center;">KD</th>
                    <th style="width: 150px; text-align: right;">Volume</th>
                </tr>
            </thead>
            <tbody id="nicheTableBody"></tbody>
        `;

        const tbody = table.querySelector('#nicheTableBody');

        paginatedCities.forEach((item, index) => {
            const tr = document.createElement('tr');
            
            const cityVal = item.city || '';
            const nicheVal = item.niche || '';
            const keywordVal = cityVal ? `${nicheVal} ${cityVal}` : nicheVal;
            const stateVal = item.state ? item.state.toUpperCase() : '—';
            const volumeVal = item.volume !== undefined && item.volume !== null ? item.volume : '0';

            tr.innerHTML = `
                <td class="row-number"><span class="row-arrow">▸</span>${startIdx + index + 1}</td>
                <td class="row-keyword">${escapeHtml(keywordVal)}</td>
                <td class="row-city">${escapeHtml(cityVal)}</td>
                <td class="row-state">${escapeHtml(stateVal)}</td>
                <td class="row-kd" style="text-align: center; color: var(--primary); font-weight: 600;">${item.kd !== undefined ? item.kd : 0}</td>
                <td class="row-volume" style="text-align: right;">${volumeVal}</td>
            `;

            tbody.appendChild(tr);
        });
    } else {
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 80px;">#</th>
                    <th>State</th>
                    <th style="text-align: right;">Niches</th>
                    <th style="text-align: right; width: 150px;">Cities</th>
                </tr>
            </thead>
            <tbody id="nicheTableBody"></tbody>
        `;

        const tbody = table.querySelector('#nicheTableBody');

        paginatedStates.forEach((item, index) => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td class="row-number"><span class="row-arrow">▸</span>${startIdx + index + 1}</td>
                <td><span class="state-badge-pill">${escapeHtml(item.state)}</span></td>
                <td style="text-align: right; font-weight: 600; color: #ff7e47;">${item.nicheCount}</td>
                <td class="row-volume" style="text-align: right;">${item.cityCount}</td>
            `;

            tbody.appendChild(tr);
        });
    }

    tableContainer.appendChild(table);
    nicheGrid.appendChild(tableContainer);

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
                    <button id="exportCsvBtnBottom" class="btn btn-secondary pagination-action-btn"><i class="fa-solid fa-file-csv"></i> Export filtered CSV</button>
                    <button id="exportCitiesBtnBottom" class="btn btn-secondary pagination-action-btn"><i class="fa-solid fa-file-csv"></i> Export Cities + State (.csv)</button>
                </div>
            </div>
        `;

        document.getElementById('prevPageBtn').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderNicheGrid();
            }
        });

        document.getElementById('nextPageBtn').addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderNicheGrid();
            }
        });

        document.getElementById('copyKeywordsBtn').addEventListener('click', () => {
            let text = '';
            if (currentViewBy === 'cities') {
                text = filtered.map(item => item.keyword).join('\n');
            } else {
                text = aggregated.map(item => item.state).join('\n');
            }
            navigator.clipboard.writeText(text).then(() => {
                showToast('Copied all filtered entries to clipboard!');
            }).catch(err => {
                console.error('Failed to copy entries:', err);
                alert('Failed to copy entries.');
            });
        });

        document.getElementById('exportCsvBtnBottom').addEventListener('click', () => {
            exportDataCSV(true);
        });

        // Bind export unique cities + state to TXT file (no comma separation) - sorted alphabetically by state
        document.getElementById('exportCitiesBtnBottom').addEventListener('click', () => {
            if (filtered.length === 0) {
                showToast('No records to export.', true);
                return;
            }

            const cityStateList = [];
            const seen = new Set();
            filtered.forEach(item => {
                const city = (item.city || '').trim().toLowerCase();
                const state = (item.state || '').trim().toUpperCase();
                if (city && state) {
                    const key = `${city}|${state}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        cityStateList.push({ city, state });
                    }
                }
            });

            if (cityStateList.length === 0) {
                showToast('No valid cities found to export.', true);
                return;
            }

            // Sort alphabetically by state, then by city
            cityStateList.sort((a, b) => {
                const stateCompare = a.state.localeCompare(b.state);
                if (stateCompare !== 0) return stateCompare;
                return a.city.localeCompare(b.city);
            });

            const csvRows = [["City", "State"]];
            cityStateList.forEach(item => {
                const escapedCity = item.city.replace(/"/g, '""');
                const escapedState = item.state.toLowerCase().replace(/"/g, '""');
                csvRows.push([`"${escapedCity}"`, `"${escapedState}"`]);
            });

            const content = csvRows.map(r => r.join(",")).join("\n");
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `passed_cities_state_${Date.now()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Exported unique cities + state .csv successfully!');
        });
    }
}


// Helper function to escape HTML string injection
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Export data to CSV format
function exportDataCSV(filteredOnly = false) {
    let dataToExport = nichesData;

    if (filteredOnly) {
        dataToExport = nichesData.filter(item => {
            const matchesSearch = !currentFilters.keyword ||
                item.niche.toLowerCase().includes(currentFilters.keyword) ||
                item.city.toLowerCase().includes(currentFilters.keyword) ||
                item.keyword.toLowerCase().includes(currentFilters.keyword) ||
                (item.state && item.state.toLowerCase().includes(currentFilters.keyword));

            const matchesState = currentFilters.state === 'all' ||
                (item.state && item.state.toLowerCase() === currentFilters.state.toLowerCase());

            const matchesNiche = currentFilters.niche === 'all' ||
                item.niche.toLowerCase() === currentFilters.niche.toLowerCase();

            const matchesCity = currentFilters.city === 'all' ||
                item.city.toLowerCase() === currentFilters.city.toLowerCase();

            const matchesStatus = currentFilters.status === 'all' ||
                item.status.toLowerCase() === currentFilters.status;

            const matchesZips = currentFilters.zips === null || item.zip_codes >= currentFilters.zips;

            const matchesAdvanced =
                (currentFilters.maxKd === null || item.kd <= currentFilters.maxKd) &&
                (currentFilters.maxVolume === null || item.volume <= currentFilters.maxVolume) &&
                (currentFilters.maxGmbCount === null || item.gmb_count <= currentFilters.maxGmbCount) &&
                (currentFilters.minTraffic === null || item.competitor_traffic >= currentFilters.minTraffic) &&
                (currentFilters.exactDa === null || item.da_count === currentFilters.exactDa) &&
                (currentFilters.maxGmbReviews === null || (item.gmb_reviews && item.gmb_reviews.every(r => r <= currentFilters.maxGmbReviews))) &&
                (currentFilters.exactDirectory === null || item.directory_count === currentFilters.exactDirectory) &&
                (currentFilters.exactRr === null || item.rr_site_count === currentFilters.exactRr) &&
                (currentFilters.minPopulation === null || item.population >= currentFilters.minPopulation) &&
                (currentFilters.maxPopulation === null || item.population <= currentFilters.maxPopulation);

            return matchesSearch && matchesState && matchesNiche && matchesCity && matchesStatus && matchesZips && matchesAdvanced;
        });
    }

    if (dataToExport.length === 0) {
        alert("No evaluations available to export.");
        return;
    }

    // CSV headers
    const headers = [
        "Niche Keyword", "City", "State", "KD", "Volume"
    ];

    const rows = dataToExport.map(item => {
        const keywordVal = `${item.niche || ''} ${item.city || ''}`.trim();
        return [
            `"${keywordVal}"`,
            `"${item.city || ''}"`,
            item.state || "",
            item.kd !== undefined ? item.kd : 0,
            item.volume || 0
        ];
    });

    const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `rank_rent_export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// DEVELOPER SCRIPT: Generate Dummy Niches
// Run `generateDummyNiches()` in the console
// ==========================================
window.generateDummyNiches = async function () {
    console.log("Generating dummy data according to current filters...", currentFilters);
    
    const nichesList = ['Plumbing', 'Roofing', 'Pest Control', 'HVAC', 'Landscaping', 'Tree Service', 'Tow Truck', 'Electrician', 'Carpet Cleaning', 'Pool Cleaning'];
    const citiesList = ['Austin', 'Denver', 'Mesa', 'Tampa', 'Raleigh', 'Tulsa', 'Omaha', 'Fresno', 'Tucson', 'Miami'];
    const statesList = ['TX', 'CO', 'AZ', 'FL', 'NC', 'OK', 'NE', 'CA', 'AZ', 'FL'];

    let successCount = 0;
    const countToGenerate = 5;

    for (let i = 0; i < countToGenerate; i++) {
        // Choose base niche, city, state
        let niche = currentFilters.niche !== 'all' ? currentFilters.niche : nichesList[Math.floor(Math.random() * nichesList.length)];
        let city = currentFilters.city !== 'all' ? currentFilters.city : citiesList[Math.floor(Math.random() * citiesList.length)];
        let state = currentFilters.state !== 'all' ? currentFilters.state.toUpperCase() : statesList[Math.floor(Math.random() * statesList.length)];

        // If search keyword is active, incorporate it
        if (currentFilters.keyword) {
            const kw = currentFilters.keyword.trim();
            if (!niche.toLowerCase().includes(kw) && !city.toLowerCase().includes(kw)) {
                if (Math.random() > 0.5) {
                    niche = kw.charAt(0).toUpperCase() + kw.slice(1);
                } else {
                    city = kw.charAt(0).toUpperCase() + kw.slice(1);
                }
            }
        }

        state = state.toUpperCase();

        // Determine target status (PASS/FAIL)
        let targetStatus = currentFilters.status;
        if (targetStatus === 'all') {
            targetStatus = Math.random() > 0.4 ? 'PASS' : 'FAIL';
        } else {
            targetStatus = targetStatus.toUpperCase();
        }

        // Generate properties satisfying filter values & target status constraints
        
        // Zips (PASS: >= 2, Filter: >= currentFilters.zips)
        let zips = 5;
        let minZips = targetStatus === 'PASS' ? 2 : 0;
        if (currentFilters.zips !== null) {
            minZips = Math.max(minZips, currentFilters.zips);
        }
        zips = Math.floor(Math.random() * 5) + minZips;

        // KD (PASS: <= 10, Filter: <= currentFilters.maxKd)
        let kd = 5;
        let maxKd = targetStatus === 'PASS' ? 10 : 25;
        if (currentFilters.maxKd !== null) {
            maxKd = Math.min(maxKd, currentFilters.maxKd);
        }
        kd = Math.floor(Math.random() * (maxKd + 1));

        // Volume (PASS: >= 100, Filter: <= currentFilters.maxVolume)
        let volume = 250;
        let minVol = targetStatus === 'PASS' ? 100 : 0;
        let maxVol = 1000;
        if (currentFilters.maxVolume !== null) {
            maxVol = Math.min(maxVol, currentFilters.maxVolume);
            if (minVol > maxVol) minVol = maxVol;
        }
        volume = Math.floor(Math.random() * (maxVol - minVol + 1)) + minVol;

        // DA < 10 count (PASS: >= 4, Filter: == currentFilters.exactDa)
        let da_count = 5;
        if (currentFilters.exactDa !== null) {
            da_count = currentFilters.exactDa;
        } else {
            da_count = targetStatus === 'PASS' ? Math.floor(Math.random() * 5) + 4 : Math.floor(Math.random() * 4);
        }

        // GMB reviews (PASS: all <= 100, Filter: all <= currentFilters.maxGmbReviews)
        let gmb_reviews = [25, 45, 12];
        let reviewsLimit = targetStatus === 'PASS' ? 100 : 250;
        if (currentFilters.maxGmbReviews !== null) {
            reviewsLimit = Math.min(reviewsLimit, currentFilters.maxGmbReviews);
        }
        if (targetStatus === 'PASS') {
            gmb_reviews = [
                Math.floor(Math.random() * (reviewsLimit + 1)),
                Math.floor(Math.random() * (reviewsLimit + 1)),
                Math.floor(Math.random() * (reviewsLimit + 1))
            ];
        } else {
            gmb_reviews = [
                Math.floor(Math.random() * (reviewsLimit + 1)),
                Math.floor(Math.random() * 100) + 101, // force one > 100 review count to trigger FAIL status
                Math.floor(Math.random() * (reviewsLimit + 1))
            ];
        }

        // GMB Count (PASS: >= 10, Filter: <= currentFilters.maxGmbCount)
        let gmb_count = 12;
        let minGmb = targetStatus === 'PASS' ? 10 : 0;
        let maxGmb = 25;
        if (currentFilters.maxGmbCount !== null) {
            maxGmb = Math.min(maxGmb, currentFilters.maxGmbCount);
            if (minGmb > maxGmb) minGmb = maxGmb;
        }
        gmb_count = Math.floor(Math.random() * (maxGmb - minGmb + 1)) + minGmb;

        // Competitor Traffic (PASS: >= 50, Filter: >= currentFilters.minTraffic)
        let competitor_traffic = 75;
        let minTraffic = targetStatus === 'PASS' ? 50 : 0;
        if (currentFilters.minTraffic !== null) {
            minTraffic = Math.max(minTraffic, currentFilters.minTraffic);
        }
        competitor_traffic = Math.floor(Math.random() * 200) + minTraffic;

        // Directories count (PASS: >= 1, Filter: == currentFilters.exactDirectory)
        let directory_count = 2;
        if (currentFilters.exactDirectory !== null) {
            directory_count = currentFilters.exactDirectory;
        } else {
            directory_count = targetStatus === 'PASS' ? Math.floor(Math.random() * 4) + 1 : 0;
        }

        // R&R Site count (PASS: >= 1, Filter: == currentFilters.exactRr)
        let rr_site_count = 1;
        if (currentFilters.exactRr !== null) {
            rr_site_count = currentFilters.exactRr;
        } else {
            rr_site_count = targetStatus === 'PASS' ? Math.floor(Math.random() * 3) + 1 : 0;
        }

        // Population (Filter: between minPopulation and maxPopulation)
        let minPop = currentFilters.minPopulation !== null ? currentFilters.minPopulation : 5000;
        let maxPop = currentFilters.maxPopulation !== null ? currentFilters.maxPopulation : 1000000;
        if (minPop > maxPop) maxPop = minPop + 50000;
        let population = Math.floor(Math.random() * (maxPop - minPop + 1)) + minPop;

        const keyword = `${niche.toLowerCase()} ${city.toLowerCase()} ${state.toLowerCase()}`;

        const dummyRecord = {
            niche,
            city,
            state,
            population,
            zip_codes: zips,
            keyword,
            kd,
            volume,
            da_count,
            gmb_reviews,
            gmb_count,
            competitor_traffic,
            directory_count,
            rr_site_count
        };

        const evaluation = evaluateNicheCriteria(dummyRecord);
        const newNiche = {
            ...dummyRecord,
            status: evaluation.status,
            fail_reasons: evaluation.failReasons
        };

        if (supabaseClient) {
            try {
                const { error } = await supabaseClient.from('niches').insert([newNiche]);
                if (!error) {
                    successCount++;
                } else {
                    console.error("Supabase insert error for dummy niche:", error);
                }
            } catch (err) {
                console.error("Supabase insert exception for dummy niche:", err);
            }
        }
    }

    if (supabaseClient && successCount > 0) {
        await loadNiches();
        renderDashboard();
        console.log(`Successfully generated ${successCount} dummy niches in the database!`);
        alert(`Successfully generated ${successCount} dummy niches in the database matching current filters!`);
    } else {
        console.warn("Failed to save dummy niches to the database. Make sure your RLS policies allow insertions.");
        alert("Failed to save dummy niches to the Supabase database.\n\nReason: RLS policies might be blocking inserts, or Supabase is not initialized.\n\nPlease copy and run the SQL statements in 'seed.sql' inside your Supabase SQL Editor to populate the database and configure permissions directly.");
    }
};

// Abbreviate large numbers for UI layout
function formatPopulation(num) {
    if (!num) return '';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num;
}

