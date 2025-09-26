(function () {
    if (!window.api || !window.utils) {
        console.warn('History module requires api and utils.');
        return;
    }

    const config = window.historyPageConfig || {};
    const pageSize = config.pageSize || 12;
    const defaultDateFilter = config.defaultDateFilter || 'month';

    const state = {
        page: 1,
        action: 'all',
        dateFilter: defaultDateFilter,
        search: ''
    };

    const container = document.getElementById('historyContainer');
    const paginationContainer = document.getElementById('pagination');
    const dateFilterSelect = document.getElementById('dateFilter');
    const searchInput = document.querySelector('[data-history-search]');
    const loader = document.querySelector('[data-history-loader]');
    const summaryContainer = document.querySelector('[data-history-summary]');

    const filterButtons = document.querySelectorAll('[data-history-filter]');

    const ACTION_ICONS = {
        contract_upload: 'fa-solid fa-cloud-arrow-up',
        contract_review: 'fa-solid fa-magnifying-glass',
        contract_approval: 'fa-solid fa-circle-check',
        contract_rejection: 'fa-solid fa-circle-xmark',
        system: 'fa-solid fa-gear'
    };

    const ACTION_BADGES = {
        contract_upload: 'upload',
        contract_review: 'review',
        contract_approval: 'approval',
        contract_rejection: 'rejection',
        system: 'system'
    };

    function setLoading(isLoading) {
        if (!loader) return;
        loader.style.display = isLoading ? 'flex' : 'none';
    }

    function resetHistoryContent() {
        if (container) {
            container.innerHTML = '';
        }
    }

    function formatDateHeader(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Hari Ini';
        }
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Kemarin';
        }

        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function getRiskLabel(score) {
        if (score === null || score === undefined) return '';
        if (score >= 80) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    }

    function renderHistory(logs) {
        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    <p>Tidak ada aktivitas pada rentang waktu ini.</p>
                </div>
            `;
            return;
        }

        const groups = logs.reduce((acc, log) => {
            const key = new Date(log.createdAt).toDateString();
            if (!acc[key]) acc[key] = [];
            acc[key].push(log);
            return acc;
        }, {});

        const html = Object.entries(groups)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .map(([date, items]) => {
                const dayLogs = items
                    .map((log) => {
                        const iconClass = ACTION_ICONS[log.action] || ACTION_ICONS.system;
                        const badgeTone = ACTION_BADGES[log.action] || 'system';
                        const riskLabel = getRiskLabel(log.riskScore);
                        const statusText = window.utils.getStatusText(log.status);
                        const noteSection = log.note
                            ? `<div class="history-note"><span>Catatan:</span> ${log.note}</div>`
                            : '';
                        const riskSection = riskLabel
                            ? `<span class="risk-badge risk-${riskLabel}">Risiko ${log.riskScore}</span>`
                            : '';

                        return `
                            <div class="history-item tone-${badgeTone}">
                                <div class="history-timestamp">
                                    <span class="time">${window.utils.formatTime(log.createdAt)}</span>
                                    <span class="date">${window.utils.formatDate(log.createdAt)}</span>
                                </div>
                                <div class="history-marker">
                                    <span class="marker-icon ${badgeTone}">
                                        <i class="${iconClass}"></i>
                                    </span>
                                </div>
                                <div class="history-content">
                                    <div class="history-header">
                                        <h3>${log.title}</h3>
                                        <div class="badges">
                                            <span class="status-badge status-${log.status}">${statusText}</span>
                                            ${riskSection}
                                        </div>
                                    </div>
                                    <div class="history-meta">
                                        <span><i class="fa-solid fa-user"></i>${log.performedBy}</span>
                                        <span><i class="fa-solid fa-file-lines"></i>${log.contractTitle}</span>
                                    </div>
                                    <p class="history-description">${log.description}</p>
                                    ${noteSection}
                                </div>
                            </div>
                        `;
                    })
                    .join('');

                return `
                    <section class="history-day">
                        <header class="day-header">
                            <span class="day-label">${formatDateHeader(date)}</span>
                            <span class="day-count">${items.length} aktivitas</span>
                        </header>
                        <div class="day-logs">${dayLogs}</div>
                    </section>
                `;
            })
            .join('');

        container.innerHTML = html;
    }

    function updatePagination(pagination) {
        if (!paginationContainer) return;
        if (!pagination || pagination.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        window.ui.createPagination(paginationContainer, pagination.currentPage, pagination.totalPages, (page) => {
            state.page = page;
            loadHistory();
        });
    }

    function updateSummary(stats) {
        if (!summaryContainer || !stats) return;

        summaryContainer.querySelectorAll('[data-summary]').forEach((node) => {
            const key = node.dataset.summary;
            if (!key) return;

            let value = 0;
            if (key === 'total') value = stats.total;
            else if (key === 'approved') value = stats.approved;
            else if (key === 'rejected') value = stats.rejected;
            else if (key === 'highRisk') value = stats.highRisk;
            else if (key === 'mediumRisk') value = stats.mediumRisk;
            else if (key === 'lowRisk') value = stats.lowRisk;
            else if (stats.byAction?.[key] !== undefined) value = stats.byAction[key];

            const valueNode = node.querySelector('.summary-value');
            if (valueNode) {
                valueNode.textContent = value;
            }
        });
    }

    async function loadHistory() {
        if (!container) return;

        try {
            setLoading(true);
            resetHistoryContent();

            const params = {
                page: state.page,
                limit: pageSize,
                dateFilter: state.dateFilter
            };

            if (state.action !== 'all') params.action = state.action;
            if (state.search) params.search = state.search;

            const response = await window.api.getAuditLogs(params);
            renderHistory(response.logs || []);
            updatePagination(response.pagination);
            updateSummary(response.stats);
        } catch (error) {
            console.error('Failed to load history', error);
            container.innerHTML = `
                <div class="error-state">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Gagal memuat riwayat aktivitas.</p>
                    <button class="btn-retry" type="button">Muat Ulang</button>
                </div>
            `;

            container.querySelector('.btn-retry')?.addEventListener('click', () => loadHistory());
        } finally {
            setLoading(false);
        }
    }

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            filterButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
            state.action = button.dataset.historyFilter || 'all';
            state.page = 1;
            loadHistory();
        });
    });

    if (dateFilterSelect) {
        dateFilterSelect.value = state.dateFilter;
        dateFilterSelect.addEventListener('change', (event) => {
            state.dateFilter = event.target.value;
            state.page = 1;
            loadHistory();
        });
    }

    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', (event) => {
            const value = event.target.value;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                state.search = value;
                state.page = 1;
                loadHistory();
            }, 300);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadHistory();
    });
})();

