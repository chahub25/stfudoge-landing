// File: chat.js (Client-Side Logic - v11 LAZY INIT)
// Purpose: Initialize Wallet only on button click. Fix count ReferenceError.

console.log("chat.js script started - v11 LAZY INIT");

// --- Configuration ---
const WALLETCONNECT_PROJECT_ID = '9d4b5847e95ec6872d7ee4d791ee2640'; // Included as requested
const TOKEN_CONTRACT_ADDRESS = '0xd8d01A667A8fEeF10077c61018b4F8fA533703eD';
const CHAIN_ID = 56;
const CHAIN_RPC_URL = 'https://bsc.publicnode.com';
const TOKEN_DECIMALS = 18;
const MAX_FREE_MESSAGES = 50;
const FREE_USER_MODEL = "mistralai/mistral-7b-instruct:free";
const VERIFIED_USER_MODEL = "openai/gpt-3.5-turbo";
console.log("v11 LAZY: Using Free Model:", FREE_USER_MODEL);
console.log("v11 LAZY: Using WC Project ID:", WALLETCONNECT_PROJECT_ID);

// --- DOM Elements ---
let chatWindow, userInput, sendButton, connectWalletButton, buyStfuLink, statusIndicator, messageLimitIndicator, themeToggleButton, easterEggTrigger, currentYearSpan;
try { /* ... same as v10 ... */
    chatWindow = document.getElementById('chat-window'); userInput = document.getElementById('user-input'); sendButton = document.getElementById('send-button'); connectWalletButton = document.getElementById('connect-wallet-button'); buyStfuLink = document.getElementById('buy-stfu-link'); statusIndicator = document.getElementById('status-indicator'); messageLimitIndicator = document.getElementById('message-limit-indicator'); themeToggleButton = document.getElementById('theme-toggle-button'); easterEggTrigger = document.querySelector('.easter-egg-trigger'); currentYearSpan = document.getElementById('current-year');
    if (!chatWindow || !userInput || !sendButton || !connectWalletButton || !statusIndicator || !messageLimitIndicator || !themeToggleButton) { console.warn("v11 LAZY: One or more expected DOM elements were not found!");} console.log("v11 LAZY: DOM elements obtained/checked");
} catch (e) { console.error("v11 LAZY: Error obtaining DOM elements:", e); }

// --- Application State ---
let web3Modal = null; // Start as null, initialize on demand
let ethersProvider = null;
let signer = null;
let userAddress = null;
let isVerified = false;
let conversationHistory = [];
const MESSAGE_COUNT_KEY = 'stfudoge_messageCount'; const LAST_RESET_KEY = 'stfudoge_lastReset'; const THEME_KEY = 'stfudoge_theme';
console.log("v11 LAZY: App state initialized");

// --- Minimal ABI ---
const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];

// --- Initialization ---
try {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("v11 LAZY: DOMContentLoaded event fired");

        // *** Wallet Initialization NOT called here anymore ***
        console.log("v11 LAZY: Skipping automatic wallet initialization.");
        if(statusIndicator) statusIndicator.textContent = "Connect Wallet to Start"; // More appropriate initial status

        // Load other parts
        loadThemePreference();
        setupEventListeners();
        initializeChat();
        updateMessageLimitIndicator(); // Call this to show initial message count
        updateCurrentYear();
        console.log("v11 LAZY: Initial page setup complete (Wallet not initialized yet).");
    });
} catch (e) { console.error("v11 LAZY: Error setting up DOMContentLoaded listener:", e); }


// --- Web3Modal & Wallet Connection ---

// This function now attempts to initialize *and* connect
async function connectAndInitializeWallet() {
    console.log("v11 LAZY ConnectWallet: Button clicked.");

    // 1. Initialize if not already done
    if (!web3Modal) {
        console.log("v11 LAZY ConnectWallet: web3Modal not initialized. Attempting initialization...");
        if (statusIndicator) { statusIndicator.textContent = "Initializing Wallet System..."; statusIndicator.className = ''; }

        // Check if libraries are loaded *now*
         if (typeof window.Web3Modal === 'undefined' || typeof window.Web3Modal.Ethers5 === 'undefined' || typeof window.ethers === 'undefined') {
            console.error("v11 LAZY ConnectWallet: Web3Modal/Ethers libs not loaded when needed!");
            if (statusIndicator) { statusIndicator.textContent = "Wallet Error (Libs Missing)"; statusIndicator.className = 'denied'; }
            addMessageToChat("Wallet libraries failed to load. Try refreshing maybe?", "system");
            return; // Stop if libs aren't there
        }
         console.log("v11 LAZY ConnectWallet: Libraries seem loaded.");

         // Try creating the adapter
        try {
            const { Ethers5Adapter } = window.Web3Modal.Ethers5;
            const chains = [{ chainId: CHAIN_ID, name: 'BNB Smart Chain', currency: 'BNB', explorerUrl: 'https://bscscan.com', rpcUrl: CHAIN_RPC_URL }];
            const ethersConfig = { ethers: window.ethers, provider: new window.ethers.providers.JsonRpcProvider(CHAIN_RPC_URL) };
            const modalConfig = {
                defaultChain: chains[0], ethersConfig: ethersConfig, chains: chains, projectId: WALLETCONNECT_PROJECT_ID, enableAnalytics: false,
                metadata: { name: 'STFUDoge Chat', description: 'Chat with the STFUDoge bot', url: window.location.href, icons: [window.location.origin + '/assets/STFUDoge_Favicon.jpg'] }
            };
            console.log("v11 LAZY ConnectWallet: Creating Ethers5Adapter...");
            web3Modal = new Ethers5Adapter(modalConfig); // Assign global web3Modal
            console.log("v11 LAZY ConnectWallet: Ethers5Adapter creation attempt finished. web3Modal object:", web3Modal);
            if (!web3Modal) { throw new Error("Adapter creation resulted in null object."); }
             console.log("v11 LAZY ConnectWallet: Initialization successful.");
            if (statusIndicator) { statusIndicator.textContent = "Wallet System Ready. Connecting..."; } // Update status

        } catch (error) {
            console.error("v11 LAZY ConnectWallet: Error during Ethers5Adapter creation:", error);
            if (statusIndicator) { statusIndicator.textContent = "Wallet init failed (Adapter Error)"; statusIndicator.className = 'denied'; }
            addMessageToChat("Error initializing wallet connection adapter. " + error.message, "system");
            web3Modal = null; // Reset on failure
            return; // Stop if initialization failed
        }
    } else {
         console.log("v11 LAZY ConnectWallet: web3Modal already initialized.");
    }

    // 2. Proceed with Connection attempt (only if web3Modal is now valid)
    if (statusIndicator) { statusIndicator.textContent = "Connecting wallet..."; statusIndicator.className = ''; }
    console.log("v11 LAZY ConnectWallet: Opening wallet connection modal...");
    try {
        if (connectWalletButton) connectWalletButton.disabled = true;
        const modalProvider = await web3Modal.connect();
        if (!modalProvider) { throw new Error("Wallet connection cancelled or failed."); }
        console.log("v11 LAZY ConnectWallet: Modal provider obtained.");
        ethersProvider = new ethers.providers.Web3Provider(modalProvider);
        signer = ethersProvider.getSigner();
        userAddress = await signer.getAddress();
        console.log("v11 LAZY ConnectWallet: Wallet Connected. Address:", userAddress);
        if (connectWalletButton) connectWalletButton.textContent = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
        if (statusIndicator) statusIndicator.textContent = "Wallet connected. Verifying $STFU...";
        await checkTokenBalance(); // Check balance immediately
    } catch (error) {
        console.error("v11 LAZY ConnectWallet: Error during connection:", error);
        let errorMsg = "Wallet connection failed.";
        if (error.message?.includes("User closed modal") || error.message?.includes("Connection declined")) { errorMsg = "Wallet connection cancelled."; }
        else if (error.message?.includes("rejected")) { errorMsg = "Connection request rejected."; }
        else { console.error("v11 LAZY ConnectWallet: Raw connection error:", error); }

        if (statusIndicator) { statusIndicator.textContent = errorMsg; statusIndicator.className = 'denied'; }
        addMessageToChat(errorMsg + " much reject. wow.", "system");
        userAddress = null; isVerified = false;
        if (connectWalletButton) { connectWalletButton.textContent = "Connect Wallet"; connectWalletButton.disabled = false; } // Re-enable button
        updateMessageLimitIndicator();
    }
}

// --- checkTokenBalance function ---
// (No significant changes needed, uses global vars set by connectWallet)
async function checkTokenBalance() { /* ... same as v10 ... */ console.log("v11 LAZY CheckTokenBalance: Called..."); /*...*/ }

// --- initializeChat function ---
// (No changes needed)
function initializeChat() { /* ... */ }

// --- setupEventListeners function ---
// Now links the button directly to the combined init/connect function
function setupEventListeners() {
    console.log("v11 LAZY SetupEventListeners: Attaching listeners...");
    try {
        if (sendButton && userInput) { sendButton.addEventListener('click', handleUserInput); userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !sendButton.disabled) handleUserInput(); }); console.log("v11 LAZY SetupEventListeners: Chat listeners attached."); } else { console.error("v11 LAZY SetupEventListeners: Chat input/button not found!"); }
        // *** Connect button now calls the combined function ***
        if (connectWalletButton) { connectWalletButton.addEventListener('click', connectAndInitializeWallet); console.log("v11 LAZY SetupEventListeners: Wallet connect listener attached."); } else { console.error("v11 LAZY SetupEventListeners: Connect wallet button not found!"); }
        if (themeToggleButton) { themeToggleButton.addEventListener('click', toggleTheme); console.log("v11 LAZY SetupEventListeners: Theme toggle listener attached."); } else { console.error("v11 LAZY SetupEventListeners: Theme toggle button not found!"); }
        if (easterEggTrigger) { easterEggTrigger.addEventListener('click', triggerEasterEgg); console.log("v11 LAZY SetupEventListeners: Easter egg listener attached."); } else { console.warn("v11 LAZY SetupEventListeners: Easter egg trigger not found."); }
    } catch(error) { console.error("v11 LAZY SetupEventListeners: CRITICAL ERROR attaching event listeners:", error); addMessageToChat("Fatal Error: UI could not be initialized...", "system"); }
    console.log("v11 LAZY SetupEventListeners: Finished attaching listeners.");
}

// --- updateCurrentYear function ---
// (No changes needed)
function updateCurrentYear() { /* ... */ }

// --- handleUserInput function ---
// (No changes needed)
function handleUserInput() { /* ... */ }

// --- getBotResponse function ---
// (No changes needed)
async function getBotResponse(userMessage) { /* ... */ }

// --- generateMemePlaceholder function ---
// (No changes needed)
function generateMemePlaceholder(userMsg, botReply) { /* ... */ }

// --- addMessageToChat function ---
// (No changes needed)
function addMessageToChat(text, sender, imageUrl = null) { /* ... */ }

// --- enableInput function ---
// (No changes needed)
function enableInput() { /* ... */ }

// --- Message Limiting functions ---
function getTodayDateString() { return new Date().toISOString().split('T')[0]; }
function getMessageCount() {
    const today = getTodayDateString(); const lastReset = localStorage.getItem(LAST_RESET_KEY); let count = 0;
    if (lastReset === today) count = parseInt(localStorage.getItem(MESSAGE_COUNT_KEY) || '0', 10);
    else { localStorage.setItem(MESSAGE_COUNT_KEY, '0'); localStorage.setItem(LAST_RESET_KEY, today); count = 0; console.log("v11 LAZY GetMessageCount: Message count reset."); }
    return { count, limitReached: count >= MAX_FREE_MESSAGES };
 }
function incrementMessageCount() { /*...*/ const { count } = getMessageCount(); const newCount = count + 1; localStorage.setItem(MESSAGE_COUNT_KEY, newCount.toString()); console.log(`v11 LAZY IncrementMessageCount: Count incremented to ${newCount}`); }
// ** FIX for ReferenceError: Avoid destructuring **
function updateMessageLimitIndicator() {
    console.log("v11 LAZY UpdateMessageLimitIndicator: Updating indicator. Verified:", isVerified);
    if(!messageLimitIndicator) { console.error("v11 LAZY UpdateMessageLimitIndicator: Indicator element not found!"); return; }
    if (isVerified) {
        messageLimitIndicator.textContent = 'Unlimited Messages. such VIP. wow.';
    } else {
        if (typeof getMessageCount === "function") {
            const messageData = getMessageCount(); // Get the object
            const count = messageData.count; // Access property directly
            const remaining = Math.max(0, MAX_FREE_MESSAGES - count);
            messageLimitIndicator.textContent = `Messages remaining: ${remaining}`;
        } else {
             console.error("v11 LAZY UpdateMessageLimitIndicator: getMessageCount is not defined!");
             messageLimitIndicator.textContent = `Messages remaining: ERROR`;
        }
    }
    messageLimitIndicator.style.display = 'block';
}
function displayLimitReachedMessage() { /*...*/ }

// --- Theme Toggling ---
function loadThemePreference() { /*...*/ }
function toggleTheme() { /*...*/ console.log("v11 LAZY ToggleTheme: Button clicked..."); try { /*...*/ } catch (error) { /*...*/ } }

// --- Easter Egg ---
function triggerEasterEgg() { /*...*/ }

console.log("v11 LAZY: chat.js script fully parsed.");
