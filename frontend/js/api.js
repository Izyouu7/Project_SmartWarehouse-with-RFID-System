// Shared API utility
const API_BASE = window.location.origin + '/api';

function getToken() { return localStorage.getItem('token'); }
function getUser() { return JSON.parse(localStorage.getItem('user') || 'null'); }

function requireAuth() {
    if (!getToken()) { window.location.href = '/index.html'; return false; }
    return true;
}

async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/index.html';
            return null;
        }
        return await res.json();
    } catch (err) {
        console.error('API Error:', err);
        showToast('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
        return null;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(30px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatNumber(n) { return (n ?? 0).toLocaleString('th-TH'); }
function formatCurrency(n) { return `฿${(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`; }

function getStatusBadge(status) {
    const map = {
        'In-Stock': '<span class="badge badge-in-stock">📦 In-Stock</span>',
        'Wait-Scan': '<span class="badge badge-moving">🚚 Wait-Scan</span>',
        'Shipped': '<span class="badge badge-shipped">✈️ Shipped</span>',
        'Unknown': '<span class="badge badge-unknown">❓ Unknown</span>',
    };
    return map[status] || `<span class="badge badge-unknown">${status || '—'}</span>`;
}

function getTxTypeBadge(type) {
    return type === 'IN'
        ? '<span class="badge badge-in">⬇️ รับเข้า</span>'
        : '<span class="badge badge-out">⬆️ เบิกออก</span>';
}

function setupUserInfo() {
    const user = getUser();
    if (!user) return;
    const el = document.getElementById('sidebarUserName');
    const el2 = document.getElementById('sidebarUserRole');
    const el3 = document.getElementById('sidebarUserAvatar');
    if (el) el.textContent = user.full_name || user.username;
    if (el2) el2.textContent = user.role === 'admin' ? '👑 Administrator' : '👷 Operator';
    if (el3) el3.textContent = (user.full_name || user.username).charAt(0).toUpperCase();
}

function setActiveNav(pageId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });
}
