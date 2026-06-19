// Admin Dashboard Logic

let dbData = [];
let selectedIds = new Set();
let adminClient = null;

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
    document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
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

    document.getElementById('bulkDeleteBtn').addEventListener('click', handleBulkDelete);
    document.getElementById('exportCsvBtn').addEventListener('click', exportAdminCSV);
}

async function fetchAdminData() {
    try {
        const { data, error } = await adminClient
            .from('niches')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        dbData = data || [];
        renderTable();
    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById('tableBody').innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: var(--danger); padding: 2rem;">
                    Failed to load data. Please ensure your Supabase connection is valid and RLS policies allow you to read.
                    <br><br><small>${error.message || ''}</small>
                </td>
            </tr>
        `;
    }
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (dbData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    No records found in the database.
                </td>
            </tr>
        `;
        return;
    }

    dbData.forEach(item => {
        const tr = document.createElement('tr');
        const passClass = item.status === 'PASS' ? 'pass' : 'fail';
        const dateStr = new Date(item.created_at).toLocaleDateString();

        tr.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" class="row-checkbox" value="${item.id}">
            </td>
            <td><span class="status-badge ${passClass}" style="padding: 0.15rem 0.5rem; font-size: 0.7rem;">${item.status}</span></td>
            <td style="font-weight: 600;">${escapeHtml(item.niche)}</td>
            <td>${escapeHtml(item.city)}${item.state ? ', ' + escapeHtml(item.state.toUpperCase()) : ''}</td>
            <td><code style="background: rgba(255,255,255,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.8rem;">${escapeHtml(item.keyword)}</code></td>
            <td style="color: var(--primary); font-weight: 600;">${item.kd}</td>
            <td style="color: var(--secondary); font-weight: 600;">${item.volume}</td>
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

    try {
        const { error } = await adminClient.from('niches').delete().eq('id', id);
        if (error) throw error;
        
        dbData = dbData.filter(item => item.id != id);
        selectedIds.delete(id);
        renderTable();
        updateBulkActionsBar();
    } catch (error) {
        alert("Failed to delete record: " + error.message);
    }
}

async function handleBulkDelete() {
    const confirmed = await showDeleteConfirm(`Are you sure you want to delete ${selectedIds.size} records forever? This action cannot be undone.`, true);
    if (!confirmed) return;

    const idsToDelete = Array.from(selectedIds);
    try {
        const { error } = await adminClient.from('niches').delete().in('id', idsToDelete);
        if (error) throw error;
        
        dbData = dbData.filter(item => !selectedIds.has(item.id.toString()) && !selectedIds.has(item.id));
        selectedIds.clear();
        document.getElementById('selectAllCheckbox').checked = false;
        
        renderTable();
        updateBulkActionsBar();
    } catch (error) {
        alert("Failed to bulk delete records: " + error.message);
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
    link.setAttribute("download", `admin_export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
