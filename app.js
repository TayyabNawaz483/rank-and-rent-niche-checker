// Application Logic for Rank & Rent Niche Evaluator

// Application State
let nichesData = [];
let supabaseClient = null;
let currentFilters = {
    keyword: '',
    state: 'all',
    niche: 'all',
    city: 'all',
    status: 'all',
    zips: null
};



const openAddModalBtn = document.getElementById('openAddModalBtn');
const closeAddModalBtn = document.getElementById('closeAddModalBtn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const addModal = document.getElementById('addModal');
const saveNicheBtn = document.getElementById('saveNicheBtn');
const nicheForm = document.getElementById('nicheForm');



const searchNiche = document.getElementById('searchNiche');
const filterState = document.getElementById('filterState');
const filterNiche = document.getElementById('filterNiche');
const filterCity = document.getElementById('filterCity');
const filterZips = document.getElementById('filterZips');
const statusPills = document.querySelectorAll('.status-pill[data-status]');
const nicheGrid = document.getElementById('nicheGrid');

const statTotal = document.getElementById('statTotal');
const statPassed = document.getElementById('statPassed');
const statFailed = document.getElementById('statFailed');
const statRatio = document.getElementById('statRatio');

const accordionHeader = document.getElementById('accordionHeader');
const accordionContent = document.getElementById('accordionContent');
const accordionArrow = document.getElementById('accordionArrow');

// Form Inputs for Live Eval
const nicheInput = document.getElementById('nicheInput');
const cityInput = document.getElementById('cityInput');
const stateInput = document.getElementById('stateInput');
const populationInput = document.getElementById('populationInput');
const zipsInput = document.getElementById('zipsInput');
const keywordInput = document.getElementById('keywordInput');
const kdInput = document.getElementById('kdInput');
const volumeInput = document.getElementById('volumeInput');
const daCountInput = document.getElementById('daCountInput');
const gmbReview1 = document.getElementById('gmbReview1');
const gmbReview2 = document.getElementById('gmbReview2');
const gmbReview3 = document.getElementById('gmbReview3');
const gmbCountInput = document.getElementById('gmbCountInput');
const competitorTrafficInput = document.getElementById('competitorTrafficInput');
const hasDirectoryCheckbox = document.getElementById('hasDirectoryCheckbox');
const hasRrSiteCheckbox = document.getElementById('hasRrSiteCheckbox');
const liveStatusIndicator = document.getElementById('liveStatusIndicator');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSupabase();
    loadNiches();
    setupEventListeners();
    runLiveEvaluation(); // Initial evaluation of form defaults
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
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('niches')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            nichesData = data || [];
        } catch (e) {
            console.error("Supabase fetch failed, falling back to LocalStorage:", e);
            loadLocalNiches();
        }
    } else {
        loadLocalNiches();
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
            has_directory: true,
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
            has_directory: true,
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
            has_directory: true,
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
    // Accordion
    accordionHeader.addEventListener('click', () => {
        accordionContent.classList.toggle('open');
        accordionArrow.style.transform = accordionContent.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    // Modals visibility
    openAddModalBtn.addEventListener('click', () => {
        addModal.classList.add('open');
        runLiveEvaluation();
    });
    closeAddModalBtn.addEventListener('click', () => addModal.classList.remove('open'));
    cancelAddBtn.addEventListener('click', () => addModal.classList.remove('open'));



    // Filter controls
    searchNiche.addEventListener('input', (e) => {
        currentFilters.keyword = e.target.value.toLowerCase();
        renderNicheGrid();
    });

    filterState.addEventListener('change', (e) => {
        currentFilters.state = e.target.value;
        renderNicheGrid();
    });

    filterNiche.addEventListener('change', (e) => {
        currentFilters.niche = e.target.value;
        renderNicheGrid();
    });

    filterCity.addEventListener('change', (e) => {
        currentFilters.city = e.target.value;
        renderNicheGrid();
    });

    filterZips.addEventListener('input', (e) => {
        currentFilters.zips = e.target.value ? parseInt(e.target.value) : null;
        renderNicheGrid();
    });

    statusPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            statusPills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            currentFilters.status = e.target.dataset.status;
            renderNicheGrid();
        });
    });

    // Suggestion Tags inside Add Form
    document.querySelectorAll('#nicheSuggestions .suggestion-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            nicheInput.value = tag.textContent;
            updateKeywordDefault();
            runLiveEvaluation();
        });
    });

    document.querySelectorAll('#citySuggestions .suggestion-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            cityInput.value = tag.textContent;
            updateKeywordDefault();
            runLiveEvaluation();
        });
    });

    stateInput.addEventListener('change', () => {
        updateKeywordDefault();
        runLiveEvaluation();
    });

    nicheInput.addEventListener('input', () => {
        updateKeywordDefault();
        runLiveEvaluation();
    });
    cityInput.addEventListener('input', () => {
        updateKeywordDefault();
        runLiveEvaluation();
    });
    stateInput.addEventListener('input', () => {
        updateKeywordDefault();
        runLiveEvaluation();
    });

    // Live validation listener bindings
    [
        kdInput, volumeInput, daCountInput, 
        gmbReview1, gmbReview2, gmbReview3, 
        gmbCountInput, competitorTrafficInput,
        hasDirectoryCheckbox, hasRrSiteCheckbox,
        stateInput, zipsInput
    ].forEach(input => {
        input.addEventListener('input', runLiveEvaluation);
        input.addEventListener('change', runLiveEvaluation);
    });

    // Save Data Click
    saveNicheBtn.addEventListener('click', handleSaveData);

    // Export CSV Actions
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => exportDataCSV(true));
    }
}

// Automatically helper to fill target keyword
function updateKeywordDefault() {
    const nicheVal = nicheInput.value.trim().toLowerCase();
    const cityVal = cityInput.value.trim();
    const stateVal = stateInput.value.trim().toUpperCase();
    if (nicheVal && cityVal) {
        keywordInput.value = stateVal ? `${nicheVal} ${cityVal} ${stateVal}` : `${nicheVal} ${cityVal}`;
    }
}


// Evaluates the Rank & Rent Niche Criteria
function evaluateNicheCriteria(data) {
    const rules = {
        zips: {
            pass: data.zips >= 2,
            text: `${data.zips} City Zip Codes (min 2 required)`
        },
        kd: {
            pass: data.kd <= 10,
            text: `KD is ${data.kd} (must be 10 or less)`
        },
        volume: {
            pass: data.volume >= 100,
            text: `Search Volume is ${data.volume} (min 100 required)`
        },
        daCount: {
            pass: data.da_count >= 4,
            text: `${data.da_count} sites with DA < 10 (min 4 required)`
        },
        gmbReviews: {
            pass: data.gmb_reviews.every(reviews => reviews <= 100),
            text: `GMB map reviews: [${data.gmb_reviews.join(', ')}] (all must be <= 100)`
        },
        gmbCount: {
            pass: data.gmb_count >= 10,
            text: `${data.gmb_count} GMB profiles in area (min 10 required)`
        },
        directory: {
            pass: data.has_directory === true,
            text: `Directory ranks in SERP: ${data.has_directory ? 'Yes' : 'No'}`
        },
        traffic: {
            pass: data.competitor_traffic >= 50,
            text: `Competitor Traffic: ${data.competitor_traffic} (min 50 required)`
        },
        rrSite: {
            pass: data.has_rr_site === true,
            text: `Existing R&R/EMD/Micro site available in SERP: ${data.has_rr_site ? 'Yes' : 'No'}`
        }
    };

    const failReasons = [];
    if (!rules.zips.pass) failReasons.push(`City must have at least 2 zip codes (has ${data.zips})`);
    if (!rules.kd.pass) failReasons.push(`Keyword Difficulty is too high (${data.kd} > 10)`);
    if (!rules.volume.pass) failReasons.push(`Search Volume is too low (${data.volume} < 100)`);
    if (!rules.daCount.pass) failReasons.push(`Only ${data.da_count} SERP sites with DA < 10 (needs at least 4)`);
    if (!rules.gmbReviews.pass) failReasons.push(`Map Pack has competitor GMBs with more than 100 reviews`);
    if (!rules.gmbCount.pass) failReasons.push(`Too few GMB profiles in the area (${data.gmb_count} < 10)`);
    if (!rules.directory.pass) failReasons.push(`No major business directory rankings found in SERP`);
    if (!rules.traffic.pass) failReasons.push(`Competitor traffic is too low (${data.competitor_traffic} < 50)`);
    if (!rules.rrSite.pass) failReasons.push(`No existing Rank & Rent / EMD / Micro Site found in SERP`);

    const status = failReasons.length === 0 ? 'PASS' : 'FAIL';

    return {
        status,
        rules,
        failReasons
    };
}

// Live Validation UI Renderer
function runLiveEvaluation() {
    const isFormEmpty = !nicheInput.value.trim() && 
                        !cityInput.value.trim() && 
                        !stateInput.value.trim() &&
                        !populationInput.value &&
                        !zipsInput.value &&
                        !kdInput.value && 
                        !volumeInput.value && 
                        !daCountInput.value &&
                        !gmbReview1.value && 
                        !gmbReview2.value && 
                        !gmbReview3.value &&
                        !gmbCountInput.value && 
                        !competitorTrafficInput.value;

    if (isFormEmpty) {
        liveStatusIndicator.className = 'live-status-indicator pending';
        liveStatusIndicator.textContent = 'PENDING';

        const pendingRules = ['evalKd', 'evalVolume', 'evalDa', 'evalGmbReviews', 'evalGmbCount', 'evalDirectory', 'evalTraffic', 'evalRrSite', 'evalZips'];
        pendingRules.forEach(id => {
            const container = document.getElementById(id);
            const valTextEl = container.querySelector('.eval-status-val');
            const icon = container.querySelector('.eval-icon');
            
            container.className = 'live-eval-item';
            valTextEl.textContent = '-';
            valTextEl.className = 'eval-status-val text-muted';
            valTextEl.style.color = 'var(--text-muted)';
            icon.className = 'fa-solid fa-circle-question eval-icon pending';
        });
        return;
    }

    const data = {
        zips: parseInt(zipsInput.value) || 0,
        kd: parseInt(kdInput.value) || 0,
        volume: parseInt(volumeInput.value) || 0,
        da_count: parseInt(daCountInput.value) || 0,
        gmb_reviews: [
            parseInt(gmbReview1.value) || 0,
            parseInt(gmbReview2.value) || 0,
            parseInt(gmbReview3.value) || 0
        ],
        gmb_count: parseInt(gmbCountInput.value) || 0,
        competitor_traffic: parseInt(competitorTrafficInput.value) || 0,
        has_directory: hasDirectoryCheckbox.checked,
        has_rr_site: hasRrSiteCheckbox.checked
    };

    const evalResult = evaluateNicheCriteria(data);

    // Update Overall Live Badge
    if (evalResult.status === 'PASS') {
        liveStatusIndicator.className = 'live-status-indicator pass';
        liveStatusIndicator.textContent = 'PASS';
    } else {
        liveStatusIndicator.className = 'live-status-indicator fail';
        liveStatusIndicator.textContent = 'FAIL';
    }

    // Render Checklist items
    updateChecklistItem('evalZips', 'evalZipsVal', evalResult.rules.zips);
    updateChecklistItem('evalKd', 'evalKdVal', evalResult.rules.kd);
    updateChecklistItem('evalVolume', 'evalVolumeVal', evalResult.rules.volume);
    updateChecklistItem('evalDa', 'evalDaVal', evalResult.rules.daCount);
    updateChecklistItem('evalGmbReviews', 'evalGmbReviewsVal', evalResult.rules.gmbReviews);
    updateChecklistItem('evalGmbCount', 'evalGmbCountVal', evalResult.rules.gmbCount);
    updateChecklistItem('evalDirectory', 'evalDirectoryVal', evalResult.rules.directory);
    updateChecklistItem('evalTraffic', 'evalTrafficVal', evalResult.rules.traffic);
    updateChecklistItem('evalRrSite', 'evalRrSiteVal', evalResult.rules.rrSite);
}

function updateChecklistItem(itemId, valId, rule) {
    const container = document.getElementById(itemId);
    const valTextEl = document.getElementById(valId);
    const icon = container.querySelector('.eval-icon');

    valTextEl.textContent = rule.pass ? 'PASS' : 'FAIL';
    valTextEl.className = rule.pass ? 'eval-status-val text-success' : 'eval-status-val text-danger';

    if (rule.pass) {
        container.className = 'live-eval-item pass';
        icon.className = 'fa-solid fa-circle-check eval-icon pass';
        valTextEl.style.color = 'var(--success)';
    } else {
        container.className = 'live-eval-item fail';
        icon.className = 'fa-solid fa-circle-xmark eval-icon fail';
        valTextEl.style.color = 'var(--danger)';
    }
}

// Handle Form Submission Save Data
async function handleSaveData(e) {
    e.preventDefault();

    if (!nicheForm.checkValidity()) {
        nicheForm.reportValidity();
        return;
    }

    const niche = nicheInput.value.trim();
    const city = cityInput.value.trim();
    const state = stateInput.value.trim().toUpperCase();
    const population = parseInt(populationInput.value) || null;
    const zips = parseInt(zipsInput.value) || 0;
    const keyword = keywordInput.value.trim();
    const kd = parseInt(kdInput.value) || 0;
    const volume = parseInt(volumeInput.value) || 0;
    const da_count = parseInt(daCountInput.value) || 0;
    const gmb_reviews = [
        parseInt(gmbReview1.value) || 0,
        parseInt(gmbReview2.value) || 0,
        parseInt(gmbReview3.value) || 0
    ];
    const gmb_count = parseInt(gmbCountInput.value) || 0;
    const competitor_traffic = parseInt(competitorTrafficInput.value) || 0;
    const has_directory = hasDirectoryCheckbox.checked;
    const has_rr_site = hasRrSiteCheckbox.checked;

    const evaluation = evaluateNicheCriteria({
        kd, volume, da_count, gmb_reviews, gmb_count, competitor_traffic, has_directory, has_rr_site, zips
    });

    const newNiche = {
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
        has_directory,
        has_rr_site,
        status: evaluation.status,
        fail_reasons: evaluation.failReasons
    };

    saveNicheBtn.disabled = true;
    saveNicheBtn.textContent = 'Saving...';

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('niches')
                .insert([newNiche])
                .select();

            if (error) throw error;
            if (data && data[0]) {
                nichesData.unshift(data[0]);
            } else {
                // If select fails or returns empty, fetch again
                await loadNiches();
            }
        } catch (error) {
            console.error("Supabase insert error, saving to LocalStorage fallback:", error);
            newNiche.id = 'local-' + Date.now();
            newNiche.created_at = new Date().toISOString();
            nichesData.unshift(newNiche);
            saveLocalNiches();
        }
    } else {
        newNiche.id = 'local-' + Date.now();
        newNiche.created_at = new Date().toISOString();
        nichesData.unshift(newNiche);
        saveLocalNiches();
    }

    saveNicheBtn.disabled = false;
    saveNicheBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Niche Data';
    
    // Close Modal & Reset Form
    addModal.classList.remove('open');
    nicheForm.reset();
    updateKeywordDefault();
    
    renderDashboard();
}

// Handle Delete Data Row
async function deleteNiche(id) {
    if (!confirm('Are you sure you want to delete this niche evaluation?')) return;

    if (supabaseClient && !id.toString().startsWith('local-')) {
        try {
            const { error } = await supabaseClient
                .from('niches')
                .delete()
                .eq('id', id);

            if (error) throw error;
            nichesData = nichesData.filter(item => item.id !== id);
        } catch (error) {
            console.error("Failed to delete from Supabase:", error);
            alert("Failed to delete from Supabase database. Deleting locally instead.");
            nichesData = nichesData.filter(item => item.id !== id);
        }
    } else {
        nichesData = nichesData.filter(item => item.id !== id);
        saveLocalNiches();
    }
    renderDashboard();
}

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
    const total = nichesData.length;
    const passed = nichesData.filter(item => item.status === 'PASS').length;
    const failed = total - passed;
    const ratio = total > 0 ? Math.round((passed / total) * 100) : 0;

    statTotal.textContent = total;
    statPassed.textContent = passed;
    statFailed.textContent = failed;
    statRatio.textContent = `${ratio}%`;
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
            
        return matchesSearch && matchesState && matchesNiche && matchesCity && matchesStatus && matchesZips;
    });

    if (filtered.length === 0) {
        nicheGrid.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <h3>No Matching Niches Found</h3>
                <p>Try clearing your search filters or add a new niche evaluating record.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('article');
        card.className = 'niche-card';
        card.id = `card-${item.id}`;

        const evaluation = evaluateNicheCriteria(item);
        const passClass = item.status === 'PASS' ? 'pass' : 'fail';
        const dateStr = new Date(item.created_at).toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });

        // Compute average review or map pack review tags
        const reviewsStr = item.gmb_reviews ? item.gmb_reviews.join(', ') : '0';

        card.innerHTML = `
            <div class="niche-card-header">
                <div class="niche-card-title">
                    <span class="niche-name">${escapeHtml(item.niche)}</span>
                    <span class="niche-city">
                        <i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.city)}${item.state ? ', ' + escapeHtml(item.state.toUpperCase()) : ''}${item.population ? ' (Pop: ' + formatPopulation(item.population) + ')' : ''}
                    </span>
                </div>
                <span class="status-badge ${passClass}">${item.status}</span>
            </div>

            <div class="niche-stats-summary">
                <div class="niche-stat-box">
                    <div class="box-val" style="color: var(--primary);">${item.kd}</div>
                    <div class="box-lbl">Difficulty (KD)</div>
                </div>
                <div class="niche-stat-box">
                    <div class="box-val" style="color: var(--secondary);">${item.volume}</div>
                    <div class="box-lbl">Search Volume</div>
                </div>
            </div>

            <div class="niche-card-actions">
                <a href="details.html?id=${item.id}" class="details-toggle-btn" style="text-decoration: none;">
                    <span>View Evaluation Details</span>
                    <i class="fa-solid fa-arrow-right-long"></i>
                </a>
                <span style="font-size: 0.7rem; color: var(--text-muted);">${dateStr}</span>
            </div>
        `;

        nicheGrid.appendChild(card);
    });
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
                
            return matchesSearch && matchesState && matchesNiche && matchesCity && matchesStatus;
        });
    }

    if (dataToExport.length === 0) {
        alert("No evaluations available to export.");
        return;
    }

    // CSV headers
    const headers = [
        "Niche",
        "City",
        "State",
        "Population",
        "Target Keyword",
        "KD",
        "Search Volume",
        "DA < 10 Count",
        "GMB Reviews",
        "GMB Count",
        "Competitor Traffic",
        "Has Directory",
        "Has R&R Site",
        "Status",
        "Failure Reasons",
        "Evaluation Date"
    ];

    // Map rows
    const rows = dataToExport.map(item => {
        const reviewsStr = item.gmb_reviews ? item.gmb_reviews.join(' | ') : '';
        const reasonsStr = item.fail_reasons ? item.fail_reasons.join(' | ') : '';
        const dateStr = new Date(item.created_at).toISOString();

        return [
            item.niche,
            item.city,
            item.state || '',
            item.population || '',
            item.keyword,
            item.kd,
            item.volume,
            item.da_count,
            reviewsStr,
            item.gmb_count,
            item.competitor_traffic,
            item.has_directory ? "Yes" : "No",
            item.has_rr_site ? "Yes" : "No",
            item.status,
            reasonsStr,
            dateStr
        ].map(val => {
            let strVal = val === null || val === undefined ? '' : String(val);
            strVal = strVal.replace(/"/g, '""');
            if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                return `"${strVal}"`;
            }
            return strVal;
        }).join(',');
    });

    const csvContent = "\ufeff" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const filename = `rank_rent_export_${Date.now()}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Abbreviate large numbers for UI layout
function formatPopulation(num) {
    if (!num) return '';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num;
}

