// =============================================
// SUPABASE MANAGER - COMPLETELY ERROR-PROOF
// =============================================

// Configuration
const SUPABASE_CONFIG = {
    url: 'https://rrwbovlazaunlxivltdn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyd2JvdmxhemF1bmx4aXZsdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDkwNTksImV4cCI6MjA4NDA4NTA1OX0.S0dG69MEpK2yJXqWWMxqhYyGlIrFYpTvXy1Wllqjin8'
};

// OPENROUTER AI CONFIGURATION
const OPENROUTER_CONFIG = {
    apiKey: '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', // Replace with your actual OpenRouter API key
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    apiUrl: 'https://openrouter.ai/api/v1/chat/completions'
};

// App State
const AppState = {
    currentUser: null,
    currentChat: null,
    messageSubscription: null,
    onlineStatusSubscription: null,
    initialized: false,
    eventListenersSetup: false,
    profileImage: null,
    profileImageUrl: null,
    editProfileLastUpdate: null,
    aiChatHistory: [],
    isAITyping: false,
    lastProfileUpdate: null
};

// =============================================
// SUPABASE CLIENT MANAGER
// =============================================
const SupabaseManager = (function() {
    let _client = null;
    let _initialized = false;
    
    return {
        getClient: function() {
            if (!_client && !_initialized) {
                try {
                    if (typeof supabase !== 'undefined' && supabase.createClient) {
                        _client = supabase.createClient(
                            SUPABASE_CONFIG.url,
                            SUPABASE_CONFIG.anonKey
                        );
                        console.log('✅ Supabase client created');
                    } else if (typeof createClient !== 'undefined') {
                        _client = createClient(
                            SUPABASE_CONFIG.url,
                            SUPABASE_CONFIG.anonKey
                        );
                        console.log('✅ Supabase client created using direct createClient');
                    } else if (window.supabase && window.supabase.createClient) {
                        _client = window.supabase.createClient(
                            SUPABASE_CONFIG.url,
                            SUPABASE_CONFIG.anonKey
                        );
                        console.log('✅ Supabase client created using window.supabase');
                    } else {
                        console.error('❌ Supabase library not loaded properly');
                        throw new Error('Supabase library not found.');
                    }
                    
                    _initialized = true;
                    console.log('✅ SupabaseManager initialized successfully');
                } catch (error) {
                    console.error('❌ Failed to initialize Supabase:', error);
                    return null;
                }
            }
            return _client;
        },
        
        isInitialized: function() {
            return _initialized;
        },
        
        reset: function() {
            if (_client) {
                try {
                    _client.removeAllChannels();
                } catch (e) {
                    console.log('No channels to remove');
                }
                _client = null;
            }
            _initialized = false;
            console.log('🔄 SupabaseManager reset');
        }
    };
})();

// =============================================
// DOM ELEMENT GETTERS
// =============================================
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`⚠️ Element with ID "${id}" not found`);
    }
    return element;
}

const Screens = {
    get welcome() { return getElement('welcome-screen'); },
    get signup() { return getElement('signup-screen'); },
    get login() { return getElement('login-screen'); },
    get mainApp() { return getElement('main-app-screen'); }
};

// =============================================
// THEME MANAGEMENT
// =============================================
function toggleDarkMode() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        if (themeIcon) themeIcon.className = 'fas fa-sun';
        if (themeToggleIcon) themeToggleIcon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        if (themeIcon) themeIcon.className = 'fas fa-moon';
        if (themeToggleIcon) themeToggleIcon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    }
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    
    body.classList.remove('light-mode', 'dark-mode');
    body.classList.add(savedTheme + '-mode');
    
    if (themeIcon) {
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    if (themeToggleIcon) {
        themeToggleIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded - Initializing IsaHub');
    
    // Load theme preference first
    loadThemePreference();
    
    // Setup event listeners
    setupEventListeners();
    
    // Then initialize app with retry logic
    setTimeout(() => {
        initializeAppWithRetry();
    }, 100);
});

async function initializeAppWithRetry(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`🔄 Initialization attempt ${attempt}/${retries}`);
            await initializeApp();
            AppState.initialized = true;
            console.log('✅ App initialized successfully');
            return;
        } catch (error) {
            console.error(`❌ Initialization attempt ${attempt} failed:`, error.message);
            
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            } else {
                console.error('❌ All initialization attempts failed');
                showError('Failed to initialize application. Please refresh the page.');
                ensureWelcomeScreenVisible();
            }
        }
    }
}

async function initializeApp() {
    const supabase = SupabaseManager.getClient();
    if (!supabase) {
        throw new Error('Supabase client not available');
    }
    
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Session check error:', error);
            throw error;
        }
        
        if (session && session.user) {
            console.log('✅ User session found:', session.user.email);
            await loadCurrentUser(session.user.id);
            showScreen('mainApp');
            await loadChats();
            setupRealtimeSubscriptions();
            
            // Show AI indicator
            document.getElementById('ai-indicator').style.display = 'inline-block';
        } else {
            console.log('❌ No user session found');
            ensureWelcomeScreenVisible();
        }
    } catch (error) {
        console.error('❌ Initialization error:', error);
        throw error;
    }
}

// =============================================
// EVENT LISTENERS SETUP
// =============================================
function setupEventListeners() {
    if (AppState.eventListenersSetup) {
        console.log('⚠️ Event listeners already setup');
        return;
    }
    
    console.log('🔄 Setting up event listeners...');
    setupEventListenersWithRetry();
    
    AppState.eventListenersSetup = true;
    console.log('✅ Event listeners setup complete');
}

function setupEventListenersWithRetry(retries = 5, delay = 200) {
    let attempts = 0;
    
    function attemptSetup() {
        attempts++;
        console.log(`🔄 Attempt ${attempts} to setup event listeners`);
        
        try {
            // Welcome screen buttons
            const signupBtn = getElement('signup-btn');
            const loginBtn = getElement('login-btn');
            
            if (signupBtn && loginBtn) {
                console.log('✅ Found auth buttons, attaching listeners');
                
                signupBtn.replaceWith(signupBtn.cloneNode(true));
                loginBtn.replaceWith(loginBtn.cloneNode(true));
                
                const newSignupBtn = getElement('signup-btn');
                const newLoginBtn = getElement('login-btn');
                
                newSignupBtn.addEventListener('click', () => {
                    console.log('🔄 Sign up button clicked');
                    showScreen('signup');
                });
                
                newLoginBtn.addEventListener('click', () => {
                    console.log('🔄 Login button clicked');
                    showScreen('login');
                });
                
                console.log('✅ Auth button listeners attached');
            } else {
                throw new Error('Auth buttons not found yet');
            }

            // Theme toggle
            const themeToggle = getElement('theme-toggle');
            const themeToggleIcon = getElement('theme-toggle-icon');
            
            if (themeToggle) {
                themeToggle.addEventListener('click', toggleDarkMode);
            }
            if (themeToggleIcon) {
                themeToggleIcon.addEventListener('click', toggleDarkMode);
            }

            // Auth switching buttons
            const switchToLogin = getElement('switch-to-login');
            const switchToSignup = getElement('switch-to-signup');
            
            if (switchToLogin && switchToSignup) {
                switchToLogin.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('🔄 Switching to login screen');
                    showScreen('login');
                });
                
                switchToSignup.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('🔄 Switching to signup screen');
                    showScreen('signup');
                });
            }

            // Form submissions
            const signupForm = getElement('signup-form');
            const loginForm = getElement('login-form');
            
            if (signupForm) {
                signupForm.addEventListener('submit', function(e) {
                    console.log('🔄 Signup form submitted');
                    handleSignup(e);
                });
            }
            
            if (loginForm) {
                loginForm.addEventListener('submit', function(e) {
                    console.log('🔄 Login form submitted');
                    handleLogin(e);
                });
            }

            // Profile preview
            const signupName = getElement('signup-name');
            if (signupName) {
                signupName.addEventListener('input', updateProfilePreview);
            }

            // Password strength indicator
            const signupPassword = getElement('signup-password');
            if (signupPassword) {
                signupPassword.addEventListener('input', updatePasswordStrength);
            }

            // Profile image upload
            const uploadProfileBtn = getElement('upload-profile-btn');
            const profileImageInput = getElement('profile-image-input');
            const profileImagePreview = getElement('profile-image-preview');
            
            if (uploadProfileBtn) {
                uploadProfileBtn.addEventListener('click', () => {
                    profileImageInput.click();
                });
            }
            
            if (profileImageInput) {
                profileImageInput.addEventListener('change', handleProfileImageUpload);
            }
            
            if (profileImagePreview) {
                profileImagePreview.addEventListener('click', () => {
                    profileImageInput.click();
                });
            }

            // Chat functionality
            const sendMessageBtn = getElement('send-message');
            const messageInput = getElement('message-input');
            
            if (sendMessageBtn) {
                sendMessageBtn.addEventListener('click', sendMessage);
            }
            
            if (messageInput) {
                messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') sendMessage();
                });
            }

            // AI Chat functionality
            const sendAIMessageBtn = getElement('send-ai-message');
            const aiMessageInput = getElement('ai-message-input');
            
            if (sendAIMessageBtn) {
                sendAIMessageBtn.addEventListener('click', sendAIMessage);
            }
            
            if (aiMessageInput) {
                aiMessageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') sendAIMessage();
                });
            }

            const backToChats = getElement('back-to-chats');
            if (backToChats) {
                backToChats.addEventListener('click', () => {
                    showView('chats');
                });
            }

            const backToChatsAI = getElement('back-to-chats-ai');
            if (backToChatsAI) {
                backToChatsAI.addEventListener('click', () => {
                    showView('chats');
                });
            }

            // App navigation
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const view = item.getAttribute('data-view');
                    showView(view);
                    
                    document.querySelectorAll('.nav-item').forEach(nav => {
                        nav.classList.remove('active');
                    });
                    item.classList.add('active');
                });
            });

            // Friend search
            const friendSearch = getElement('friend-search');
            if (friendSearch) {
                friendSearch.addEventListener('input', searchUsers);
            }
            
            // Search options
            document.querySelectorAll('.search-option-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.search-option-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    const placeholderText = this.dataset.type === 'email' ? 'Search by email...' : 'Search by phone number...';
                    if (friendSearch) friendSearch.placeholder = placeholderText;
                    if (friendSearch) friendSearch.value = '';
                    const usersList = getElement('users-list');
                    if (usersList) {
                        usersList.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-search"></i>
                                <h3>Find Friends</h3>
                                <p>Search for friends using their ${this.dataset.type === 'email' ? 'email address' : 'phone number'}</p>
                            </div>
                        `;
                    }
                });
            });

            // Logout
            const logoutBtn = getElement('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
            
            // Edit Profile
            const editProfileBtn = getElement('edit-profile');
            const closeEditProfile = getElement('close-edit-profile');
            const editProfileModal = getElement('edit-profile-modal');
            
            if (editProfileBtn) {
                editProfileBtn.addEventListener('click', openEditProfile);
            }
            
            if (closeEditProfile) {
                closeEditProfile.addEventListener('click', () => {
                    editProfileModal.classList.remove('active');
                });
            }
            
            // Profile Viewer
            const closeProfileViewer = getElement('close-profile-viewer');
            const profileViewerModal = getElement('profile-viewer-modal');
            
            if (closeProfileViewer) {
                closeProfileViewer.addEventListener('click', () => {
                    profileViewerModal.classList.remove('active');
                });
            }
            
            // Chat header profile view
            const chatAvatarContainer = getElement('chat-avatar-container');
            const chatUserInfo = getElement('chat-user-info');
            
            if (chatAvatarContainer) {
                chatAvatarContainer.addEventListener('click', viewFriendProfile);
            }
            
            if (chatUserInfo) {
                chatUserInfo.addEventListener('click', viewFriendProfile);
            }
            
            // AI Settings
            const aiSettingsBtn = getElement('ai-settings');
            if (aiSettingsBtn) {
                aiSettingsBtn.addEventListener('click', () => {
                    alert('🤖 AI Assistant Settings:\n\n• Response Style: Balanced\n• Auto-translate: Enabled\n• Context Memory: 10 messages\n\nMore options coming soon!');
                });
            }
            
            // Edit profile tabs
            document.querySelectorAll('.edit-profile-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.dataset.tab;
                    switchEditProfileTab(tabId);
                });
            });
            
            // Save profile buttons
            const saveBasicBtn = getElement('save-basic-info');
            const saveSecurityBtn = getElement('save-security-info');
            const saveAvatarBtn = getElement('save-avatar');
            
            if (saveBasicBtn) {
                saveBasicBtn.addEventListener('click', saveBasicInfo);
            }
            if (saveSecurityBtn) {
                saveSecurityBtn.addEventListener('click', saveSecurityInfo);
            }
            if (saveAvatarBtn) {
                saveAvatarBtn.addEventListener('click', saveAvatar);
            }
            
            // Edit avatar
            const editAvatarBtn = getElement('edit-avatar-btn');
            const editAvatarInput = getElement('edit-avatar-input');
            const removeAvatarBtn = getElement('remove-avatar-btn');
            
            if (editAvatarBtn) {
                editAvatarBtn.addEventListener('click', () => {
                    editAvatarInput.click();
                });
            }
            
            if (editAvatarInput) {
                editAvatarInput.addEventListener('change', handleEditAvatarUpload);
            }
            
            if (removeAvatarBtn) {
                removeAvatarBtn.addEventListener('click', removeAvatar);
            }
            
            console.log('✅ All event listeners setup successfully');
            return true;
            
        } catch (error) {
            console.error(`❌ Event listener setup attempt ${attempts} failed:`, error);
            
            if (attempts < retries) {
                console.log(`🔄 Retrying in ${delay}ms...`);
                setTimeout(attemptSetup, delay);
                return false;
            } else {
                console.error('❌ Failed to setup event listeners after all retries');
                setupCriticalEventListeners();
                return false;
            }
        }
    }
    
    setTimeout(attemptSetup, 100);
}

function setupCriticalEventListeners() {
    console.log('🔄 Setting up critical event listeners...');
    
    document.body.addEventListener('click', function(e) {
        if (e.target.id === 'signup-btn' || e.target.closest('#signup-btn')) {
            console.log('🔄 Sign up button clicked (delegated)');
            showScreen('signup');
            e.preventDefault();
        }
        
        if (e.target.id === 'login-btn' || e.target.closest('#login-btn')) {
            console.log('🔄 Login button clicked (delegated)');
            showScreen('login');
            e.preventDefault();
        }
        
        if (e.target.id === 'switch-to-login' || e.target.closest('#switch-to-login')) {
            console.log('🔄 Switch to login clicked (delegated)');
            showScreen('login');
            e.preventDefault();
        }
        
        if (e.target.id === 'switch-to-signup' || e.target.closest('#switch-to-signup')) {
            console.log('🔄 Switch to signup clicked (delegated)');
            showScreen('signup');
            e.preventDefault();
        }
    });
    
    document.body.addEventListener('submit', function(e) {
        if (e.target.id === 'signup-form') {
            console.log('🔄 Signup form submitted (delegated)');
            handleSignup(e);
        }
        
        if (e.target.id === 'login-form') {
            console.log('🔄 Login form submitted (delegated)');
            handleLogin(e);
        }
    });
    
    console.log('✅ Critical event listeners setup');
}

// =============================================
// SCREEN MANAGEMENT
// =============================================
function ensureWelcomeScreenVisible() {
    try {
        const allScreens = document.querySelectorAll('.screen');
        allScreens.forEach(screen => {
            screen.classList.remove('active');
        });
        
        const welcomeScreen = Screens.welcome;
        if (welcomeScreen) {
            welcomeScreen.classList.add('active');
            console.log('✅ Welcome screen activated');
        } else {
            console.error('❌ Welcome screen not found');
        }
    } catch (error) {
        console.error('Error ensuring welcome screen visible:', error);
    }
}

function showScreen(screenName) {
    console.log('🔄 Attempting to show screen:', screenName);
    
    try {
        const screen = Screens[screenName];
        if (!screen) {
            console.error(`❌ Screen "${screenName}" not found`);
            return;
        }
        
        const allScreens = document.querySelectorAll('.screen');
        allScreens.forEach(s => {
            s.classList.remove('active');
        });
        
        screen.classList.add('active');
        console.log(`✅ Screen "${screenName}" shown successfully`);
        
        window.location.hash = screenName;
        
    } catch (error) {
        console.error(`❌ Error showing screen "${screenName}":`, error);
    }
}

function showView(viewName) {
    try {
        console.log('🔄 Showing view:', viewName);
        
        document.querySelectorAll('.app-view').forEach(view => {
            view.classList.remove('active');
        });
        
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            console.log(`✅ View "${viewName}" shown`);
            
            // Show AI indicator for AI chat
            if (viewName === 'ai-chat') {
                document.getElementById('ai-indicator').style.display = 'inline-block';
            } else {
                document.getElementById('ai-indicator').style.display = 'none';
            }
        } else {
            console.error(`❌ View "${viewName}" not found`);
        }
    } catch (error) {
        console.error('Error showing view:', error);
    }
}

// =============================================
// PROFILE FUNCTIONS
// =============================================
function updateProfilePreview() {
    try {
        const name = document.getElementById('signup-name').value.trim();
        const avatarPreview = document.getElementById('profile-avatar-preview');
        const namePreview = document.getElementById('profile-name-preview');
        
        if (avatarPreview && namePreview) {
            if (name) {
                avatarPreview.textContent = name.charAt(0).toUpperCase();
                namePreview.textContent = name;
            } else {
                avatarPreview.textContent = 'U';
                namePreview.textContent = 'User';
            }
        }
    } catch (error) {
        console.error('Error in updateProfilePreview:', error);
    }
}

function handleProfileImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showError('Image size should be less than 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        AppState.profileImage = file;
        AppState.profileImageUrl = e.target.result;
        
        const preview = document.getElementById('profile-image-preview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
        preview.querySelector('.upload-overlay').style.display = 'block';
        
        const signupAvatar = document.getElementById('profile-avatar-preview');
        if (signupAvatar) {
            signupAvatar.innerHTML = `<img src="${e.target.result}" alt="Profile" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        }
    };
    reader.readAsDataURL(file);
}

function handleEditAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showError('Image size should be less than 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const avatarPreview = document.getElementById('avatar-edit-preview');
        avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Profile">`;
        AppState.profileImage = file;
        AppState.profileImageUrl = e.target.result;
    };
    reader.readAsDataURL(file);
}

// =============================================
// EDIT PROFILE FUNCTIONS
// =============================================
function openEditProfile() {
    const modal = document.getElementById('edit-profile-modal');
    const supabase = SupabaseManager.getClient();
    
    if (!supabase || !AppState.currentUser) {
        showError('Please login to edit profile');
        return;
    }
    
    document.getElementById('edit-name').value = AppState.currentUser.name || '';
    document.getElementById('edit-username').value = AppState.currentUser.username || '';
    document.getElementById('edit-email').value = AppState.currentUser.email || '';
    document.getElementById('edit-phone').value = AppState.currentUser.phone || '';
    
    const avatarPreview = document.getElementById('avatar-edit-preview');
    if (AppState.currentUser.avatar_url) {
        avatarPreview.innerHTML = `<img src="${AppState.currentUser.avatar_url}" alt="Profile">`;
    } else {
        avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
    }
    
    modal.classList.add('active');
    switchEditProfileTab('basic');
}

function switchEditProfileTab(tabId) {
    document.querySelectorAll('.edit-profile-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        }
    });
    
    document.querySelectorAll('.edit-profile-section').forEach(section => {
        section.classList.remove('active');
        if (section.id === tabId + '-tab') {
            section.classList.add('active');
        }
    });
}

async function saveBasicInfo() {
    const supabase = SupabaseManager.getClient();
    if (!supabase || !AppState.currentUser) return;
    
    const name = document.getElementById('edit-name').value.trim();
    const username = document.getElementById('edit-username').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    
    if (!name || !username) {
        showError('Name and username are required');
        return;
    }
    
    const now = new Date();
    const lastUpdate = AppState.editProfileLastUpdate;
    if (lastUpdate && (now - new Date(lastUpdate)) < 30 * 24 * 60 * 60 * 1000) {
        showError('You can only change your name once per month');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                name: name,
                username: username,
                phone: phone || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', AppState.currentUser.id);
        
        if (error) throw error;
        
        AppState.currentUser.name = name;
        AppState.currentUser.username = username;
        AppState.currentUser.phone = phone;
        AppState.editProfileLastUpdate = now.toISOString();
        
        showSuccess('Profile updated successfully!');
        loadChats();
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showError('Failed to update profile: ' + error.message);
    }
}

async function saveSecurityInfo() {
    const supabase = SupabaseManager.getClient();
    if (!supabase || !AppState.currentUser) return;
    
    const email = document.getElementById('edit-email').value.trim();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    try {
        if (email && email !== AppState.currentUser.email) {
            const { error: emailError } = await supabase.auth.updateUser({
                email: email
            });
            
            if (emailError) throw emailError;
            
            showSuccess('Verification email sent to new address');
        }
        
        if (newPassword) {
            if (newPassword !== confirmPassword) {
                showError('New passwords do not match');
                return;
            }
            
            const { error: passwordError } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (passwordError) throw passwordError;
            
            showSuccess('Password updated successfully');
        }
        
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        
    } catch (error) {
        console.error('Error updating security:', error);
        showError('Failed to update security: ' + error.message);
    }
}

async function saveAvatar() {
    const supabase = SupabaseManager.getClient();
    if (!supabase || !AppState.currentUser || !AppState.profileImage) {
        showError('No image selected');
        return;
    }
    
    try {
        // For now, store as base64
        const { error } = await supabase
            .from('profiles')
            .update({
                avatar_url: AppState.profileImageUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', AppState.currentUser.id);
        
        if (error) throw error;
        
        AppState.currentUser.avatar_url = AppState.profileImageUrl;
        showSuccess('Profile picture updated!');
        
        updateProfileImageInUI();
        
    } catch (error) {
        console.error('Error updating avatar:', error);
        showError('Failed to update profile picture');
    }
}

function removeAvatar() {
    const supabase = SupabaseManager.getClient();
    if (!supabase || !AppState.currentUser) return;
    
    if (confirm('Remove profile picture?')) {
        const avatarPreview = document.getElementById('avatar-edit-preview');
        avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
        
        AppState.profileImage = null;
        AppState.profileImageUrl = null;
        
        supabase
            .from('profiles')
            .update({
                avatar_url: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', AppState.currentUser.id)
            .then(() => {
                AppState.currentUser.avatar_url = null;
                updateProfileImageInUI();
                showSuccess('Profile picture removed');
            })
            .catch(error => {
                console.error('Error removing avatar:', error);
                showError('Failed to remove profile picture');
            });
    }
}

function updateProfileImageInUI() {
    document.querySelectorAll('.chat-avatar, .user-avatar').forEach(avatar => {
        const name = AppState.currentUser?.name || 'U';
        avatar.textContent = name.charAt(0).toUpperCase();
    });
}

// =============================================
// PROFILE VIEWER
// =============================================
function viewFriendProfile() {
    if (!AppState.currentChat || !AppState.currentChat.partner) return;
    
    const partner = AppState.currentChat.partner;
    const modal = document.getElementById('profile-viewer-modal');
    
    document.getElementById('viewer-profile-name').textContent = partner.name || 'Unknown User';
    document.getElementById('viewer-profile-email').textContent = partner.email || 'No email';
    
    const profileImage = document.getElementById('viewer-profile-image');
    if (partner.avatar_url) {
        profileImage.innerHTML = `<img src="${partner.avatar_url}" alt="${partner.name}">`;
    } else {
        const initial = partner.name ? partner.name.charAt(0).toUpperCase() : 'U';
        profileImage.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(45deg, #667eea, #764ba2);color:white;font-size:4rem;">${initial}</div>`;
    }
    
    const statusElement = document.getElementById('viewer-profile-status');
    statusElement.textContent = partner.is_online ? 'Online' : `Last seen ${getTimeAgo(partner.last_seen)}`;
    statusElement.className = `profile-viewer-status ${partner.is_online ? 'status-online-badge' : 'status-offline-badge'}`;
    
    document.getElementById('message-profile-btn').onclick = () => {
        modal.classList.remove('active');
    };
    
    modal.classList.add('active');
}

// =============================================
// AI CHAT FUNCTIONS - UPDATED FOR OPENROUTER
// =============================================
async function sendAIMessage() {
    const input = document.getElementById('ai-message-input');
    const message = input?.value.trim();
    
    if (!message || AppState.isAITyping) return;
    
    if (input) input.value = '';
    
    addAIMessage(message, 'user');
    
    AppState.isAITyping = true;
    showAITypingIndicator();
    
    try {
        const response = await callOpenRouterAPI(message);
        
        removeAITypingIndicator();
        AppState.isAITyping = false;
        
        addAIMessage(response, 'ai');
        
        AppState.aiChatHistory.push({
            role: 'user',
            content: message
        }, {
            role: 'ai',
            content: response
        });
        
        if (AppState.aiChatHistory.length > 20) {
            AppState.aiChatHistory = AppState.aiChatHistory.slice(-20);
        }
        
    } catch (error) {
        console.error('AI Error:', error);
        removeAITypingIndicator();
        AppState.isAITyping = false;
        
        addAIMessage("Sorry, I'm having trouble connecting right now. Please try again later.", 'ai');
    }
}

async function callOpenRouterAPI(message) {
    // Prepare conversation history for context
    const conversationHistory = AppState.aiChatHistory.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));
    
    // Add current message
    conversationHistory.push({
        role: 'user',
        content: message
    });
    
    const response = await fetch(OPENROUTER_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_CONFIG.apiKey}`,
            'HTTP-Referer': window.location.origin, // Required by OpenRouter
            'X-Title': 'IsaHub Chat' // Optional: Your app name
        },
        body: JSON.stringify({
            model: OPENROUTER_CONFIG.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are IsaGPT, a friendly AI assistant for IsaHub chat app. You help users with questions, provide information, and assist with tasks. Be helpful, concise, and engaging. Keep responses conversational and natural.'
                },
                ...conversationHistory
            ],
            max_tokens: 500,
            temperature: 0.7,
            stream: false
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter API error:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        return data.choices[0].message.content.trim();
    } else {
        console.error('Invalid response from OpenRouter:', data);
        throw new Error('Invalid response from AI');
    }
}

function addAIMessage(content, sender) {
    const chatMessages = document.getElementById('ai-chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'sent' : 'received'}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">${content}</div>
        <div class="message-time">${time}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showAITypingIndicator() {
    const chatMessages = document.getElementById('ai-chat-messages');
    if (!chatMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message received typing';
    typingDiv.id = 'ai-typing-indicator';
    
    typingDiv.innerHTML = `
        <div class="message-content">
            <div class="loading-ai">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>
        <div class="message-time">Just now</div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeAITypingIndicator() {
    const typingIndicator = document.getElementById('ai-typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// =============================================
// PASSWORD STRENGTH
// =============================================
function updatePasswordStrength() {
    try {
        const password = document.getElementById('signup-password').value;
        const strengthBar = document.getElementById('password-strength-bar');
        
        if (strengthBar) {
            let strength = 0;
            let color = '#e74c3c';
            
            if (password.length >= 6) strength += 25;
            if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25;
            if (password.match(/\d/)) strength += 25;
            if (password.match(/[^a-zA-Z\d]/)) strength += 25;
            
            if (strength >= 75) {
                color = '#27ae60';
            } else if (strength >= 50) {
                color = '#f39c12';
            } else if (strength >= 25) {
                color = '#e67e22';
            }
            
            strengthBar.style.width = `${strength}%`;
            strengthBar.style.background = color;
        }
    } catch (error) {
        console.error('Error in updatePasswordStrength:', error);
    }
}

// =============================================
// AUTHENTICATION HANDLERS
// =============================================
async function handleSignup(e) {
    if (e) e.preventDefault();
    
    console.log('🔄 Starting signup process...');
    
    const supabase = SupabaseManager.getClient();
    if (!supabase) {
        showError('Application not initialized. Please refresh the page.');
        return;
    }
    
    const name = document.getElementById('signup-name')?.value.trim() || '';
    const username = document.getElementById('signup-username')?.value.trim() || '';
    const email = document.getElementById('signup-email')?.value.trim() || '';
    const phone = document.getElementById('signup-phone')?.value.trim() || '';
    const password = document.getElementById('signup-password')?.value || '';
    const confirmPassword = document.getElementById('signup-confirm-password')?.value || '';
    const termsAgreed = document.getElementById('terms-agree')?.checked;

    console.log('📝 Signup data:', { email, name, username });
    
    if (!termsAgreed) {
        showError('Please agree to the Terms of Service and Privacy Policy');
        return;
    }

    if (!email || !password || !confirmPassword) {
        showError('Please fill in all required fields');
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }

    const signupBtn = document.getElementById('signup-submit-btn');
    if (signupBtn) {
        signupBtn.disabled = true;
        signupBtn.textContent = 'Creating Account...';
    }
    
    try {
        console.log('🔄 Sending signup request to Supabase...');
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    username: username,
                    phone: phone,
                    profile_image: AppState.profileImageUrl
                }
            }
        });

        if (authError) {
            console.error('❌ Signup error:', authError);
            throw new Error(authError.message || 'Signup failed');
        }

        console.log('✅ Signup successful:', authData);
        
        if (authData.user) {
            showSuccess('Account created successfully! Please check your email for verification.');
            
            let profileLoaded = false;
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await loadCurrentUser(authData.user.id);
                if (AppState.currentUser) {
                    profileLoaded = true;
                    break;
                }
            }

            if (profileLoaded) {
                console.log('✅ Profile loaded, showing main app');
                
                if (AppState.profileImageUrl) {
                    await supabase
                        .from('profiles')
                        .update({
                            avatar_url: AppState.profileImageUrl
                        })
                        .eq('id', authData.user.id);
                }
                
                showScreen('mainApp');
                await loadChats();
                setupRealtimeSubscriptions();
                
                document.getElementById('ai-indicator').style.display = 'inline-block';
            } else {
                console.log('⚠️ Profile not loaded, showing login screen');
                showError('Profile creation delayed. Please try logging in manually.');
                showScreen('login');
            }
        } else {
            showError('Signup failed - no user data returned');
        }
    } catch (error) {
        console.error('❌ Signup exception:', error);
        showError(error.message || 'Signup failed. Please try again.');
    } finally {
        if (signupBtn) {
            signupBtn.disabled = false;
            signupBtn.textContent = 'Create Account';
        }
    }
}

async function handleLogin(e) {
    if (e) e.preventDefault();
    
    console.log('🔄 Starting login process...');
    
    const supabase = SupabaseManager.getClient();
    if (!supabase) {
        showError('Application not initialized. Please refresh the page.');
        return;
    }
    
    const email = document.getElementById('login-email')?.value.trim() || '';
    const password = document.getElementById('login-password')?.value || '';

    console.log('📝 Login attempt for:', email);
    
    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }

    const loginBtn = document.getElementById('login-submit-btn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing In...';
    }
    
    try {
        console.log('🔄 Sending login request to Supabase...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) {
            console.error('❌ Login error:', authError);
            throw new Error(authError.message || 'Login failed');
        }

        console.log('✅ Login successful:', authData);
        
        if (authData.user) {
            await supabase
                .from('profiles')
                .update({
                    is_online: true,
                    last_seen: new Date().toISOString()
                })
                .eq('id', authData.user.id);

            await loadCurrentUser(authData.user.id);
            showSuccess('Successfully logged in!');
            showScreen('mainApp');
            await loadChats();
            setupRealtimeSubscriptions();
            
            document.getElementById('ai-indicator').style.display = 'inline-block';
        } else {
            showError('Login failed - no user data returned');
        }
    } catch (error) {
        console.error('❌ Login exception:', error);
        showError(error.message || 'Login failed. Please check your credentials and try again.');
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    }
}

// =============================================
// USER MANAGEMENT
// =============================================
async function loadCurrentUser(userId) {
    const supabase = SupabaseManager.getClient();
    if (!supabase) return null;
    
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error loading user profile:', error);
            return null;
        }

        AppState.currentUser = profile;
        console.log('✅ Current user loaded:', profile.email);
        
        AppState.editProfileLastUpdate = profile.updated_at;
        
        return profile;
    } catch (error) {
        console.error('Error in loadCurrentUser:', error);
        return null;
    }
}

// =============================================
// REAL-TIME SUBSCRIPTIONS
// =============================================
function setupRealtimeSubscriptions() {
    const supabase = SupabaseManager.getClient();
    if (!AppState.currentUser || !supabase) return;

    try {
        if (AppState.messageSubscription) {
            supabase.removeChannel(AppState.messageSubscription);
        }
        if (AppState.onlineStatusSubscription) {
            supabase.removeChannel(AppState.onlineStatusSubscription);
        }

        AppState.messageSubscription = supabase
            .channel('messages-' + AppState.currentUser.id)
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages',
                    filter: `receiver_id=eq.${AppState.currentUser.id}`
                }, 
                (payload) => {
                    console.log('New message received:', payload);
                    if (AppState.currentChat && payload.new.sender_id === AppState.currentChat.partner.id) {
                        displayMessage(payload.new);
                        markMessageAsRead(payload.new.id);
                    }
                    loadChats();
                }
            )
            .subscribe();

        AppState.onlineStatusSubscription = supabase
            .channel('online-status-' + AppState.currentUser.id)
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => {
                    if (AppState.currentChat && payload.new.id === AppState.currentChat.partner.id) {
                        updateChatUserStatus(payload.new);
                    }
                    loadChats();
                }
            )
            .subscribe();
            
        console.log('✅ Real-time subscriptions setup');
    } catch (error) {
        console.error('❌ Error setting up real-time subscriptions:', error);
    }
}

// =============================================
// CHAT FUNCTIONS
// =============================================
async function loadChats() {
    const supabase = SupabaseManager.getClient();
    if (!AppState.currentUser || !supabase) {
        console.log('❌ No current user found or Supabase not initialized');
        return;
    }

    const chatsList = document.getElementById('chats-list');
    if (!chatsList) return;
    
    try {
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${AppState.currentUser.id},receiver_id.eq.${AppState.currentUser.id}`)
            .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        const partnerIds = new Set();
        if (messages) {
            messages.forEach(msg => {
                if (msg.sender_id !== AppState.currentUser.id) partnerIds.add(msg.sender_id);
                if (msg.receiver_id !== AppState.currentUser.id) partnerIds.add(msg.receiver_id);
            });
        }

        if (partnerIds.size === 0) {
            chatsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>No Chats Yet</h3>
                    <p>Start a conversation by adding friends and sending them messages</p>
                    <button class="btn-primary" onclick="showView('add-friends')">
                        <i class="fas fa-user-plus"></i> Add Friends
                    </button>
                </div>
            `;
            return;
        }

        const { data: partners, error: partnersError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', Array.from(partnerIds));

        if (partnersError) throw partnersError;

        const userChats = Array.from(partnerIds).map(partnerId => {
            const partner = partners.find(p => p.id === partnerId) || { id: partnerId, name: 'Unknown User' };
            const chatMessages = messages.filter(msg => 
                (msg.sender_id === AppState.currentUser.id && msg.receiver_id === partnerId) ||
                (msg.sender_id === partnerId && msg.receiver_id === AppState.currentUser.id)
            );
            const lastMessage = chatMessages[chatMessages.length - 1];
            const unreadCount = chatMessages.filter(m => 
                m.receiver_id === AppState.currentUser.id && m.status === 'delivered'
            ).length;

            return {
                id: `chat_${AppState.currentUser.id}_${partnerId}`,
                partner: partner,
                messages: chatMessages,
                last_message: lastMessage,
                unread_count: unreadCount
            };
        }).sort((a, b) => {
            const timeA = a.last_message ? new Date(a.last_message.created_at) : new Date(0);
            const timeB = b.last_message ? new Date(b.last_message.created_at) : new Date(0);
            return timeB - timeA;
        });

        chatsList.innerHTML = '';
        userChats.forEach(chat => {
            const lastMessage = chat.last_message;
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            
            if (chat.partner.avatar_url) {
                chatItem.innerHTML = `
                    <div class="chat-avatar">
                        <img src="${chat.partner.avatar_url}" alt="${chat.partner.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">
                        ${chat.partner.is_online ? '<div class="online-indicator"></div>' : ''}
                    </div>
                    <div class="chat-info">
                        <div class="chat-header">
                            <div class="chat-name">${chat.partner.name || 'Unknown User'}</div>
                            <div class="chat-time">${lastMessage ? formatTime(lastMessage.created_at) : ''}</div>
                        </div>
                        <div class="chat-last-message">
                            ${lastMessage ? (lastMessage.content.length > 30 ? lastMessage.content.substring(0, 30) + '...' : lastMessage.content) : 'No messages yet'}
                            ${chat.unread_count > 0 ? `<div class="unread-badge">${chat.unread_count}</div>` : ''}
                        </div>
                    </div>
                `;
            } else {
                chatItem.innerHTML = `
                    <div class="chat-avatar">
                        ${chat.partner.name ? chat.partner.name.charAt(0) : 'U'}
                        ${chat.partner.is_online ? '<div class="online-indicator"></div>' : ''}
                    </div>
                    <div class="chat-info">
                        <div class="chat-header">
                            <div class="chat-name">${chat.partner.name || 'Unknown User'}</div>
                            <div class="chat-time">${lastMessage ? formatTime(lastMessage.created_at) : ''}</div>
                        </div>
                        <div class="chat-last-message">
                            ${lastMessage ? (lastMessage.content.length > 30 ? lastMessage.content.substring(0, 30) + '...' : lastMessage.content) : 'No messages yet'}
                            ${chat.unread_count > 0 ? `<div class="unread-badge">${chat.unread_count}</div>` : ''}
                        </div>
                    </div>
                `;
            }
            
            chatItem.addEventListener('click', () => openChat(chat));
            chatsList.appendChild(chatItem);
        });
    } catch (error) {
        console.error('Error loading chats:', error);
        chatsList.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading chats: ${error.message}</p>
            </div>
        `;
    }
}

function formatTime(timestamp) {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString();
    } catch (error) {
        return '';
    }
}

// =============================================
// FRIEND SEARCH
// =============================================
async function searchUsers() {
    const supabase = SupabaseManager.getClient();
    const usersList = document.getElementById('users-list');
    
    if (!AppState.currentUser || !AppState.currentUser.id || !supabase) {
        console.log('❌ Current user not loaded properly or Supabase not initialized');
        if (usersList) {
            usersList.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Please log in to search for friends</p>
                </div>
            `;
        }
        return;
    }

    const searchTerm = document.getElementById('friend-search')?.value.trim() || '';
    const searchTypeElement = document.querySelector('.search-option-btn.active');
    if (!searchTypeElement) return;
    
    const searchType = searchTypeElement.dataset.type;

    if (searchTerm.length < 3) {
        if (usersList) {
            usersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Find Friends</h3>
                    <p>Enter at least 3 characters to search</p>
                </div>
            `;
        }
        return;
    }

    if (usersList) usersList.innerHTML = '<div class="loading">Searching...</div>';

    try {
        let query = supabase
            .from('profiles')
            .select('*')
            .neq('id', AppState.currentUser.id);

        if (searchType === 'email') {
            query = query.ilike('email', `%${searchTerm}%`);
        } else {
            query = query.ilike('phone', `%${searchTerm}%`);
        }

        const { data: users, error } = await query;

        if (error) throw error;

        if (users && users.length > 0) {
            await displayFoundUsers(users);
        } else {
            if (usersList) {
                usersList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-slash"></i>
                        <h3>No Users Found</h3>
                        <p>No users found with that ${searchType === 'email' ? 'email' : 'phone number'}</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error searching users:', error);
        if (usersList) {
            usersList.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error searching users: ${error.message}</p>
                </div>
            `;
        }
    }
}

async function displayFoundUsers(users) {
    const supabase = SupabaseManager.getClient();
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    usersList.innerHTML = '';

    let existingMessages = [];
    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('sender_id, receiver_id')
            .or(`sender_id.eq.${AppState.currentUser.id},receiver_id.eq.${AppState.currentUser.id}`);

        if (!error) {
            existingMessages = messages || [];
        }
    } catch (error) {
        console.error('Error checking existing chats:', error);
    }

    users.forEach(user => {
        const hasExistingChat = existingMessages.some(msg => 
            (msg.sender_id === AppState.currentUser.id && msg.receiver_id === user.id) ||
            (msg.sender_id === user.id && msg.receiver_id === AppState.currentUser.id)
        );
            
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        if (user.avatar_url) {
            userItem.innerHTML = `
                <div class="user-avatar">
                    <img src="${user.avatar_url}" alt="${user.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">
                    ${user.is_online ? '<div class="online-indicator"></div>' : ''}
                </div>
                <div class="user-info">
                    <div class="user-name">${user.name || 'Unknown User'}</div>
                    <div class="user-details">
                        ${user.email || 'No email'}
                        <br>
                        <small>${user.is_online ? 'Online' : `Last seen ${getTimeAgo(user.last_seen)}`}</small>
                    </div>
                </div>
                <button class="add-friend-btn ${hasExistingChat ? 'added' : ''}" 
                        data-user-id="${user.id}">
                    ${hasExistingChat ? 'Message' : 'Add Friend'}
                </button>
            `;
        } else {
            userItem.innerHTML = `
                <div class="user-avatar">
                    ${user.name ? user.name.charAt(0) : 'U'}
                    ${user.is_online ? '<div class="online-indicator"></div>' : ''}
                </div>
                <div class="user-info">
                    <div class="user-name">${user.name || 'Unknown User'}</div>
                    <div class="user-details">
                        ${user.email || 'No email'}
                        <br>
                        <small>${user.is_online ? 'Online' : `Last seen ${getTimeAgo(user.last_seen)}`}</small>
                    </div>
                </div>
                <button class="add-friend-btn ${hasExistingChat ? 'added' : ''}" 
                        data-user-id="${user.id}">
                    ${hasExistingChat ? 'Message' : 'Add Friend'}
                </button>
            `;
        }

        const button = userItem.querySelector('.add-friend-btn');
        if (hasExistingChat) {
            button.addEventListener('click', () => openChatFromSearch(user.id));
        } else {
            button.addEventListener('click', () => addFriend(user.id));
        }

        usersList.appendChild(userItem);
    });
}

// =============================================
// ADD FRIEND
// =============================================
async function addFriend(userId) {
    const supabase = SupabaseManager.getClient();
    try {
        console.log('🔄 Adding friend with ID:', userId);
        
        const { data: friend, error: friendError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (friendError) {
            console.error('❌ Error fetching friend profile:', friendError);
            throw new Error('User not found');
        }

        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
                sender_id: AppState.currentUser.id,
                receiver_id: friend.id,
                content: `Hi ${friend.name}! I'd like to connect with you on Isaichat.`,
                type: 'text',
                status: 'sent'
            })
            .select()
            .single();

        if (messageError) {
            console.error('❌ Error creating welcome message:', messageError);
            
            if (messageError.message.includes('friend_requests') || messageError.code === 'PGRST116') {
                const { error: simpleError } = await supabase
                    .from('messages')
                    .insert({
                        sender_id: AppState.currentUser.id,
                        receiver_id: friend.id,
                        content: `Hi ${friend.name}! I'd like to connect with you on Isaichat.`,
                        type: 'text',
                        status: 'sent'
                    });
                
                if (simpleError) {
                    throw new Error('Failed to send friend request: ' + simpleError.message);
                }
            } else {
                throw new Error('Failed to send friend request: ' + messageError.message);
            }
        }

        console.log('✅ Friend added successfully:', friend.name);
        showSuccess(`Friend request sent to ${friend.name}!`);
        
        const buttons = document.querySelectorAll(`.add-friend-btn[data-user-id="${userId}"]`);
        buttons.forEach(btn => {
            btn.textContent = 'Message';
            btn.classList.add('added');
            btn.removeEventListener('click', addFriend);
            btn.addEventListener('click', () => openChatFromSearch(userId));
        });

        await loadChats();
        
        setTimeout(() => {
            openChatFromSearch(userId);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error adding friend:', error);
        showError('Failed to send friend request: ' + error.message);
    }
}

async function openChatFromSearch(userId) {
    const supabase = SupabaseManager.getClient();
    try {
        const { data: friend, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${AppState.currentUser.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${AppState.currentUser.id})`)
            .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        const chat = {
            id: `chat_${AppState.currentUser.id}_${friend.id}`,
            partner: friend,
            messages: messages || []
        };

        openChat(chat);
        showView('chat');
    } catch (error) {
        console.error('Error opening chat:', error);
        showError('Failed to open chat');
    }
}

// =============================================
// CHAT MESSAGES
// =============================================
async function openChat(chat) {
    AppState.currentChat = chat;
    document.getElementById('chat-with-name').textContent = chat.partner.name;
    
    // Update chat avatar with image if available
    const chatAvatarText = document.getElementById('chat-avatar-text');
    const chatAvatarContainer = document.getElementById('chat-avatar-container');
    
    if (chat.partner.avatar_url) {
        chatAvatarText.style.display = 'none';
        if (!chatAvatarContainer.querySelector('img')) {
            const img = document.createElement('img');
            img.src = chat.partner.avatar_url;
            img.alt = chat.partner.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            chatAvatarContainer.appendChild(img);
        }
    } else {
        chatAvatarText.style.display = 'flex';
        chatAvatarText.textContent = chat.partner.name.charAt(0);
        const existingImg = chatAvatarContainer.querySelector('img');
        if (existingImg) existingImg.remove();
    }
    
    updateChatUserStatus(chat.partner);
    showView('chat');
    await displayMessages();
    
    await markMessagesAsRead(chat.partner.id);
}

async function displayMessages() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    if (!AppState.currentChat.messages || AppState.currentChat.messages.length === 0) {
        chatMessages.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment"></i>
                <h3>No Messages</h3>
                <p>Send a message to start the conversation</p>
            </div>
        `;
        return;
    }

    chatMessages.innerHTML = '';
    AppState.currentChat.messages.forEach(message => {
        displayMessage(message);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    const supabase = SupabaseManager.getClient();
    const content = document.getElementById('message-input')?.value.trim() || '';
    if (!content || !AppState.currentChat) return;

    try {
        const { data: newMessage, error } = await supabase
            .from('messages')
            .insert([
                {
                    sender_id: AppState.currentUser.id,
                    receiver_id: AppState.currentChat.partner.id,
                    content: content,
                    type: 'text',
                    status: 'sent'
                }
            ])
            .select()
            .single();

        if (error) throw error;

        if (document.getElementById('message-input')) {
            document.getElementById('message-input').value = '';
        }

        const emptyState = document.querySelector('#chat-messages .empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        if (!AppState.currentChat.messages) AppState.currentChat.messages = [];
        AppState.currentChat.messages.push(newMessage);
        displayMessage(newMessage);
        
        await loadChats();
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message');
    }
}

function displayMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    const isSent = message.sender_id === AppState.currentUser.id;
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">${message.content}</div>
        <div class="message-time">${time}</div>
        ${isSent ? `<div class="message-status">${message.status}</div>` : ''}
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function markMessagesAsRead(partnerId) {
    const supabase = SupabaseManager.getClient();
    try {
        const { error } = await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('sender_id', partnerId)
            .eq('receiver_id', AppState.currentUser.id)
            .eq('status', 'delivered');

        if (error) throw error;

        await loadChats();
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

async function markMessageAsRead(messageId) {
    const supabase = SupabaseManager.getClient();
    try {
        const { error } = await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('id', messageId);

        if (error) throw error;
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

function updateChatUserStatus(user) {
    const statusElement = document.getElementById('chat-status');
    const onlineIndicator = document.getElementById('chat-online-indicator');
    
    if (statusElement && onlineIndicator) {
        if (user.is_online) {
            statusElement.textContent = 'online';
            statusElement.className = 'status-online';
            onlineIndicator.style.display = 'block';
        } else {
            const lastSeen = getTimeAgo(user.last_seen);
            statusElement.textContent = `last seen ${lastSeen}`;
            statusElement.className = 'status-offline';
            onlineIndicator.style.display = 'none';
        }
    }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================
function getTimeAgo(timestamp) {
    try {
        if (!timestamp) return 'a long time ago';
        
        const now = new Date();
        const lastSeen = new Date(timestamp);
        const diffMs = now - lastSeen;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return lastSeen.toLocaleDateString();
    } catch (error) {
        return 'a while ago';
    }
}

async function handleLogout() {
    const supabase = SupabaseManager.getClient();
    if (confirm('Are you sure you want to logout?')) {
        try {
            if (AppState.currentUser) {
                await supabase
                    .from('profiles')
                    .update({
                        is_online: false,
                        last_seen: new Date().toISOString()
                    })
                    .eq('id', AppState.currentUser.id);
            }

            if (AppState.messageSubscription) {
                supabase.removeChannel(AppState.messageSubscription);
            }
            if (AppState.onlineStatusSubscription) {
                supabase.removeChannel(AppState.onlineStatusSubscription);
            }

            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            AppState.currentUser = null;
            AppState.currentChat = null;
            AppState.messageSubscription = null;
            AppState.onlineStatusSubscription = null;
            AppState.initialized = false;
            AppState.eventListenersSetup = false;
            AppState.profileImage = null;
            AppState.profileImageUrl = null;
            AppState.aiChatHistory = [];
            AppState.isAITyping = false;
            
            SupabaseManager.reset();
            
            showScreen('welcome');
            
            const signupForm = document.getElementById('signup-form');
            const loginForm = document.getElementById('login-form');
            if (signupForm) signupForm.reset();
            if (loginForm) loginForm.reset();
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            const chatsNav = document.querySelector('.nav-item[data-view="chats"]');
            if (chatsNav) chatsNav.classList.add('active');
            showView('chats');

            showSuccess('Successfully logged out!');
        } catch (error) {
            console.error('Error during logout:', error);
            showError('Error during logout');
        }
    }
}

function showError(message) {
    try {
        document.querySelectorAll('.error').forEach(el => el.remove());
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        
        const currentForm = document.querySelector('.screen.active form');
        if (currentForm) {
            currentForm.insertBefore(errorDiv, currentForm.firstChild);
        } else {
            const appViews = document.querySelector('.app-views');
            if (appViews) {
                appViews.insertBefore(errorDiv, appViews.firstChild);
                setTimeout(() => errorDiv.remove(), 5000);
            }
        }
    } catch (error) {
        console.error('Error showing error message:', error);
    }
}

function showSuccess(message) {
    try {
        document.querySelectorAll('.success').forEach(el => el.remove());
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        const currentForm = document.querySelector('.screen.active form');
        if (currentForm) {
            currentForm.insertBefore(successDiv, currentForm.firstChild);
        } else {
            const appViews = document.querySelector('.app-views');
            if (appViews) {
                appViews.insertBefore(successDiv, appViews.firstChild);
                setTimeout(() => successDiv.remove(), 5000);
            }
        }
    } catch (error) {
        console.error('Error showing success message:', error);
    }
}

// =============================================
// GLOBAL FUNCTIONS
// =============================================
window.showView = showView;

console.log('🎯 IsaHub - Real-Time Chat Ready!');
console.log('📱 Features: Real-time messaging, user profiles, online status, friend search, AI Assistant, Dark Mode, Profile Pictures');