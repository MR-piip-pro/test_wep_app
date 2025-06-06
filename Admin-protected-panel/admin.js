// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
    getDoc,
    setDoc,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import firebaseConfig from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const toolsTableBody = document.getElementById('tools-table-body');
const categoriesGrid = document.getElementById('categories-grid');
const toolSearch = document.getElementById('tool-search');
const categoryFilter = document.getElementById('category-filter');
const addToolForm = document.getElementById('add-tool-form');
const addCategoryForm = document.getElementById('add-category-form');
const editToolForm = document.getElementById('edit-tool-form');
const editCategoryForm = document.getElementById('edit-category-form');
const addToolBtn = document.getElementById('add-tool-btn');
const addCategoryBtn = document.getElementById('add-category-btn');
const siteNameInput = document.getElementById('site-name');
const themeSelect = document.getElementById('theme');
const logoutBtn = document.getElementById('logout-btn');

// Stats Elements
const totalToolsElement = document.getElementById('total-tools');
const totalDownloadsElement = document.getElementById('total-downloads');
const totalUsersElement = document.getElementById('total-users');
const totalCategoriesElement = document.getElementById('total-categories');

// Initialize Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    // Show dashboard by default
    document.getElementById('dashboard').classList.add('active');
    navItems[0].classList.add('active');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.getAttribute('data-section');
            
            // Remove active class from all nav items and sections
            navItems.forEach(navItem => navItem.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked nav item and corresponding section
            item.classList.add('active');
            document.getElementById(targetSection).classList.add('active');
        });
    });
}

// File Upload Function
async function uploadFile(file, path) {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

// Authentication Check
async function checkAdminPermissions(user) {
    try {
        const adminRef = doc(db, 'admins', user.uid);
        const adminDoc = await getDoc(adminRef);
        
        if (!adminDoc.exists()) {
            console.error('User is not an admin');
            return false;
        }
        
        // تحديث آخر وقت تسجيل دخول
        await updateDoc(adminRef, {
            lastLoginAt: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('Error checking admin permissions:', error);
        return false;
    }
}

// Tools Management
async function loadTools() {
    try {
        const toolsRef = collection(db, 'tools');
        const q = query(toolsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        toolsTableBody.innerHTML = '';
        snapshot.forEach(doc => {
            const tool = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="tool-name">${tool.name}</td>
                <td class="tool-description">${tool.description}</td>
                <td class="tool-category">${tool.category}</td>
                <td class="tool-downloads">${tool.downloads || 0}</td>
                <td class="tool-actions">
                    <button onclick="handleEditTool('${doc.id}')" class="edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="handleDeleteTool('${doc.id}')" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            toolsTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading tools:', error);
        showNotification('حدث خطأ في تحميل الأدوات', 'error');
    }
}

async function addTool(e) {
    e.preventDefault();
    try {
        const name = document.getElementById('tool-name').value;
        const description = document.getElementById('tool-description').value;
        const category = document.getElementById('tool-category').value;
        const file = document.getElementById('tool-file').files[0];
        const link = document.getElementById('tool-link').value;
        const tags = document.getElementById('tool-tags').value.split(',').map(tag => tag.trim()).filter(Boolean);

        let fileUrl = '';
        if (file) {
            fileUrl = await uploadFile(file, `tools/${file.name}`);
        }

        await addDoc(collection(db, 'tools'), {
            name,
            description,
            category,
            fileUrl: fileUrl || link,
            tags,
            downloads: 0,
            createdAt: Timestamp.now()
        });

        closeModal('add-tool-modal');
        loadTools();
        showNotification('تم إضافة الأداة بنجاح', 'success');
        await logActivity('add_tool', `تمت إضافة الأداة: ${name}`);
    } catch (error) {
        console.error('Error adding tool:', error);
        showNotification('حدث خطأ في إضافة الأداة', 'error');
    }
}

async function editTool(toolId) {
    try {
        const toolRef = doc(db, 'tools', toolId);
        const toolDoc = await getDoc(toolRef);
        
        if (!toolDoc.exists()) {
            showNotification('الأداة غير موجودة', 'error');
            return;
        }

        const tool = toolDoc.data();
        
        // Fill form with current data
        document.getElementById('edit-tool-id').value = toolId;
        document.getElementById('edit-tool-name').value = tool.name;
        document.getElementById('edit-tool-description').value = tool.description;
        document.getElementById('edit-tool-category').value = tool.category;
        document.getElementById('edit-tool-tags').value = tool.tags ? tool.tags.join(', ') : '';
        
        if (tool.fileUrl && !tool.fileUrl.includes('firebasestorage')) {
            document.getElementById('edit-tool-link').value = tool.fileUrl;
        } else {
            document.getElementById('edit-tool-file-label').textContent = 'اختر ملفاً';
        }
        
        openModal('edit-tool-modal');
    } catch (error) {
        console.error('Error loading tool for edit:', error);
        showNotification('حدث خطأ في تحميل بيانات الأداة', 'error');
    }
}

async function updateTool(e) {
    e.preventDefault();
    try {
        const id = document.getElementById('edit-tool-id').value;
        const name = document.getElementById('edit-tool-name').value;
        const description = document.getElementById('edit-tool-description').value;
        const category = document.getElementById('edit-tool-category').value;
        const file = document.getElementById('edit-tool-file').files[0];
        const link = document.getElementById('edit-tool-link').value;
        const tags = document.getElementById('edit-tool-tags').value.split(',').map(tag => tag.trim()).filter(Boolean);

        const toolRef = doc(db, 'tools', id);
        const toolDoc = await getDoc(toolRef);
        const oldData = toolDoc.data();

        let fileUrl = oldData.fileUrl;
        if (file) {
            // Delete old file if it exists
            if (oldData.fileUrl && oldData.fileUrl.includes('firebasestorage')) {
                const oldFileRef = ref(storage, oldData.fileUrl);
                await deleteObject(oldFileRef);
            }
            fileUrl = await uploadFile(file, `tools/${file.name}`);
        } else if (link) {
            fileUrl = link;
        }

        await updateDoc(toolRef, {
            name,
            description,
            category,
            fileUrl,
            tags,
            updatedAt: Timestamp.now()
        });

        closeModal('edit-tool-modal');
        loadTools();
        showNotification('تم تحديث الأداة بنجاح', 'success');
        await logActivity('edit_tool', `تم تحديث الأداة: ${name}`);
    } catch (error) {
        console.error('Error updating tool:', error);
        showNotification('حدث خطأ في تحديث الأداة', 'error');
    }
}

async function deleteTool(toolId) {
    if (!confirm('هل أنت متأكد من حذف هذه الأداة؟')) {
        return;
    }

    try {
        const toolRef = doc(db, 'tools', toolId);
        const toolDoc = await getDoc(toolRef);
        
        if (!toolDoc.exists()) {
            showNotification('الأداة غير موجودة', 'error');
            return;
        }

        const tool = toolDoc.data();
        
        // Delete file if exists
        if (tool.fileUrl && tool.fileUrl.includes('firebasestorage')) {
            const fileRef = ref(storage, tool.fileUrl);
            await deleteObject(fileRef);
        }

        await deleteDoc(toolRef);
        
        // Log activity
        await logActivity('delete_tool', tool.name);
        
        loadTools();
        showNotification('تم حذف الأداة بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting tool:', error);
        showNotification('حدث خطأ في حذف الأداة', 'error');
    }
}

// Categories Management
async function loadCategories() {
    try {
        const categoriesRef = collection(db, 'categories');
        const snapshot = await getDocs(categoriesRef);
        
        categoriesGrid.innerHTML = '';
        categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
        
        snapshot.forEach(doc => {
            const category = doc.data();
            
            // Add to categories grid
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-card';
            categoryCard.innerHTML = `
                ${category.imageUrl ? `<img src="${category.imageUrl}" alt="${category.name}" class="category-image">` : ''}
                <div class="category-content">
                    <h3>${category.name}</h3>
                    <p>${category.description}</p>
                    <div class="category-actions">
                        <button onclick="handleEditCategory('${doc.id}')" class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="handleDeleteCategory('${doc.id}')" class="delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            categoriesGrid.appendChild(categoryCard);
            
            // Add to category filter
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('حدث خطأ في تحميل الفئات', 'error');
    }
}

async function addCategory(e) {
    e.preventDefault();
    try {
        const name = document.getElementById('category-name').value;
        const description = document.getElementById('category-description').value;
        const image = document.getElementById('category-image').files[0];

        // Validate inputs
        if (!name || !description) {
            showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        let imageUrl = '';
        if (image) {
            try {
                imageUrl = await uploadFile(image, `categories/${Date.now()}_${image.name}`);
            } catch (uploadError) {
                console.error('Error uploading image:', uploadError);
                showNotification('حدث خطأ في رفع الصورة', 'error');
                return;
            }
        }

        // Add category to Firestore
        const categoryData = {
            name,
            description,
            imageUrl,
            createdAt: Timestamp.now(),
            createdBy: auth.currentUser.uid
        };

        console.log('Adding category with data:', categoryData);
        const docRef = await addDoc(collection(db, 'categories'), categoryData);
        console.log('Category added successfully with ID:', docRef.id);

        // Clear form and close modal
        document.getElementById('add-category-form').reset();
        closeModal('add-category-modal');
        
        // Refresh categories and show success message
        await loadCategories();
        showNotification('تم إضافة الفئة بنجاح', 'success');
        
        // Log activity
        await logActivity('add_category', `تمت إضافة الفئة: ${name}`);
    } catch (error) {
        console.error('Error adding category:', error);
        showNotification('حدث خطأ في إضافة الفئة', 'error');
    }
}

async function editCategory(categoryId) {
    try {
        const categoryRef = doc(db, 'categories', categoryId);
        const categoryDoc = await getDoc(categoryRef);
        
        if (!categoryDoc.exists()) {
            showNotification('الفئة غير موجودة', 'error');
            return;
        }

        const category = categoryDoc.data();
        
        // Fill form with current data
        document.getElementById('edit-category-id').value = categoryId;
        document.getElementById('edit-category-name').value = category.name;
        document.getElementById('edit-category-description').value = category.description;
        
        if (category.imageUrl) {
            document.getElementById('edit-category-image-label').textContent = 'الصورة الحالية';
            const currentImage = document.getElementById('current-category-image');
            currentImage.innerHTML = `<img src="${category.imageUrl}" alt="${category.name}">`;
        }
        
        openModal('edit-category-modal');
    } catch (error) {
        console.error('Error loading category for edit:', error);
        showNotification('حدث خطأ في تحميل بيانات الفئة', 'error');
    }
}

async function updateCategory(e) {
    e.preventDefault();
    try {
        const id = document.getElementById('edit-category-id').value;
        const name = document.getElementById('edit-category-name').value;
        const description = document.getElementById('edit-category-description').value;
        const image = document.getElementById('edit-category-image').files[0];

        const categoryRef = doc(db, 'categories', id);
        const categoryDoc = await getDoc(categoryRef);
        const oldData = categoryDoc.data();

        let imageUrl = oldData.imageUrl;
        if (image) {
            // Delete old image if it exists
            if (oldData.imageUrl) {
                const oldImageRef = ref(storage, oldData.imageUrl);
                await deleteObject(oldImageRef);
            }
            imageUrl = await uploadFile(image, `categories/${image.name}`);
        }

        await updateDoc(categoryRef, {
            name,
            description,
            imageUrl,
            updatedAt: Timestamp.now()
        });

        closeModal('edit-category-modal');
        loadCategories();
        showNotification('تم تحديث الفئة بنجاح', 'success');
        await logActivity('edit_category', `تم تحديث الفئة: ${name}`);
    } catch (error) {
        console.error('Error updating category:', error);
        showNotification('حدث خطأ في تحديث الفئة', 'error');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
        return;
    }

    try {
        const categoryRef = doc(db, 'categories', categoryId);
        const categoryDoc = await getDoc(categoryRef);
        
        if (!categoryDoc.exists()) {
            showNotification('الفئة غير موجودة', 'error');
            return;
        }

        const category = categoryDoc.data();
        
        // Delete image if exists
        if (category.imageUrl) {
            const imageRef = ref(storage, category.imageUrl);
            await deleteObject(imageRef);
        }

        await deleteDoc(categoryRef);
        
        // Log activity
        await logActivity('delete_category', category.name);
        
        loadCategories();
        showNotification('تم حذف الفئة بنجاح', 'success');
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('حدث خطأ في حذف الفئة', 'error');
    }
}

// File Management
async function deleteFile(path) {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    } catch (error) {
        console.error('Error deleting file:', error);
    }
}

// Activity Logging
async function logActivity(action, details) {
    try {
        await addDoc(collection(db, 'activity_logs'), {
            action: action,
            details: details,
            timestamp: Timestamp.now(),
            user: auth.currentUser.email
        });
        
        // Refresh dashboard stats and activity
        loadDashboardStats();
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Dashboard Statistics
async function loadDashboardStats() {
    try {
        // Get tools count and total downloads
        const toolsSnapshot = await getDocs(collection(db, 'tools'));
        let totalDownloads = 0;
        let totalTools = 0;
        
        toolsSnapshot.forEach(doc => {
            totalTools++;
            totalDownloads += doc.data().downloads || 0;
        });
        
        totalToolsElement.textContent = totalTools;
        totalDownloadsElement.textContent = totalDownloads;

        // Get categories count
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        totalCategoriesElement.textContent = categoriesSnapshot.size;

        // Get users count (excluding admins)
        const usersSnapshot = await getDocs(
            query(collection(db, 'users'), where('role', '!=', 'admin'))
        );
        totalUsersElement.textContent = usersSnapshot.size;

        // Update recent activity
        const activitySnapshot = await getDocs(
            query(
                collection(db, 'activity_logs'),
                orderBy('timestamp', 'desc'),
                limit(5)
            )
        );

        const recentActivityList = document.getElementById('recent-activity');
        recentActivityList.innerHTML = '';
        
        activitySnapshot.forEach(doc => {
            const activity = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="activity-time">${formatTimestamp(activity.timestamp)}</span>
                <span class="activity-user">${activity.user}</span>
                <span class="activity-action">${formatAction(activity.action)}</span>
                <span class="activity-details">${activity.details}</span>
            `;
            recentActivityList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('حدث خطأ في تحميل الإحصائيات', 'error');
    }
}

// Download Tracking
async function trackDownload(toolId) {
    try {
        const toolRef = doc(db, 'tools', toolId);
        const toolDoc = await getDoc(toolRef);
        
        if (!toolDoc.exists()) {
            return;
        }

        const tool = toolDoc.data();
        
        // Increment downloads
        await updateDoc(toolRef, {
            downloads: (tool.downloads || 0) + 1
        });

        // Log download
        await addDoc(collection(db, 'downloads'), {
            toolId: toolId,
            toolName: tool.name,
            downloadedAt: Timestamp.now(),
            downloadedBy: auth.currentUser?.email || 'anonymous'
        });

        // Refresh dashboard stats
        loadDashboardStats();
    } catch (error) {
        console.error('Error tracking download:', error);
    }
}

// Utility Functions
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function formatTimestamp(timestamp) {
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatAction(action) {
    const actions = {
        add_tool: 'إضافة أداة',
        edit_tool: 'تعديل أداة',
        delete_tool: 'حذف أداة',
        add_category: 'إضافة فئة',
        edit_category: 'تعديل فئة',
        delete_category: 'حذف فئة',
        download_tool: 'تحميل أداة'
    };
    return actions[action] || action;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = './usr.html';
            return;
        }

        try {
            const isAdmin = await checkAdminPermissions(user);
            if (!isAdmin) {
                await signOut(auth);
                window.location.href = './usr.html';
                return;
            }

            // Load initial data
            loadTools();
            loadCategories();
            loadDashboardStats();
            
            // Load settings
            const savedTheme = localStorage.getItem('theme') || 'light';
            themeSelect.value = savedTheme;
            document.documentElement.setAttribute('data-theme', savedTheme);
            
            // Initialize navigation
            initializeNavigation();
            
        } catch (error) {
            console.error('Error checking admin status:', error);
            await signOut(auth);
            window.location.href = './usr.html';
        }
    });

    // Form submit handlers
    addToolForm.addEventListener('submit', addTool);
    editToolForm.addEventListener('submit', updateTool);
    addCategoryForm.addEventListener('submit', addCategory);
    editCategoryForm.addEventListener('submit', updateCategory);

    // Modal open buttons
    addToolBtn.addEventListener('click', () => {
        document.querySelector('#add-tool-modal .modal-header h2').textContent = 'إضافة أداة جديدة';
        document.querySelector('#add-tool-modal .modal-footer button[type="submit"]').textContent = 'إضافة الأداة';
        addToolForm.reset();
        openModal('add-tool-modal');
    });

    addCategoryBtn.addEventListener('click', () => {
        document.querySelector('#add-category-modal .modal-header h2').textContent = 'إضافة فئة جديدة';
        document.querySelector('#add-category-modal .modal-footer button[type="submit"]').textContent = 'إضافة الفئة';
        addCategoryForm.reset();
        openModal('add-category-modal');
    });

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // Logout button
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = './usr.html';
        } catch (error) {
            console.error('Error signing out:', error);
            showNotification('حدث خطأ أثناء تسجيل الخروج', 'error');
        }
    });
    
    // Search and filter
    toolSearch.addEventListener('input', () => {
        const searchTerm = toolSearch.value.toLowerCase();
        const rows = toolsTableBody.getElementsByTagName('tr');
        
        Array.from(rows).forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    categoryFilter.addEventListener('change', () => {
        const selectedCategory = categoryFilter.value.toLowerCase();
        const rows = toolsTableBody.getElementsByTagName('tr');
        
        Array.from(rows).forEach(row => {
            const category = row.children[2].textContent.toLowerCase();
            row.style.display = !selectedCategory || category === selectedCategory ? '' : 'none';
        });
    });

    // File input change handlers
    document.getElementById('tool-file').addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name || 'اختر ملفاً';
        document.getElementById('tool-file-label').textContent = fileName;
    });

    document.getElementById('edit-tool-file').addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name || 'اختر ملفاً';
        document.getElementById('edit-tool-file-label').textContent = fileName;
    });

    document.getElementById('category-image').addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name || 'اختر صورة';
        document.getElementById('category-image-label').textContent = fileName;
    });

    document.getElementById('edit-category-image').addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name || 'اختر صورة';
        document.getElementById('edit-category-image-label').textContent = fileName;
    });

    // Save settings
    document.getElementById('save-settings').addEventListener('click', () => {
        const theme = themeSelect.value;
        const siteName = siteNameInput.value;
        
        localStorage.setItem('theme', theme);
        localStorage.setItem('siteName', siteName);
        
        document.documentElement.setAttribute('data-theme', theme);
        showNotification('تم حفظ الإعدادات بنجاح', 'success');
    });
});

// Event Handlers
async function handleEditTool(id) {
    try {
        const toolRef = doc(db, 'tools', id);
        const toolDoc = await getDoc(toolRef);
        const tool = toolDoc.data();

        document.getElementById('edit-tool-id').value = id;
        document.getElementById('edit-tool-name').value = tool.name;
        document.getElementById('edit-tool-description').value = tool.description;
        document.getElementById('edit-tool-category').value = tool.category;
        document.getElementById('edit-tool-link').value = tool.fileUrl && !tool.fileUrl.includes('firebasestorage') ? tool.fileUrl : '';
        document.getElementById('edit-tool-tags').value = tool.tags ? tool.tags.join(', ') : '';
        document.getElementById('edit-tool-file-label').textContent = 'اختر ملفاً';

        openModal('edit-tool-modal');
    } catch (error) {
        console.error('Error loading tool for edit:', error);
        showNotification('حدث خطأ في تحميل بيانات الأداة', 'error');
    }
}

async function handleDeleteTool(id) {
    if (confirm('هل أنت متأكد من حذف هذه الأداة؟')) {
        try {
            const toolRef = doc(db, 'tools', id);
            const toolDoc = await getDoc(toolRef);
            const tool = toolDoc.data();

            // Delete file from storage if it exists
            if (tool.fileUrl && tool.fileUrl.includes('firebasestorage')) {
                const fileRef = ref(storage, tool.fileUrl);
                await deleteObject(fileRef);
            }

            await deleteDoc(toolRef);
            loadTools();
            showNotification('تم حذف الأداة بنجاح', 'success');
            await logActivity('delete_tool', `تم حذف الأداة: ${tool.name}`);
        } catch (error) {
            console.error('Error deleting tool:', error);
            showNotification('حدث خطأ في حذف الأداة', 'error');
        }
    }
}

async function handleEditCategory(id) {
    try {
        const categoryRef = doc(db, 'categories', id);
        const categoryDoc = await getDoc(categoryRef);
        const category = categoryDoc.data();

        document.getElementById('edit-category-id').value = id;
        document.getElementById('edit-category-name').value = category.name;
        document.getElementById('edit-category-description').value = category.description;
        document.getElementById('edit-category-image-label').textContent = 'اختر صورة';

        if (category.imageUrl) {
            const currentImageContainer = document.getElementById('current-category-image');
            currentImageContainer.innerHTML = `<img src="${category.imageUrl}" alt="${category.name}">`;
        }

        openModal('edit-category-modal');
    } catch (error) {
        console.error('Error loading category for edit:', error);
        showNotification('حدث خطأ في تحميل بيانات الفئة', 'error');
    }
}

async function handleDeleteCategory(id) {
    if (confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
        try {
            const categoryRef = doc(db, 'categories', id);
            const categoryDoc = await getDoc(categoryRef);
            const category = categoryDoc.data();

            // Delete image from storage if it exists
            if (category.imageUrl) {
                const imageRef = ref(storage, category.imageUrl);
                await deleteObject(imageRef);
            }

            await deleteDoc(categoryRef);
            loadCategories();
            showNotification('تم حذف الفئة بنجاح', 'success');
            await logActivity('delete_category', `تم حذف الفئة: ${category.name}`);
        } catch (error) {
            console.error('Error deleting category:', error);
            showNotification('حدث خطأ في حذف الفئة', 'error');
        }
    }
}

// Make functions available globally
window.handleEditTool = handleEditTool;
window.handleDeleteTool = handleDeleteTool;
window.handleEditCategory = handleEditCategory;
window.handleDeleteCategory = handleDeleteCategory; 