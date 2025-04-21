// File: chat.js (Client-Side Logic - v10 DEBUGGING - Wallet Init Re-enabled)
// Purpose: Re-enable wallet init to capture specific errors.

console.log("chat.js script started - v10 DEBUG Wallet Init Enabled");

// --- Configuration ---
const WALLETCONNECT_PROJECT_ID = '9d4b5847e95ec6872d7ee4d791ee2640'; // Included as requested
const TOKEN_CONTRACT_ADDRESS = '0xd8d01A667A8fEeF10077c61018b4F8fA533703eD';
const CHAIN_ID = 56;
const CHAIN_RPC_URL = 'https://bsc.publicnode.com';
const TOKEN_DECIMALS = 18;
const MAX_FREE_MESSAGES = 50;
const FREE_USER_MODEL = "mistralai/mistral-7b-instruct:free";
const VERIFIED_USER_MODEL = "openai/gpt-3.5-turbo";
console.log("v10 DEBUG: Using Free Model:", FREE_USER_MODEL);
console.log("v10 DEBUG: Using WC Project ID:", WALLETCONNECT_PROJECT_ID);

// --- DOM Elements ---
let chatWindow, userInput, sendButton, connectWalletButton, buyStfuLink, statusIndicator, messageLimitIndicator, themeToggleButton, easterEggTrigger, currentYearSpan;
try { /* ... same as v9 ... */
    chatWindow = document.getElementById('chat-window'); userInput = document.getElementById('user-input'); sendButton = document.getElementById('send-button'); connectWalletButton = document.getElementById('connect-wallet-button'); buyStfuLink = document.getElementById('buy-stfu-link'); statusIndicator = document.getElementById('status-indicator'); messageLimitIndicator = document.getElementById('message-limit-indicator'); themeToggleButton = document.getElementById('theme-toggle-button'); easterEggTrigger = document.querySelector('.easter-egg-trigger'); currentYearSpan = document.getElementById('current-year');
    if (!chatWindow || !userInput || !sendButton || !connectWalletButton || !statusIndicator || !messageLimitIndicator || !themeToggleButton) { console.warn("v10 DEBUG: One or more expected DOM elements were not found!");}
    console.log("v10 DEBUG: DOM elements obtained/checked");
} catch (e) { console.error("v10 DEBUG: Error obtaining DOM elements:", e); }

// --- Application State ---
let web3Modal = null; let ethersProvider = null; let signer = null; let userAddress = null; let isVerified = false; let conversationHistory = [];
const MESSAGE_COUNT_KEY = 'stfudoge_messageCount'; const LAST_RESET_KEY = 'stfudoge_lastReset'; const THEME_KEY = 'stfudoge_theme';
console.log("v10 DEBUG: App state initialized");

// --- Minimal ABI ---
const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];

// --- Initialization ---
try {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("v10 DEBUG: DOMContentLoaded event fired");

        // *** Wallet Initialization RE-ENABLED ***
        if (!WALLETCONNECT_PROJECT_ID || WALLETCONNECT_PROJECT_ID === 'YOUR_WALLETCONNECT_PROJECT_ID') { // Re-check just in case, though ID is hardcoded now
             console.error("v10 DEBUG FATAL: WalletConnect Project ID issue persists or check failed unexpectedly.");
             if(statusIndicator) { statusIndicator.textContent = "Wallet Config Error (Project ID)"; statusIndicator.className = 'denied'; }
             addMessageToChat("Error: Wallet setup is incomplete (Project ID)...", "system");
        } else {
            console.log("v10 DEBUG: Project ID seems okay. Initializing wallet modal...");
            initializeWeb3Modal(); // <--- THIS LINE IS **UNCOMMENTED** NOW
        }

        // Load other parts
        loadThemePreference();
        setupEventListeners();
        initializeChat();
        updateMessageLimitIndicator();
        updateCurrentYear();
        console.log("v10 DEBUG: Initial page setup initiated."); // Changed log message slightly
    });
} catch (e) { console.error("v10 DEBUG: Error setting up DOMContentLoaded listener:", e); }


// --- Web3Modal & Wallet Connection ---
function initializeWeb3Modal() {
    console.log("v10 DEBUG InitializeWeb3Modal: Function called."); // Log prefix updated
    setTimeout(() => {
        console.log("v10 DEBUG InitializeWeb3Modal: Timeout finished. Checking libraries...");
         if (typeof window.Web3Modal === 'undefined' || typeof window.Web3Modal.Ethers5 === 'undefined' || typeof window.ethers === 'undefined') {
            console.error("v10 DEBUG InitializeWeb3Modal: Libs not loaded...");
            if (statusIndicator) { statusIndicator.textContent = "Wallet init failed (Lib Load Error)"; statusIndicator.className = 'denied'; }
            addMessageToChat("Error: Wallet libraries failed to load...", "system");
            return;
        }
        console.log("v10 DEBUG InitializeWeb3Modal: Libraries seem loaded.");
        try {
            const { Ethers5Adapter } = window.Web3Modal.Ethers5;
            const chains = [{ chainId: CHAIN_ID, name: 'BNB Smart Chain', currency: 'BNB', explorerUrl: 'https://bscscan.com', rpcUrl: CHAIN_RPC_URL }];
            const ethersConfig = { ethers: window.ethers, provider: new window.ethers.providers.JsonRpcProvider(CHAIN_RPC_URL) };
            const modalConfig = {
                defaultChain: chains[0], ethersConfig: ethersConfig, chains: chains, projectId: WALLETCONNECT_PROJECT_ID, enableAnalytics: false,
                metadata: { name: 'STFUDoge Chat', description: 'Chat with the STFUDoge bot', url: window.location.href, icons: [window.location.origin + '/assets/STFUDoge_Favicon.jpg'] }
            };
            console.log("v10 DEBUG InitializeWeb3Modal: Creating Ethers5Adapter...");
            web3Modal = new Ethers5Adapter(modalConfig);
            console.log("v10 DEBUG InitializeWeb3Modal: Ethers5Adapter creation attempt finished. web3Modal object:", web3Modal);
            if (!web3Modal) { throw new Error("Adapter creation resulted in null object."); } // This error might still occur
            if (statusIndicator) { statusIndicator.textContent = "Wallet Ready. Connect pls."; statusIndicator.className = ''; }
        } catch (error) {
            console.error("v10 DEBUG InitializeWeb3Modal: Error during Ethers5Adapter creation:", error); // <<<< CHECK FOR THIS ERROR
            if (statusIndicator) { statusIndicator.textContent = "Wallet init failed (Adapter Error)"; statusIndicator.className = 'denied'; }
            addMessageToChat("Error initializing wallet connection adapter... " + error.message, "system");
            web3Modal = null;
        }
    }, 1500);
}

async function connectWallet() {
    console.log("v10 DEBUG ConnectWallet: Button clicked. Checking web3Modal state:", web3Modal);
    if (!web3Modal) {
         console.error("v10 DEBUG ConnectWallet: web3Modal is not initialized. Cannot connect."); // <<<< CHECK FOR THIS ERROR IF CLICKING FAILS
        if (statusIndicator) { statusIndicator.textContent = "Wallet init error. Refresh maybe?"; statusIndicator.className = 'denied'; }
        addMessageToChat("Wallet system isn't ready...", "system");
        return;
    }
    // Rest of function... (code remains same as v9/v8)
     if (statusIndicator) { statusIndicator.textContent = "Connecting wallet..."; statusIndicator.className = ''; } console.log("v10 DEBUG ConnectWallet: Opening wallet connection modal..."); try { if (connectWalletButton) connectWalletButton.disabled = true; const modalProvider = await web3Modal.connect(); if (!modalProvider) { /*...*/ throw new Error("Wallet connection cancelled or failed.");} console.log("v10 DEBUG ConnectWallet: Modal provider obtained:", modalProvider); ethersProvider = new ethers.providers.Web3Provider(modalProvider); signer = ethersProvider.getSigner(); userAddress = await signer.getAddress(); console.log("v10 DEBUG ConnectWallet: Wallet Connected. Address:", userAddress); if (connectWalletButton) connectWalletButton.textContent = `Connected: <span class="math-inline">\{userAddress\.substring\(0, 6\)\}\.\.\.</span>{userAddress.substring(userAddress.length - 4)}`; if (statusIndicator) statusIndicator.textContent = "Wallet connected. Verifying $STFU..."; await checkTokenBalance(); } catch (error) { console.error("v10 DEBUG ConnectWallet: Error during connection:", error); let errorMsg = "Wallet connection failed."; /*...*/ if (statusIndicator) { statusIndicator.textContent = errorMsg; statusIndicator.className = 'denied'; } addMessageToChat(errorMsg + " much reject. wow.", "system"); userAddress = null; isVerified = false; if (connectWalletButton) { connectWalletButton.textContent = "Connect Wallet"; connectWalletButton.disabled = false; } updateMessageLimitIndicator(); }
}


// --- Other functions remain the same as v9 DEBUG ---
// (checkTokenBalance, initializeChat, setupEventListeners, updateCurrentYear,
// handleUserInput, getBotResponse, generateMemePlaceholder, addMessageToChat,
// enableInput, Message Limiting, Theme Toggling, Easter Egg)
// Update console log prefixes if desired e.g., "v10 DEBUG"

async function checkTokenBalance() { console.log("v10 DEBUG CheckTokenBalance: Called..."); /* ... */ }
function initializeChat() { console.log("v10 DEBUG InitializeChat: Setting up initial history."); conversationHistory.push({ role: "assistant", content: "Grrr. What you want, peasant?..." }); }
function setupEventListeners() { console.log("v10 DEBUG SetupEventListeners: Attaching listeners..."); try { /*...*/ } catch(error) { /*...*/ } console.log("v10 DEBUG SetupEventListeners: Finished."); }
function updateCurrentYear() { if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear(); }
function handleUserInput() { console.log("v10 DEBUG HandleUserInput: Fired."); /* ... */ }
async function getBotResponse(userMessage) { console.log("v10 DEBUG GetBotResponse: Called..."); /* ... */ }
function generateMemePlaceholder(userMsg, botReply) { console.log("v10 DEBUG GenerateMemePlaceholder: Called..."); /* ... */ }
function addMessageToChat(text, sender, imageUrl = null) { console.log(`v10 DEBUG AddMessageToChat: Adding message - Sender: ${sender}...`); try { /*...*/ } catch (error) { /*...*/ } }
function enableInput() { console.log("v10 DEBUG EnableInput: Re-enabling input..."); try { /*...*/ } catch(error) { /*...*/ } }
function getTodayDateString() { return new Date().toISOString().split('T')[0]; }
function getMessageCount() { /*...*/ return { count, limitReached: count >= MAX_FREE_MESSAGES }; }
function incrementMessageCount() { /*...*/ console.log(`v10 DEBUG IncrementMessageCount: Count incremented...`); }
function updateMessageLimitIndicator() { if(!messageLimitIndicator) return; if (isVerified) { /*...*/ } else { const { count } = getMessageCount(); const remaining = Math.max(0, MAX_FREE_MESSAGES - count); messageLimitIndicator.textContent = `Messages remaining: ${remaining}`; } messageLimitIndicator.style.display = 'block'; }
function displayLimitReachedMessage() { console.log("v10 DEBUG DisplayLimitReachedMessage: Triggered."); /*...*/ }
function loadThemePreference() { console.log("v10 DEBUG LoadThemePreference: Loading..."); try { /*...*/ } catch (error) { /*...*/ } }
function toggleTheme() { console.log("v10 DEBUG ToggleTheme: Button clicked..."); try { /*...*/ } catch (error) { /*...*/ } }
function triggerEasterEgg() { console.log("v10 DEBUG TriggerEasterEgg: Clicked!"); alert("much moon! wow!"); /*...*/ }

console.log("v10 DEBUG: chat.js script fully parsed.");
