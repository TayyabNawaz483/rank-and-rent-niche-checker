// Admin Dashboard Logic

let dbData = [];
let failedDbData = [];
let activeTab = 'active'; // 'active' or 'failed'
let selectedIds = new Set();
let adminClient = null;
let currentPage = 1;
const PAGE_SIZE = 50;

// Form selectors for Niche Add Modal
let openAddModalBtn, closeAddModalBtn, cancelAddBtn, addModal, saveNicheBtn, nicheForm;
let nicheInput, cityInput, stateInput, populationInput, zipsInput, keywordInput, kdInput, volumeInput, daCountInput;
let gmbReview1, gmbReview2, gmbReview3, gmbCountInput, competitorTrafficInput, directoryCountInput, rrSiteCountInput;
let liveStatusIndicator;

document.addEventListener('DOMContentLoaded', async () => {
    // Theme toggle
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

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await window.AuthService.logout();
    });

    // Enforce Authentication
    const isAuthenticated = await window.AuthService.requireAuth();
    if (!isAuthenticated) return;
    
    adminClient = window.AuthService.getClient();

    // Enforce Admin Role Guard
    try {
        const { data: { user } } = await adminClient.auth.getUser();
        const role = window.AuthService.getUserRole(user);
        if (role !== 'admin') {
            window.location.replace('/stage1');
            return;
        }
    } catch (e) {
        console.error("Admin verification failed:", e);
        window.location.replace('/funnel-login');
        return;
    }

    setupAdminListeners();
    await fetchAdminData();
});

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
}

function setupAdminListeners() {
    // Tab switching event listeners
    const tabActiveNiches = document.getElementById('tabActiveNiches');
    const tabFailedNiches = document.getElementById('tabFailedNiches');

    if (tabActiveNiches && tabFailedNiches) {
        tabActiveNiches.style.cursor = 'pointer';
        tabFailedNiches.style.cursor = 'pointer';

        tabActiveNiches.addEventListener('click', async () => {
            if (activeTab === 'active') return;
            activeTab = 'active';
            tabActiveNiches.classList.add('active');
            tabFailedNiches.classList.remove('active');
            
            // UI Styling Updates
            tabActiveNiches.style.color = 'var(--text-primary)';
            tabActiveNiches.style.borderBottom = '2px solid var(--primary)';
            tabActiveNiches.style.fontWeight = '700';
            
            tabFailedNiches.style.color = 'var(--text-secondary)';
            tabFailedNiches.style.borderBottom = '2px solid transparent';
            tabFailedNiches.style.fontWeight = '600';
            
            // Show evaluate button
            const openAddModalBtn = document.getElementById('openAddModalBtn');
            if (openAddModalBtn) openAddModalBtn.style.display = 'inline-flex';

            const exportCsvBtn = document.getElementById('exportCsvBtn');
            if (exportCsvBtn) exportCsvBtn.innerHTML = '<i class="fa-solid fa-download"></i> Export All CSV';
            
            document.getElementById('selectAllCheckbox').checked = false;
            selectedIds.clear();
            updateBulkActionsBar();
            
            currentPage = 1;
            renderTableHeader();
            await fetchAdminData();
        });

        tabFailedNiches.addEventListener('click', async () => {
            if (activeTab === 'failed') return;
            activeTab = 'failed';
            tabFailedNiches.classList.add('active');
            tabActiveNiches.classList.remove('active');
            
            // UI Styling Updates
            tabFailedNiches.style.color = 'var(--text-primary)';
            tabFailedNiches.style.borderBottom = '2px solid var(--primary)';
            tabFailedNiches.style.fontWeight = '700';
            
            tabActiveNiches.style.color = 'var(--text-secondary)';
            tabActiveNiches.style.borderBottom = '2px solid transparent';
            tabActiveNiches.style.fontWeight = '600';
            
            // Hide evaluate button
            const openAddModalBtn = document.getElementById('openAddModalBtn');
            if (openAddModalBtn) openAddModalBtn.style.display = 'none';

            const exportCsvBtn = document.getElementById('exportCsvBtn');
            if (exportCsvBtn) exportCsvBtn.innerHTML = '<i class="fa-solid fa-download"></i> Export Failed CSV';

            document.getElementById('selectAllCheckbox').checked = false;
            selectedIds.clear();
            updateBulkActionsBar();
            
            currentPage = 1;
            renderTableHeader();
            await fetchFailedNiches();
        });
    }

    const selectAllCb = document.getElementById('selectAllCheckbox');
    if (selectAllCb) {
        selectAllCb.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            if (e.target.checked) {
                checkboxes.forEach(cb => {
                    cb.checked = true;
                    selectedIds.add(cb.value);
                });
            } else {
                checkboxes.forEach(cb => {
                    cb.checked = false;
                    selectedIds.delete(cb.value);
                });
            }
            updateBulkActionsBar();
        });
    }

    document.getElementById('bulkDeleteBtn').addEventListener('click', handleBulkDelete);
    document.getElementById('exportCsvBtn').addEventListener('click', exportAdminCSV);

    // Initialize Add Niche form selectors
    initModalSelectors();

    // Modal visibility listeners
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => {
            addModal.classList.add('open');
            runLiveEvaluation();
        });
    }
    if (closeAddModalBtn) {
        closeAddModalBtn.addEventListener('click', () => addModal.classList.remove('open'));
    }
    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', () => addModal.classList.remove('open'));
    }

    // Suggestions click bindings
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

    if (stateInput) {
        stateInput.addEventListener('change', () => {
            updateKeywordDefault();
            runLiveEvaluation();
        });
        stateInput.addEventListener('input', () => {
            updateKeywordDefault();
            runLiveEvaluation();
        });
    }
    if (nicheInput) {
        nicheInput.addEventListener('input', () => {
            updateKeywordDefault();
            runLiveEvaluation();
        });
    }
    if (cityInput) {
        cityInput.addEventListener('input', () => {
            updateKeywordDefault();
            runLiveEvaluation();
        });
    }

    // Bind event triggers for live validation
    [
        kdInput, volumeInput, daCountInput,
        gmbReview1, gmbReview2, gmbReview3,
        gmbCountInput, competitorTrafficInput,
        directoryCountInput, rrSiteCountInput,
        zipsInput
    ].forEach(input => {
        if (input) {
            input.addEventListener('input', runLiveEvaluation);
            input.addEventListener('change', runLiveEvaluation);
        }
    });

    if (saveNicheBtn) {
        saveNicheBtn.addEventListener('click', handleSaveData);
    }
}

async function fetchAdminData() {
    let remoteNiches = [];
    try {
        if (adminClient) {
            const { data, error } = await adminClient
                .from('niches')
                .select('*');
            if (error) throw error;
            remoteNiches = data || [];
        }
    } catch (error) {
        console.error("Error fetching remote niches data:", error);
    }

    // Load from local storage
    let localNiches = [];
    try {
        const local = localStorage.getItem('rank_rent_niches');
        if (local) {
            localNiches = JSON.parse(local);
        }
    } catch (e) {
        console.warn("Failed to load local niches:", e);
    }

    // Merge niches
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
    dbData = merged;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const totalItems = dbData.length;
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
    const paginatedItems = dbData.slice(startIdx, endIdx);

    if (dbData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No records found in the database.
                </td>
            </tr>
        `;
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    paginatedItems.forEach(item => {
        const tr = document.createElement('tr');
        const dateStr = new Date(item.created_at).toLocaleDateString();

        tr.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" class="row-checkbox" value="${item.id}">
            </td>
            <td style="font-weight: 600;">${escapeHtml(item.niche)}</td>
            <td>${escapeHtml(item.city)}${item.state ? ', ' + escapeHtml(item.state.toUpperCase()) : ''}</td>
            <td><code style="background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.8rem;">${escapeHtml(item.keyword)}</code></td>
            <td style="color: var(--primary); font-weight: 600;">${item.kd}</td>
            <td style="color: var(--secondary); font-weight: 600;">${item.volume}</td>
            <td class="notes-cell">${renderNotesPills(item)}</td>
            <td style="color: var(--text-muted); font-size: 0.85rem;">${dateStr}</td>
            <td>
                <button class="action-btn delete-btn" data-id="${item.id}" title="Delete Record">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Bind individual checkboxes
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.checked = selectedIds.has(cb.value.toString()) || selectedIds.has(cb.value);
        cb.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedIds.add(e.target.value);
            } else {
                selectedIds.delete(e.target.value);
                document.getElementById('selectAllCheckbox').checked = false;
            }
            updateBulkActionsBar();
        });
    });

    // Bind delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            handleSingleDelete(id);
        });
    });

    // Bind notes edit buttons
    document.querySelectorAll('.notes-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            openNotesEditor(id);
        });
    });

    // Bind notes pills click to open editor
    document.querySelectorAll('.notes-pills').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.getAttribute('data-id');
            openNotesEditor(id);
        });
    });

    renderAdminPagination(totalPages, dbData);
}

function updateBulkActionsBar() {
    const bar = document.getElementById('bulkActionsBar');
    const count = document.getElementById('selectedCount');
    
    count.textContent = selectedIds.size;
    if (selectedIds.size > 0) {
        bar.classList.add('active');
    } else {
        bar.classList.remove('active');
    }
}

async function handleSingleDelete(id) {
    console.log("Single delete triggered for ID:", id);
    const confirmed = await showDeleteConfirm('Are you sure you want to delete this record forever? This action cannot be undone.');
    console.log("User confirmation:", confirmed);
    if (!confirmed) return;

    localStorage.setItem('rank_rent_initialized', 'true');
    localStorage.setItem('rank_rent_failed_initialized', 'true');

    const targetTable = activeTab === 'active' ? 'niches' : 'failed_niches';

    try {
        const { error } = await adminClient.from(targetTable).delete().eq('id', id);
        if (error) throw error;
        
        if (activeTab === 'active') {
            dbData = dbData.filter(item => item.id != id);
            selectedIds.delete(id);
            localStorage.setItem('rank_rent_niches', JSON.stringify(dbData));
            renderTable();
        } else {
            failedDbData = failedDbData.filter(item => item.id != id);
            selectedIds.delete(id);
            localStorage.setItem('rank_rent_failed_niches', JSON.stringify(failedDbData));
            renderFailedTable();
        }
        updateBulkActionsBar();
    } catch (error) {
        console.warn("Database delete failed, removing locally:", error);
        if (activeTab === 'active') {
            dbData = dbData.filter(item => item.id != id);
            selectedIds.delete(id);
            localStorage.setItem('rank_rent_niches', JSON.stringify(dbData));
            renderTable();
        } else {
            failedDbData = failedDbData.filter(item => item.id != id);
            selectedIds.delete(id);
            localStorage.setItem('rank_rent_failed_niches', JSON.stringify(failedDbData));
            renderFailedTable();
        }
        updateBulkActionsBar();
    }
}

async function handleBulkDelete() {
    const confirmed = await showDeleteConfirm(`Are you sure you want to delete ${selectedIds.size} records forever? This action cannot be undone.`, true);
    if (!confirmed) return;

    localStorage.setItem('rank_rent_initialized', 'true');
    localStorage.setItem('rank_rent_failed_initialized', 'true');

    const idsToDelete = Array.from(selectedIds);
    const targetTable = activeTab === 'active' ? 'niches' : 'failed_niches';

    try {
        const { error } = await adminClient.from(targetTable).delete().in('id', idsToDelete);
        if (error) throw error;
        
        if (activeTab === 'active') {
            dbData = dbData.filter(item => !selectedIds.has(item.id.toString()) && !selectedIds.has(item.id));
            selectedIds.clear();
            document.getElementById('selectAllCheckbox').checked = false;
            localStorage.setItem('rank_rent_niches', JSON.stringify(dbData));
            renderTable();
        } else {
            failedDbData = failedDbData.filter(item => !selectedIds.has(item.id.toString()) && !selectedIds.has(item.id));
            selectedIds.clear();
            document.getElementById('selectAllCheckbox').checked = false;
            localStorage.setItem('rank_rent_failed_niches', JSON.stringify(failedDbData));
            renderFailedTable();
        }
        updateBulkActionsBar();
    } catch (error) {
        console.warn("Database bulk delete failed, removing locally:", error);
        if (activeTab === 'active') {
            dbData = dbData.filter(item => !selectedIds.has(item.id.toString()) && !selectedIds.has(item.id));
            selectedIds.clear();
            document.getElementById('selectAllCheckbox').checked = false;
            localStorage.setItem('rank_rent_niches', JSON.stringify(dbData));
            renderTable();
        } else {
            failedDbData = failedDbData.filter(item => !selectedIds.has(item.id.toString()) && !selectedIds.has(item.id));
            selectedIds.clear();
            document.getElementById('selectAllCheckbox').checked = false;
            localStorage.setItem('rank_rent_failed_niches', JSON.stringify(failedDbData));
            renderFailedTable();
        }
        updateBulkActionsBar();
    }
}

// Helper: Custom Delete Confirm Modal
function showDeleteConfirm(message, requiresWrittenConfirmation = false) {
    console.log("showDeleteConfirm called with:", message, "requiresWrittenConfirmation:", requiresWrittenConfirmation);
    return new Promise((resolve) => {
        const modal = document.getElementById('deleteModal');
        console.log("Modal found?", !!modal);
        if (!modal) {
            console.error("Modal not found in DOM!");
            resolve(confirm(message));
            return;
        }
        const msgEl = document.getElementById('deleteModalMessage');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        
        const inputContainer = document.getElementById('deleteModalConfirmInputContainer');
        const confirmInput = document.getElementById('deleteConfirmInput');
        
        msgEl.textContent = message;
        
        // Reset confirmation input logic
        if (requiresWrittenConfirmation && inputContainer && confirmInput) {
            inputContainer.style.display = 'block';
            confirmInput.value = '';
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
            
            const handleInput = () => {
                const isMatch = confirmInput.value.trim().toUpperCase() === 'DELETE';
                confirmBtn.disabled = !isMatch;
                if (isMatch) {
                    confirmBtn.style.opacity = '1';
                    confirmBtn.style.cursor = 'pointer';
                } else {
                    confirmBtn.style.opacity = '0.5';
                    confirmBtn.style.cursor = 'not-allowed';
                }
            };
            
            confirmInput.addEventListener('input', handleInput);
            confirmInput._handleInput = handleInput; // store reference for cleanup
            
            // Focus on input
            setTimeout(() => confirmInput.focus(), 100);
        } else {
            if (inputContainer) inputContainer.style.display = 'none';
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
        }
        
        // Toggle the active class first
        modal.classList.add('active');
        
        // Apply EVERY required CSS rule directly to bypass styles.css caching completely
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
            if (confirmInput && confirmInput._handleInput) {
                confirmInput.removeEventListener('input', confirmInput._handleInput);
                delete confirmInput._handleInput;
            }
            if (inputContainer) inputContainer.style.display = 'none';
            
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
            
            modal.classList.remove('active');
            modal.style.setProperty('display', 'none', 'important');
            modal.style.removeProperty('opacity');
            modal.style.removeProperty('pointer-events');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
        };
        
        const onConfirm = () => { console.log("CONFIRM CLICKED"); cleanup(); resolve(true); };
        const onCancel = () => { console.log("CANCEL CLICKED"); cleanup(); resolve(false); };
        
        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });
}


function exportAdminCSV() {
    if (activeTab === 'active') {
        if (dbData.length === 0) {
            alert("No records to export.");
            return;
        }

        const headers = [
            "Status", "Niche", "City", "State", "Population", "Zip Codes", "Keyword", 
            "KD", "Volume", "DA < 10 Count", "GMB Reviews", "Total GMBs", 
            "Competitor Traffic", "Directory Count", "R&R Site Count", "Date Added"
        ];

        const rows = dbData.map(item => [
            item.status,
            `"${item.niche}"`,
            `"${item.city}"`,
            item.state || "",
            item.population || "",
            item.zip_codes || 0,
            `"${item.keyword}"`,
            item.kd,
            item.volume,
            item.da_count,
            `"${item.gmb_reviews ? item.gmb_reviews.join(', ') : ''}"`,
            item.gmb_count,
            item.competitor_traffic,
            item.directory_count !== undefined ? item.directory_count : (item.has_directory ? 1 : 0),
            item.rr_site_count !== undefined ? item.rr_site_count : (item.has_rr_site ? 1 : 0),
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
        link.setAttribute("download", `evaluated_niches_export_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        if (failedDbData.length === 0) {
            alert("No records to export.");
            return;
        }

        const headers = [
            "Niche", "City", "Keyword", "State", "Volume", "Failed Stage", "Fail Reason", "Added By", "Date Added"
        ];

        const rows = failedDbData.map(item => [
            `"${item.niche}"`,
            `"${item.city || ''}"`,
            `"${item.keyword}"`,
            item.state || "",
            item.volume || 0,
            item.failed_stage ? `Stage ${item.failed_stage}` : 'Unknown',
            `"${item.fail_reason || ''}"`,
            `"${item.created_by || 'Unknown'}"`,
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
        link.setAttribute("download", `failed_niches_export_${Date.now()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Modal inputs initialization
function initModalSelectors() {
    openAddModalBtn = document.getElementById('openAddModalBtn');
    closeAddModalBtn = document.getElementById('closeAddModalBtn');
    cancelAddBtn = document.getElementById('cancelAddBtn');
    addModal = document.getElementById('addModal');
    saveNicheBtn = document.getElementById('saveNicheBtn');
    nicheForm = document.getElementById('nicheForm');

    nicheInput = document.getElementById('nicheInput');
    cityInput = document.getElementById('cityInput');
    stateInput = document.getElementById('stateInput');
    populationInput = document.getElementById('populationInput');
    zipsInput = document.getElementById('zipsInput');
    keywordInput = document.getElementById('keywordInput');
    kdInput = document.getElementById('kdInput');
    volumeInput = document.getElementById('volumeInput');
    daCountInput = document.getElementById('daCountInput');
    gmbReview1 = document.getElementById('gmbReview1');
    gmbReview2 = document.getElementById('gmbReview2');
    gmbReview3 = document.getElementById('gmbReview3');
    gmbCountInput = document.getElementById('gmbCountInput');
    competitorTrafficInput = document.getElementById('competitorTrafficInput');
    directoryCountInput = document.getElementById('directoryCountInput');
    rrSiteCountInput = document.getElementById('rrSiteCountInput');
    liveStatusIndicator = document.getElementById('liveStatusIndicator');
}

// Automatic target keyword generator helper
function updateKeywordDefault() {
    if (!nicheInput || !cityInput || !stateInput || !keywordInput) return;
    const nicheVal = nicheInput.value.trim().toLowerCase();
    const cityVal = cityInput.value.trim();
    const stateVal = stateInput.value.trim().toUpperCase();
    if (nicheVal && cityVal) {
        keywordInput.value = stateVal ? `${nicheVal} ${cityVal} ${stateVal}` : `${nicheVal} ${cityVal}`;
    }
}

// Evaluates the Rank & Rent Niche Criteria
function evaluateNicheCriteria(data) {
    if (!data) data = {};
    
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

// Live Validation UI Renderer
function runLiveEvaluation() {
    if (!nicheInput) return;
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
        !competitorTrafficInput.value &&
        !directoryCountInput.value &&
        !rrSiteCountInput.value;

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

    const isFilled = (el) => el && el.value !== "";

    const filledStates = {
        zips: isFilled(zipsInput),
        kd: isFilled(kdInput),
        volume: isFilled(volumeInput),
        daCount: isFilled(daCountInput),
        gmbReviews: isFilled(gmbReview1) && isFilled(gmbReview2) && isFilled(gmbReview3),
        gmbCount: isFilled(gmbCountInput),
        directory: isFilled(directoryCountInput),
        traffic: isFilled(competitorTrafficInput),
        rrSite: isFilled(rrSiteCountInput)
    };

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
        directory_count: parseInt(directoryCountInput.value) || 0,
        rr_site_count: parseInt(rrSiteCountInput.value) || 0
    };

    const evalResult = evaluateNicheCriteria(data);

    // Update Checklist items
    updateChecklistItem('evalZips', 'evalZipsVal', evalResult.rules.zips, filledStates.zips);
    updateChecklistItem('evalKd', 'evalKdVal', evalResult.rules.kd, filledStates.kd);
    updateChecklistItem('evalVolume', 'evalVolumeVal', evalResult.rules.volume, filledStates.volume);
    updateChecklistItem('evalDa', 'evalDaVal', evalResult.rules.daCount, filledStates.daCount);
    updateChecklistItem('evalGmbReviews', 'evalGmbReviewsVal', evalResult.rules.gmbReviews, filledStates.gmbReviews);
    updateChecklistItem('evalGmbCount', 'evalGmbCountVal', evalResult.rules.gmbCount, filledStates.gmbCount);
    updateChecklistItem('evalDirectory', 'evalDirectoryVal', evalResult.rules.directory, filledStates.directory);
    updateChecklistItem('evalTraffic', 'evalTrafficVal', evalResult.rules.traffic, filledStates.traffic);
    updateChecklistItem('evalRrSite', 'evalRrSiteVal', evalResult.rules.rrSite, filledStates.rrSite);

    // Update Overall Live Badge
    let hasFail = false;
    let allPassed = true;

    const ruleCheckers = [
        { filled: filledStates.zips, pass: evalResult.rules.zips.pass },
        { filled: filledStates.kd, pass: evalResult.rules.kd.pass },
        { filled: filledStates.volume, pass: evalResult.rules.volume.pass },
        { filled: filledStates.daCount, pass: evalResult.rules.daCount.pass },
        { filled: filledStates.gmbReviews, pass: evalResult.rules.gmbReviews.pass },
        { filled: filledStates.gmbCount, pass: evalResult.rules.gmbCount.pass },
        { filled: filledStates.directory, pass: evalResult.rules.directory.pass },
        { filled: filledStates.traffic, pass: evalResult.rules.traffic.pass },
        { filled: filledStates.rrSite, pass: evalResult.rules.rrSite.pass }
    ];

    ruleCheckers.forEach(checker => {
        if (checker.filled) {
            if (!checker.pass) {
                hasFail = true;
            }
        } else {
            allPassed = false;
        }
    });

    if (hasFail) {
        liveStatusIndicator.className = 'live-status-indicator fail';
        liveStatusIndicator.textContent = 'FAIL';
    } else if (allPassed) {
        liveStatusIndicator.className = 'live-status-indicator pass';
        liveStatusIndicator.textContent = 'PASS';
    } else {
        liveStatusIndicator.className = 'live-status-indicator pending';
        liveStatusIndicator.textContent = 'PENDING';
    }
}

function updateChecklistItem(itemId, valId, rule, isFilled) {
    const container = document.getElementById(itemId);
    const valTextEl = document.getElementById(valId);
    const icon = container.querySelector('.eval-icon');

    if (!isFilled) {
        container.className = 'live-eval-item';
        valTextEl.textContent = '-';
        valTextEl.className = 'eval-status-val text-muted';
        valTextEl.style.color = 'var(--text-muted)';
        icon.className = 'fa-solid fa-circle-question eval-icon pending';
        return;
    }

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
    const directory_count = parseInt(directoryCountInput.value) || 0;
    const rr_site_count = parseInt(rrSiteCountInput.value) || 0;

    // Duplicate Check against local dbData
    const isDuplicate = dbData.some(n => n.keyword.toLowerCase() === keyword.toLowerCase());
    if (isDuplicate) {
        showToast(`A niche with the keyword "${keyword}" already exists!`, "error");
        return;
    }

    const evaluation = evaluateNicheCriteria({
        kd, volume, da_count, gmb_reviews, gmb_count, competitor_traffic, directory_count, rr_site_count, zips
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
        directory_count,
        rr_site_count,
        status: evaluation.status,
        fail_reasons: evaluation.failReasons
    };

    saveNicheBtn.disabled = true;
    saveNicheBtn.textContent = 'Saving...';

    try {
        const { error } = await adminClient
            .from('niches')
            .insert([newNiche]);

        if (error) throw error;
        showToast("Niche saved and evaluated successfully!");

        // Close Modal & Reset Form
        addModal.classList.remove('open');
        nicheForm.reset();
        updateKeywordDefault();

        // Refresh admin grid data
        await fetchAdminData();
    } catch (err) {
        console.error("Failed to insert record:", err);
        showToast("Failed to save evaluation to remote database.", "error");
    } finally {
        saveNicheBtn.disabled = false;
        saveNicheBtn.textContent = 'Save & Evaluate';
    }
}

// Simple Custom Toast Notification
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

// ─── Notes Column Rendering ───
function renderNotesPills(item) {
    const notes = item.notes;
    if (!notes || typeof notes !== 'object' || Object.keys(notes).length === 0) {
        return `<div class="notes-pills" data-id="${item.id}">
            <span class="notes-empty">—</span>
            <button class="notes-edit-btn" data-id="${item.id}"><i class="fa-solid fa-plus"></i> Add</button>
        </div>`;
    }

    let pills = '';
    if (notes.stage_2) {
        pills += `<div class="note-pill s2"><span class="note-stage-tag">S2:</span><span class="note-pill-text">${escapeHtml(notes.stage_2)}</span></div>`;
    }
    if (notes.stage_3) {
        let s3Text = '';
        if (typeof notes.stage_3 === 'object' && notes.stage_3 !== null) {
            const revs = notes.stage_3.gmb_reviews || '—';
            const count = notes.stage_3.gmb_count !== undefined && notes.stage_3.gmb_count !== null && notes.stage_3.gmb_count !== '' ? notes.stage_3.gmb_count : '—';
            s3Text = `Reviews: ${revs} · GMBs: ${count}`;
        } else {
            s3Text = notes.stage_3;
        }
        pills += `<div class="note-pill s3"><span class="note-stage-tag">S3:</span><span class="note-pill-text">${escapeHtml(s3Text)}</span></div>`;
    }
    if (notes.stage_4) {
        let s4Text = '';
        if (typeof notes.stage_4 === 'object' && notes.stage_4 !== null) {
            const lowDa = notes.stage_4.low_da || '—';
            const traffic = notes.stage_4.traffic || '—';
            s4Text = `Low DA: ${lowDa} · Traffic: ${traffic}`;
        } else {
            s4Text = notes.stage_4;
        }
        pills += `<div class="note-pill s4"><span class="note-stage-tag">S4:</span><span class="note-pill-text">${escapeHtml(s4Text)}</span></div>`;
    }
    if (notes.stage_5) {
        let s5Text = '';
        if (typeof notes.stage_5 === 'object' && notes.stage_5 !== null) {
            const dirs = notes.stage_5.directories || '—';
            const rr = notes.stage_5.rr_sites || '—';
            s5Text = `Dirs: ${dirs} · R&R: ${rr}`;
        } else {
            s5Text = notes.stage_5;
        }
        pills += `<div class="note-pill s5"><span class="note-stage-tag">S5:</span><span class="note-pill-text">${escapeHtml(s5Text)}</span></div>`;
    }

    return `<div class="notes-pills" data-id="${item.id}">
        ${pills}
        <button class="notes-edit-btn" data-id="${item.id}"><i class="fa-solid fa-pen"></i> Edit</button>
    </div>`;
}

// ─── Notes Modal Logic ───
let notesEditingId = null;

function setupNotesModal() {
    const overlay = document.getElementById('notesModalOverlay');
    const closeBtn = document.getElementById('notesModalClose');
    const cancelBtn = document.getElementById('notesModalCancel');
    const saveBtn = document.getElementById('notesModalSave');

    if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => overlay.classList.remove('open'));
    if (overlay) overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
    });

    if (saveBtn) saveBtn.addEventListener('click', saveNotesFromModal);

    // Setup Enter key navigation for all inputs/textareas inside the modal
    const modal = document.querySelector('.notes-modal');
    if (modal) {
        const modalInputs = Array.from(modal.querySelectorAll('input, textarea'));
        modalInputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (input.tagName === 'TEXTAREA' && e.shiftKey) {
                        return; // allow default newline behavior
                    }
                    e.preventDefault();
                    const nextInput = modalInputs[index + 1];
                    if (nextInput) {
                        nextInput.focus();
                        if (typeof nextInput.select === 'function') nextInput.select();
                    } else {
                        const modalSaveBtn = document.getElementById('notesModalSave');
                        if (modalSaveBtn) modalSaveBtn.click();
                    }
                }
            });
        });
    }
}

function openNotesEditor(id) {
    const item = dbData.find(d => d.id == id);
    if (!item) return;

    notesEditingId = id;
    const notes = item.notes || {};

    document.getElementById('notesModalKeyword').innerHTML = `Keyword: <code>${escapeHtml(item.keyword)}</code> · ${escapeHtml(item.niche)} · ${escapeHtml(item.city || '')}`;
    document.getElementById('notesModalS2').value = item.kd !== undefined ? item.kd : '';

    let reviewsVal = '';
    let countVal = '';
    if (notes.stage_3) {
        if (typeof notes.stage_3 === 'object' && notes.stage_3 !== null) {
            reviewsVal = notes.stage_3.gmb_reviews || '';
            countVal = notes.stage_3.gmb_count !== undefined && notes.stage_3.gmb_count !== null ? notes.stage_3.gmb_count : '';
        } else {
            reviewsVal = notes.stage_3;
        }
    }
    document.getElementById('notesModalS3Reviews').value = reviewsVal;
    document.getElementById('notesModalS3Count').value = countVal;

    let lowDaVal = '';
    let trafficVal = '';
    if (notes.stage_4) {
        if (typeof notes.stage_4 === 'object' && notes.stage_4 !== null) {
            lowDaVal = notes.stage_4.low_da || '';
            trafficVal = notes.stage_4.traffic || '';
        } else {
            lowDaVal = notes.stage_4;
        }
    }
    document.getElementById('notesModalS4LowDa').value = lowDaVal;
    document.getElementById('notesModalS4Traffic').value = trafficVal;

    let dirsVal = '';
    let rrVal = '';
    if (notes.stage_5) {
        if (typeof notes.stage_5 === 'object' && notes.stage_5 !== null) {
            dirsVal = notes.stage_5.directories || '';
            rrVal = notes.stage_5.rr_sites || '';
        } else {
            dirsVal = notes.stage_5;
        }
    }
    document.getElementById('notesModalS5Directories').value = dirsVal;
    document.getElementById('notesModalS5RRSites').value = rrVal;

    document.getElementById('notesModalOverlay').classList.add('open');
}

async function saveNotesFromModal() {
    if (!notesEditingId) return;

    const s2 = document.getElementById('notesModalS2').value.trim();
    const reviewsVal = document.getElementById('notesModalS3Reviews').value.trim();
    const countVal = document.getElementById('notesModalS3Count').value.trim();
    const lowDaVal = document.getElementById('notesModalS4LowDa').value.trim();
    const trafficVal = document.getElementById('notesModalS4Traffic').value.trim();
    const dirsVal = document.getElementById('notesModalS5Directories').value.trim();
    const rrVal = document.getElementById('notesModalS5RRSites').value.trim();

    // Validate KD number
    const kdNum = parseInt(s2, 10);
    if (s2 && (isNaN(kdNum) || kdNum < 0 || kdNum > 100)) {
        showToast('KD must be a valid number between 0 and 100.', 'error');
        return;
    }

    // Validate GMB Count
    const gmbCountNum = parseInt(countVal, 10);
    if (countVal && (isNaN(gmbCountNum) || gmbCountNum < 0)) {
        showToast('GMB Count must be a valid positive number.', 'error');
        return;
    }

    const notesObj = {};
    
    let s3Notes = null;
    if (reviewsVal || countVal) {
        s3Notes = {
            gmb_reviews: reviewsVal,
            gmb_count: countVal ? gmbCountNum : ''
        };
    }
    if (s3Notes) notesObj.stage_3 = s3Notes;

    let s4Notes = null;
    if (lowDaVal || trafficVal) {
        s4Notes = {
            low_da: lowDaVal,
            traffic: trafficVal
        };
    }
    if (s4Notes) notesObj.stage_4 = s4Notes;

    let s5Notes = null;
    if (dirsVal || rrVal) {
        s5Notes = {
            directories: dirsVal,
            rr_sites: rrVal
        };
    }
    if (s5Notes) notesObj.stage_5 = s5Notes;

    const notesValue = Object.keys(notesObj).length > 0 ? notesObj : null;
    const kdValue = s2 ? kdNum : 0;

    // Save to Supabase
    try {
        const { error } = await adminClient
            .from('niches')
            .update({ notes: notesValue, kd: kdValue })
            .eq('id', notesEditingId);

        if (error) throw error;

        // Update local data
        const item = dbData.find(d => d.id == notesEditingId);
        if (item) {
            item.notes = notesValue;
            item.kd = kdValue;
        }

        renderTable();
        document.getElementById('notesModalOverlay').classList.remove('open');
        showToast('Notes saved successfully!');
    } catch (e) {
        console.error('Failed to save notes:', e);
        // Fallback: update local array and local storage cache
        const item = dbData.find(d => d.id == notesEditingId);
        if (item) {
            item.notes = notesValue;
            item.kd = kdValue;
            const local = localStorage.getItem('rank_rent_niches');
            if (local) {
                try {
                    const parsed = JSON.parse(local);
                    const idx = parsed.findIndex(p => p.id == notesEditingId);
                    if (idx !== -1) {
                        parsed[idx].notes = notesValue;
                        parsed[idx].kd = kdValue;
                        localStorage.setItem('rank_rent_niches', JSON.stringify(parsed));
                    }
                } catch(err) {
                    console.error("Local sync error:", err);
                }
            }
        }
        renderTable();
        document.getElementById('notesModalOverlay').classList.remove('open');
        showToast('Saved notes locally (offline fallback).');
    }
}

// Initialize notes modal when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    setupNotesModal();
});

// ─── Failed Niches Admin Logic ───

async function fetchFailedNiches() {
    // Show spinner in tableBody
    const tbody = document.getElementById('tableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="loading-state" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <p style="margin-top: 1rem;">Loading failed niches...</p>
                </td>
            </tr>
        `;
    }

    let remoteFailed = [];
    let remotePipelineFailed = [];

    try {
        if (adminClient) {
            // 1. Fetch from failed_niches
            try {
                const { data, error } = await adminClient
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
                const { data, error } = await adminClient
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

        // Self-healing database correction block for mismatched niche (Sioux Falls)
        const badRow = merged.find(d => 
            d.keyword && d.keyword.toLowerCase() === 'appliance repair sioux falls' && 
            d.niche === 'appliance repair sioux'
        );
        if (badRow && adminClient) {
            console.log("Fixing incorrect failed niche in database...", badRow.id);
            try {
                await adminClient
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
        const badLexingtonRow = merged.find(d =>
            d.keyword && d.keyword.toLowerCase() === 'refrigerator repair lexington' &&
            d.niche === 'appliance'
        );
        if (badLexingtonRow && adminClient) {
            console.log("Fixing incorrect lexington failed niche in database...", badLexingtonRow.id);
            try {
                await adminClient
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
        const applianceRows = merged.filter(d => d.niche && d.niche.toLowerCase() === 'appliance');
        if (applianceRows.length > 0 && adminClient) {
            console.log(`Self-healing ${applianceRows.length} appliance niches in failed_niches table...`);
            for (const row of applianceRows) {
                let newCity = row.city || '';
                if (newCity.toLowerCase().startsWith('repair ')) {
                    newCity = newCity.substring(7).trim();
                } else if (newCity.toLowerCase().startsWith('repair')) {
                    newCity = newCity.replace(/^repair\s+/i, '').trim();
                }
                try {
                    await adminClient
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
        if (adminClient) {
            try {
                const { data: pkRows, error: pkError } = await adminClient
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
                        await adminClient
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
        if (adminClient) {
            try {
                await adminClient
                    .from('pipeline_keywords')
                    .update({ niche: 'appliance repair', city: 'Sioux Falls' })
                    .eq('keyword', 'appliance repair sioux falls')
                    .eq('niche', 'appliance repair sioux');
            } catch(e) {}
            try {
                await adminClient
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

        if (merged.length === 0) {
            if (!localStorage.getItem('rank_rent_failed_initialized')) {
                merged.push(
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
                );
            }
        } else {
            localStorage.setItem('rank_rent_failed_initialized', 'true');
        }

        merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        failedDbData = merged;
        renderFailedTable();
    } catch (error) {
        console.warn("Error fetching failed niches, falling back to LocalStorage:", error);
        const local = localStorage.getItem('rank_rent_failed_niches');
        failedDbData = local ? JSON.parse(local) : [
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
        renderFailedTable();
    }
}

function renderFailedTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const totalItems = failedDbData.length;
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
    const paginatedItems = failedDbData.slice(startIdx, endIdx);

    if (failedDbData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No failed niches found in the database.
                </td>
            </tr>
        `;
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    paginatedItems.forEach(item => {
        const tr = document.createElement('tr');
        const dateStr = new Date(item.created_at).toLocaleDateString();

        // Failed stage badge color
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

        tr.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" class="row-checkbox" value="${item.id}">
            </td>
            <td style="font-weight: 600;">${escapeHtml(item.niche)}</td>
            <td>${escapeHtml(item.city || '')}</td>
            <td><code style="background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.8rem;">${escapeHtml(item.keyword)}</code></td>
            <td><span class="status-badge" style="background: var(--glass-bg); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 0.75rem;">${item.state ? item.state.toUpperCase() : '—'}</span></td>
            <td style="color: var(--secondary); font-weight: 600;">${item.volume || 0}</td>
            <td><span style="background: ${stageBadgeBg}; color: #000; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; cursor: help;" title="${escapeHtml(item.fail_reason || 'No reason specified')}">${stageLabel}</span></td>
            <td style="color: var(--text-muted); font-size: 0.85rem;">${dateStr}</td>
            <td>
                <button class="action-btn delete-btn" data-id="${item.id}" title="Delete Record">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Bind individual checkboxes for bulk delete selection
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.checked = selectedIds.has(cb.value.toString()) || selectedIds.has(cb.value);
        cb.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedIds.add(cb.value);
            } else {
                selectedIds.delete(cb.value);
                document.getElementById('selectAllCheckbox').checked = false;
            }
            updateBulkActionsBar();
        });
    });

    // Bind individual delete button
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const id = button.getAttribute('data-id');
            handleSingleDelete(id);
        });
    });

    renderAdminPagination(totalPages, failedDbData);
}

function renderAdminPagination(totalPages, fullData) {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;

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
            </div>
        </div>
    `;

    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            if (activeTab === 'active') renderTable();
            else renderFailedTable();
        }
    });

    document.getElementById('nextPageBtn').addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            if (activeTab === 'active') renderTable();
            else renderFailedTable();
        }
    });

    document.getElementById('copyKeywordsBtn').addEventListener('click', () => {
        const keywordsText = fullData.map(item => item.keyword).join('\n');
        navigator.clipboard.writeText(keywordsText).then(() => {
            showToast('Copied all filtered keywords to clipboard!');
        }).catch(err => {
            console.error('Failed to copy keywords:', err);
            alert('Failed to copy keywords.');
        });
    });

    document.getElementById('exportCsvBtnBottom').addEventListener('click', () => {
        exportAdminCSV();
    });
}

function renderTableHeader() {
    const thead = document.querySelector('#dataTable thead');
    if (!thead) return;

    if (activeTab === 'active') {
        thead.innerHTML = `
            <tr>
                <th class="checkbox-cell">
                    <input type="checkbox" id="selectAllCheckbox">
                </th>
                <th>Niche</th>
                <th>City</th>
                <th>Keyword</th>
                <th>KD</th>
                <th>Volume</th>
                <th>Notes</th>
                <th>Created At</th>
                <th>Actions</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
                <th class="checkbox-cell">
                    <input type="checkbox" id="selectAllCheckbox">
                </th>
                <th>Niche</th>
                <th>City</th>
                <th>Keyword</th>
                <th>State</th>
                <th>Volume</th>
                <th>Failed Stage</th>
                <th>Created At</th>
                <th>Actions</th>
            </tr>
        `;
    }

    // Re-bind the selectAllCheckbox event listener
    const selectAllCb = document.getElementById('selectAllCheckbox');
    if (selectAllCb) {
        selectAllCb.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.row-checkbox');
            if (e.target.checked) {
                checkboxes.forEach(cb => {
                    cb.checked = true;
                    selectedIds.add(cb.value);
                });
            } else {
                checkboxes.forEach(cb => {
                    cb.checked = false;
                    selectedIds.delete(cb.value);
                });
            }
            updateBulkActionsBar();
        });
    }
}
