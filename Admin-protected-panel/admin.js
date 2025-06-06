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
    limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB3bBsR5j6CHYaXkrIIF_g4ZvWGYd3WTiQ",
    authDomain: "mr-piip-pro.firebaseapp.com",
    projectId: "mr-piip-pro",
    storageBucket: "mr-piip-pro.firebasestorage.app",
    messagingSenderId: "826519029119",
    appId: "1:826519029119:web:548c3298af3b20f370464a",
    measurementId: "G-MQ3QVBXJS4"
};

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
        const adminsRef = collection(db, 'admins');
        const q = query(adminsRef, where('email', '==', user.email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
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
                    <button onclick="editTool('${doc.id}')" class="edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteTool('${doc.id}')" class="delete-btn">
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

async function addTool(event) {
    event.preventDefault();
    const formData = new FormData(addToolForm);
    
    try {
        let fileUrl = '';
        const file = formData.get('tool-file');
        
        if (file && file.size > 0) {
            const filePath = `tools/${Date.now()}_${file.name}`;
            fileUrl = await uploadFile(file, filePath);
        }

        const toolData = {
            name: formData.get('tool-name'),
            description: formData.get('tool-description'),
            category: formData.get('tool-category'),
            link: fileUrl || formData.get('tool-link'),
            tags: formData.get('tool-tags').split(',').map(tag => tag.trim()),
            downloads: 0,
            createdAt: Timestamp.now(),
            createdBy: auth.currentUser.email,
            isFile: !!fileUrl
        };

        await addDoc(collection(db, 'tools'), toolData);
        
        // Log activity
        await logActivity('add_tool', toolData.name);
        
        closeModal('add-tool-modal');
        addToolForm.reset();
        loadTools();
        showNotification('تمت إضافة الأداة بنجاح', 'success');
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
        document.getElementById('edit-tool-tags').value = tool.tags.join(', ');
        
        if (tool.isFile) {
            document.getElementById('edit-tool-file-label').textContent = 'الملف الحالي';
        } else {
            document.getElementById('edit-tool-link').value = tool.link;
        }
        
        openModal('edit-tool-modal');
    } catch (error) {
        console.error('Error loading tool for edit:', error);
        showNotification('حدث خطأ في تحميل بيانات الأداة', 'error');
    }
}

async function updateTool(event) {
    event.preventDefault();
    const formData = new FormData(editToolForm);
    const toolId = document.getElementById('edit-tool-id').value;
    
    try {
        let fileUrl = '';
        const file = formData.get('edit-tool-file');
        
        if (file && file.size > 0) {
            const filePath = `tools/${Date.now()}_${file.name}`;
            fileUrl = await uploadFile(file, filePath);
            
            // Delete old file if exists
            const toolRef = doc(db, 'tools', toolId);
            const toolDoc = await getDoc(toolRef);
            if (toolDoc.exists() && toolDoc.data().isFile) {
                await deleteFile(toolDoc.data().link);
            }
        }

        const toolData = {
            name: formData.get('edit-tool-name'),
            description: formData.get('edit-tool-description'),
            category: formData.get('edit-tool-category'),
            tags: formData.get('edit-tool-tags').split(',').map(tag => tag.trim()),
            updatedAt: Timestamp.now(),
            updatedBy: auth.currentUser.email
        };

        if (fileUrl || formData.get('edit-tool-link')) {
            toolData.link = fileUrl || formData.get('edit-tool-link');
            toolData.isFile = !!fileUrl;
        }

        await updateDoc(doc(db, 'tools', toolId), toolData);
        
        // Log activity
        await logActivity('edit_tool', toolData.name);
        
        closeModal('edit-tool-modal');
        editToolForm.reset();
        loadTools();
        showNotification('تم تحديث الأداة بنجاح', 'success');
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
        if (tool.isFile) {
            await deleteFile(tool.link);
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
                        <button onclick="editCategory('${doc.id}')" class="edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteCategory('${doc.id}')" class="delete-btn">
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

async function addCategory(event) {
    event.preventDefault();
    const formData = new FormData(addCategoryForm);
    
    try {
        let imageUrl = '';
        const image = formData.get('category-image');
        
        if (image && image.size > 0) {
            const imagePath = `categories/${Date.now()}_${image.name}`;
            imageUrl = await uploadFile(image, imagePath);
        }

        const categoryData = {
            name: formData.get('category-name'),
            description: formData.get('category-description'),
            imageUrl: imageUrl,
            createdAt: Timestamp.now(),
            createdBy: auth.currentUser.email
        };

        await addDoc(collection(db, 'categories'), categoryData);
        
        // Log activity
        await logActivity('add_category', categoryData.name);
        
        closeModal('add-category-modal');
        addCategoryForm.reset();
        loadCategories();
        showNotification('تمت إضافة الفئة بنجاح', 'success');
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

async function updateCategory(event) {
    event.preventDefault();
    const formData = new FormData(editCategoryForm);
    const categoryId = document.getElementById('edit-category-id').value;
    
    try {
        let imageUrl = '';
        const image = formData.get('edit-category-image');
        
        if (image && image.size > 0) {
            const imagePath = `categories/${Date.now()}_${image.name}`;
            imageUrl = await uploadFile(image, imagePath);
            
            // Delete old image if exists
            const categoryRef = doc(db, 'categories', categoryId);
            const categoryDoc = await getDoc(categoryRef);
            if (categoryDoc.exists() && categoryDoc.data().imageUrl) {
                await deleteFile(categoryDoc.data().imageUrl);
            }
        }

        const categoryData = {
            name: formData.get('edit-category-name'),
            description: formData.get('edit-category-description'),
            updatedAt: Timestamp.now(),
            updatedBy: auth.currentUser.email
        };

        if (imageUrl) {
            categoryData.imageUrl = imageUrl;
        }

        await updateDoc(doc(db, 'categories', categoryId), categoryData);
        
        // Log activity
        await logActivity('edit_category', categoryData.name);
        
        closeModal('edit-category-modal');
        editCategoryForm.reset();
        loadCategories();
        showNotification('تم تحديث الفئة بنجاح', 'success');
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
            await deleteFile(category.imageUrl);
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
    document.getElementById(modalId).style.display = 'none';
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
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

// Initialize Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    // Show dashboard by default
    document.getElementById('dashboard').classList.add('active');
    navItems[0].classList.add('active');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.dataset.section;
            
            // Remove active class from all nav items and sections
            navItems.forEach(navItem => navItem.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked nav item and corresponding section
            item.classList.add('active');
            document.getElementById(targetSection).classList.add('active');
        });
    });
}

// Expose functions to window object for onclick handlers
window.editTool = editTool;
window.deleteTool = deleteTool;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory; 