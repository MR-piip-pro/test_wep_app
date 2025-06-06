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
const siteNameInput = document.getElementById('site-name');
const themeSelect = document.getElementById('theme');

// Stats Elements
const totalToolsElement = document.getElementById('total-tools');
const totalDownloadsElement = document.getElementById('total-downloads');
const totalUsersElement = document.getElementById('total-users');
const totalCategoriesElement = document.getElementById('total-categories');

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
                <td>${tool.name}</td>
                <td>${tool.description}</td>
                <td>${tool.category}</td>
                <td>${tool.downloads || 0}</td>
                <td>
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

// File Upload Functions
async function uploadFile(file, path) {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

async function deleteFile(path) {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    } catch (error) {
        console.error('Error deleting file:', error);
        // Don't throw error as the file might not exist
    }
}

// Enhanced Tool Management
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
        
        // Fill the edit form with tool data
        document.getElementById('edit-tool-id').value = toolId;
        document.getElementById('edit-tool-name').value = tool.name;
        document.getElementById('edit-tool-description').value = tool.description;
        document.getElementById('edit-tool-category').value = tool.category;
        document.getElementById('edit-tool-link').value = tool.isFile ? '' : tool.link;
        document.getElementById('edit-tool-tags').value = tool.tags.join(', ');
        
        // Show current file name if it's a file
        const fileLabel = document.getElementById('edit-tool-file-label');
        if (tool.isFile) {
            fileLabel.textContent = 'الملف الحالي: ' + tool.link.split('/').pop();
        } else {
            fileLabel.textContent = 'اختر ملفاً';
        }
        
        document.getElementById('edit-tool-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading tool data:', error);
        showNotification('حدث خطأ في تحميل بيانات الأداة', 'error');
    }
}

// Add event listener for edit tool form
document.getElementById('edit-tool-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const toolId = document.getElementById('edit-tool-id').value;
    const toolData = {
        name: document.getElementById('edit-tool-name').value,
        description: document.getElementById('edit-tool-description').value,
        category: document.getElementById('edit-tool-category').value,
        link: document.getElementById('edit-tool-link').value,
        tags: document.getElementById('edit-tool-tags').value.split(',').map(tag => tag.trim()),
        updatedAt: Timestamp.now()
    };

    try {
        await updateDoc(doc(db, 'tools', toolId), toolData);
        closeModal('edit-tool-modal');
        loadTools();
        showNotification('تم تحديث الأداة بنجاح', 'success');
    } catch (error) {
        console.error('Error updating tool:', error);
        showNotification('حدث خطأ في تحديث الأداة', 'error');
    }
});

async function deleteTool(toolId) {
    if (confirm('هل أنت متأكد من حذف هذه الأداة؟')) {
        try {
            await deleteDoc(doc(db, 'tools', toolId));
            loadTools();
            showNotification('تم حذف الأداة بنجاح', 'success');
        } catch (error) {
            console.error('Error deleting tool:', error);
            showNotification('حدث خطأ في حذف الأداة', 'error');
        }
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

// Enhanced Category Management
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
        
        // Fill the edit form with category data
        document.getElementById('edit-category-id').value = categoryId;
        document.getElementById('edit-category-name').value = category.name;
        document.getElementById('edit-category-description').value = category.description;
        
        // Show the edit modal
        document.getElementById('edit-category-modal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading category data:', error);
        showNotification('حدث خطأ في تحميل بيانات الفئة', 'error');
    }
}

// Add event listener for edit category form
document.getElementById('edit-category-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const categoryId = document.getElementById('edit-category-id').value;
    const categoryData = {
        name: document.getElementById('edit-category-name').value,
        description: document.getElementById('edit-category-description').value,
        updatedAt: Timestamp.now()
    };

    try {
        await updateDoc(doc(db, 'categories', categoryId), categoryData);
        closeModal('edit-category-modal');
        loadCategories();
        showNotification('تم تحديث الفئة بنجاح', 'success');
    } catch (error) {
        console.error('Error updating category:', error);
        showNotification('حدث خطأ في تحديث الفئة', 'error');
    }
});

async function deleteCategory(categoryId) {
    if (confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
        try {
            await deleteDoc(doc(db, 'categories', categoryId));
            loadCategories();
            showNotification('تم حذف الفئة بنجاح', 'success');
        } catch (error) {
            console.error('Error deleting category:', error);
            showNotification('حدث خطأ في حذف الفئة', 'error');
        }
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

        loadDashboardStats();
    } catch (error) {
        console.error('Error tracking download:', error);
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
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Enhanced Dashboard Statistics
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
        delete_category: 'حذف فئة'
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
        } catch (error) {
            console.error('Error checking admin status:', error);
            await signOut(auth);
            window.location.href = './usr.html';
        }
    });

    // Load initial data
    loadTools();
    loadCategories();
    loadDashboardStats();
    loadSettings();

    // Add event listeners
    addToolForm.addEventListener('submit', addTool);
    addCategoryForm.addEventListener('submit', addCategory);
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    
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

    // Download tracking
    document.addEventListener('click', async (e) => {
        if (e.target.matches('.download-btn')) {
            const toolId = e.target.dataset.toolId;
            await trackDownload(toolId);
        }
    });
});

// Expose functions to window object for onclick handlers
window.editTool = editTool;
window.deleteTool = deleteTool;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory; 