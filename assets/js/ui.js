// UI Management utilities
window.ui = {
    // Error and success message display
    displayError: (message) => {
        console.error('Error:', message);

        // Remove existing alerts
        const existingAlert = document.querySelector('.alert-error');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create error alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-error';
        alert.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="margin-left: 10px; background: none; border: none; color: white; cursor: pointer;">&times;</button>
        `;

        document.body.insertBefore(alert, document.body.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    },

    displaySuccess: (message) => {
        console.log('Success:', message);

        // Remove existing alerts
        const existingAlert = document.querySelector('.alert-success');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create success alert
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="margin-left: 10px; background: none; border: none; color: white; cursor: pointer;">&times;</button>
        `;

        document.body.insertBefore(alert, document.body.firstChild);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 3000);
    },

    // Loading state management
    showLoading: (element) => {
        if (element) {
            element.disabled = true;
            element.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
        }
    },

    hideLoading: (element, originalText) => {
        if (element) {
            element.disabled = false;
            element.innerHTML = originalText;
        }
    },

    // Modal management
    openModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    },

    closeModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    },

    // Sidebar management
    toggleSidebar: () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    },

    setActiveMenuItem: (path) => {
        // Remove active class from all menu items
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.classList.remove('active');
            link.querySelector('i')?.classList.remove('active');
        });

        // Set active based on current path
        const currentPage = window.location.pathname.split('/').pop();
        const menuMap = {
            'dashboard.html': 0,
            'dokumen_all.html': 1,
            'dokumen_menunggu.html': 1,
            'dokumen_berlangsung.html': 1,
            'dokumen_selesai.html': 1,
            'dokumen_sedang.html': 1,
            'notifikasi_hukum.html': 2,
            'notifikasi_internal.html': 2,
            'notifikasi_manajemen.html': 2,
            'riwayat_hukum.html': 3,
            'riwayat_internal.html': 3,
            'riwayat_manajemen.html': 3,
            'profil.html': 4,
            'profil_hukum.html': 4,
            'profil_internal.html': 4,
            'profil_manajemen.html': 4
        };

        const menuIndex = menuMap[currentPage];
        if (menuIndex !== undefined) {
            const menuItems = document.querySelectorAll('.sidebar-menu a');
            if (menuItems[menuIndex]) {
                menuItems[menuIndex].classList.add('active');
                menuItems[menuIndex].querySelector('i')?.classList.add('active');
            }
        }
    },

    // User profile display
    updateUserProfile: () => {
        const userInfo = window.auth.getUserInfo();
        if (userInfo) {
            // Update profile name in sidebar
            const profileName = document.querySelector('.profile-name');
            if (profileName) {
                profileName.textContent = userInfo.name || userInfo.email.split('@')[0];
            }

            // Update profile role/title
            const profileTitle = document.querySelector('.profile-title');
            if (profileTitle) {
                const roleMap = {
                    'internal': 'Tim Internal',
                    'legal': 'Tim Hukum',
                    'management': 'Tim Manajemen'
                };
                profileTitle.textContent = roleMap[userInfo.role] || 'Tim Internal';
            }
        }
    },

    // Form validation
    validateForm: (formElement) => {
        const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    },

    // Table utilities
    updateTable: (tableSelector, data, columns) => {
        const table = document.querySelector(tableSelector);
        if (!table) return;

        const tbody = table.querySelector('tbody') || table;
        tbody.innerHTML = '';

        data.forEach(row => {
            const tr = document.createElement('tr');
            columns.forEach(col => {
                const td = document.createElement('td');
                if (typeof col === 'function') {
                    td.innerHTML = col(row);
                } else {
                    td.textContent = row[col] || '';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    },

    // Pagination
    createPagination: (container, currentPage, totalPages, onPageChange) => {
        const pagination = document.createElement('div');
        pagination.className = 'pagination';

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => onPageChange(currentPage - 1);
        pagination.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = i === currentPage ? 'active' : '';
            pageBtn.onclick = () => onPageChange(i);
            pagination.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => onPageChange(currentPage + 1);
        pagination.appendChild(nextBtn);

        container.innerHTML = '';
        container.appendChild(pagination);
    },

    // Search functionality
    setupSearch: (inputSelector, onSearch) => {
        const searchInput = document.querySelector(inputSelector);
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    onSearch(e.target.value);
                }, 300);
            });
        }
    },

    // File upload utilities
    setupFileUpload: (inputSelector, onFileSelect) => {
        const fileInput = document.querySelector(inputSelector);
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                onFileSelect(files);
            });
        }
    },

    // Notification utilities
    updateNotificationBadge: (count) => {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    }
};

// Initialize UI on page load
document.addEventListener('DOMContentLoaded', () => {
    // Add CSS for alerts if not present
    if (!document.querySelector('#ui-alerts-css')) {
        const style = document.createElement('style');
        style.id = 'ui-alerts-css';
        style.textContent = `
            .alert {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                max-width: 400px;
                animation: slideInRight 0.3s ease;
            }
            .alert-error {
                background-color: #dc3545;
            }
            .alert-success {
                background-color: #28a745;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .pagination {
                display: flex;
                justify-content: center;
                gap: 5px;
                margin: 20px 0;
            }
            .pagination button {
                padding: 8px 12px;
                border: 1px solid #ddd;
                background: white;
                cursor: pointer;
                border-radius: 4px;
            }
            .pagination button:hover:not(:disabled) {
                background: #f5f5f5;
            }
            .pagination button.active {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }
            .pagination button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            input.error, select.error, textarea.error {
                border-color: #dc3545 !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Set active menu item
    window.ui.setActiveMenuItem();

    // Update user profile
    window.ui.updateUserProfile();

    // Check authentication on protected pages
    const publicPages = ['login.html', 'index.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (!publicPages.includes(currentPage) && !window.auth.isAuthenticated()) {
        window.auth.redirectToLogin();
    }
});