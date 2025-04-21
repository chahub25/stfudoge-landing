// File: chat.js (Client-Side Logic - v12 DEBUG - Detailed Lib Check)
// Purpose: Add detailed logging to see which specific library object is missing.

console.log("chat.js script started - v12 DEBUG Detailed Lib Check");

// --- Configuration ---
const WALLETCONNECT_PROJECT_ID = '9d4b5847e95ec6872d7ee4d791ee2640'; // Included as requested
const TOKEN_CONTRACT_ADDRESS = '0xd8d01A667A8fEeF10077c61018b4F8fA533703eD';
const CHAIN_ID = 56;
const CHAIN_RPC_URL = 'https://bsc.publicnode.com';
const TOKEN_DECIMALS = 18;
const MAX_FREE_MESSAGES = 50;
const FREE_USER_MODEL = "mistralai/mistral-7b-instruct:free";
const VERIFIED_USER_MODEL = "openai/gpt-3.5-turbo";
console.log("v12 DEBUG: Config loaded."); // Simplified log

// --- DOM Elements ---
let chatWindow, userInput, sendButton, connectWalletButton, buyStfuLink, statusIndicator, messageLimitIndicator, themeToggleButton, easterEggTrigger, currentYearSpan;
try { /* ... obtaining elements ... */
    chatWindow = document.getElementById('chat-window'); userInput = document.getElementById('user-input'); sendButton = document.getElementById('send-button'); connectWalletButton = document.getElementById('connect-wallet-button'); buyStfuLink = document.getElementById('buy-stfu-link'); statusIndicator = document.getElementById('status-indicator'); messageLimitIndicator = document.getElementById('message-limit-indicator'); themeToggleButton = document.getElementById('theme-toggle-button'); easterEggTrigger = document.querySelector('.easter-egg-trigger'); currentYearSpan = document.getElementById('current-year');
    console.log("v12 DEBUG: DOM elements obtained/checked");
} catch (e) { console.error("v12 DEBUG: Error obtaining DOM elements:", e); }

// --- Application State ---
let web3Modal = null; let ethersProvider = null; let signer = null; let userAddress = null; let isVerified = false; let conversationHistory = [];
const MESSAGE_COUNT_KEY = 'stfudoge_messageCount'; const LAST_RESET_KEY = 'stfudoge_lastReset'; const THEME_KEY = 'stfudoge_theme';
console.log("v12 DEBUG: App state initialized");

// --- Minimal ABI ---
const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];

// --- Initialization ---
try {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("v12 DEBUG: DOMContentLoaded event fired");
        console.log("v12 DEBUG: Skipping automatic wallet initialization.");
        if(statusIndicator) statusIndicator.textContent = "Connect Wallet to Start";
        loadThemePreference();
        setupEventListeners();
        initializeChat();
        updateMessageLimitIndicator();
        updateCurrentYear();
        console.log("v12 DEBUG: Initial page setup complete.");
    });
} catch (e) { console.error("v12 DEBUG: Error setting up DOMContentLoaded listener:", e); }

// --- Web3Modal & Wallet Connection ---

// Combined Initialization and Connection function
async function connectAndInitializeWallet() {
    console.log("v12 DEBUG ConnectWallet: Button clicked.");

    // 1. Initialize if not already done
    if (!web3Modal) {
        console.log("v12 DEBUG ConnectWallet: web3Modal not initialized. Attempting initialization...");
        if (statusIndicator) { statusIndicator.textContent = "Initializing Wallet System..."; statusIndicator.className = ''; }

        // *** DETAILED LIBRARY CHECK ***
        console.log("v12 DEBUG ConnectWallet: Checking window.Web3Modal:", window.Web3Modal);
        console.log("v12 DEBUG ConnectWallet: Checking window.Web3Modal?.Ethers5:", window.Web3Modal?.Ethers5); // Optional chaining
        console.log("v12 DEBUG ConnectWallet: Checking window.ethers:", window.ethers);

        if (typeof window.Web3Modal === 'undefined' || typeof window.Web3Modal.Ethers5 === 'undefined' || typeof window.ethers === 'undefined') {
            console.error("v12 DEBUG ConnectWallet: One or more Web3Modal/Ethers libs were not found on window object! Cannot initialize.");
            if (statusIndicator) { statusIndicator.textContent = "Wallet Error (Libs Missing)"; statusIndicator.className = 'denied'; }
            addMessageToChat("Wallet libraries failed to load or initialize correctly. Try refreshing maybe?", "system");
            return; // Stop
        }
        console.log("v12 DEBUG ConnectWallet: Libraries seem present on window object. Proceeding with adapter creation...");

        // Try creating the adapter
        try {
            const { Ethers5Adapter } = window.Web3Modal.Ethers5;
            const chains = [{ chainId: CHAIN_ID, name: 'BNB Smart Chain', currency: 'BNB', explorerUrl: 'https://bscscan.com', rpcUrl: CHAIN_RPC_URL }];
            const ethersConfig = { ethers: window.ethers, provider: new window.ethers.providers.JsonRpcProvider(CHAIN_RPC_URL) };
            const modalConfig = { /* ... same config ... */
                defaultChain: chains[0], ethersConfig: ethersConfig, chains: chains, projectId: WALLETCONNECT_PROJECT_ID, enableAnalytics: false,
                metadata: { name: 'STFUDoge Chat', description: 'Chat with the STFUDoge bot', url: window.location.href, icons: [window.location.origin + '/assets/STFUDoge_Favicon.jpg'] }
            };
            console.log("v12 DEBUG ConnectWallet: Creating Ethers5Adapter...");
            web3Modal = new Ethers5Adapter(modalConfig);
            console.log("v12 DEBUG ConnectWallet: Ethers5Adapter creation attempt finished. web3Modal object:", web3Modal);
            if (!web3Modal) { throw new Error("Adapter creation resulted in null object."); }
            console.log("v12 DEBUG ConnectWallet: Initialization successful.");
            if (statusIndicator) { statusIndicator.textContent = "Wallet System Ready. Connecting..."; }

        } catch (error) {
            console.error("v12 DEBUG ConnectWallet: Error during Ethers5Adapter creation:", error); // <<<< THIS ERROR IS IMPORTANT
            if (statusIndicator) { statusIndicator.textContent = "Wallet init failed (Adapter Error)"; statusIndicator.className = 'denied'; }
            addMessageToChat("Error initializing wallet connection adapter. " + error.message, "system");
            web3Modal = null; // Reset on failure
            return; // Stop if initialization failed
        }
    } else {
        console.log("v12 DEBUG ConnectWallet: web3Modal already initialized.");
    }

    // 2. Proceed with Connection attempt (only if web3Modal is now valid)
    // (Code for this part remains the same as v11)
    if (statusIndicator) { statusIndicator.textContent = "Connecting wallet..."; statusIndicator.className = ''; } console.log("v12 DEBUG ConnectWallet: Opening wallet connection modal..."); try { if (connectWalletButton) connectWalletButton.disabled = true; const modalProvider = await web3Modal.connect(); if (!modalProvider) { throw new Error("Wallet connection cancelled or failed."); } console.log("v12 DEBUG ConnectWallet: Modal provider obtained."); ethersProvider = new ethers.providers.Web3Provider(modalProvider); signer = ethersProvider.getSigner(); userAddress = await signer.getAddress(); console.log("v12 DEBUG ConnectWallet: Wallet Connected. Address:", userAddress); if (connectWalletButton) connectWalletButton.textContent = `Connected: <span class="math-inline">\{userAddress\.substring\(0, 6\)\}\.\.\.</span>{userAddress.substring(userAddress.length - 4)}`; if (statusIndicator) statusIndicator.textContent = "Wallet connected. Verifying $STFU..."; await checkTokenBalance(); } catch (error) { console.error("v12 DEBUG ConnectWallet: Error during connection:", error); let errorMsg = "Wallet connection failed."; if (error.message?.includes("User closed modal") || error.message?.includes("Connection declined")) { errorMsg = "Wallet connection cancelled."; } else if (error.message?.includes("rejected")) { errorMsg = "Connection request rejected."; } else { console.error("v12 DEBUG ConnectWallet: Raw connection error:", error); } if (statusIndicator) { statusIndicator.textContent = errorMsg; statusIndicator.className = 'denied'; } addMessageToChat(errorMsg + " much reject. wow.", "system"); userAddress = null; isVerified = false; if (connectWalletButton) { connectWalletButton.textContent = "Connect Wallet"; connectWalletButton.disabled = false; } updateMessageLimitIndicator(); }
}


// --- Other functions remain the same as v11 LAZY INIT ---
// (checkTokenBalance, initializeChat, setupEventListeners, updateCurrentYear,
// handleUserInput, getBotResponse, generateMemePlaceholder, addMessageToChat,
// enableInput, Message Limiting funcs [with count fix], Theme Toggling, Easter Egg)

async function checkTokenBalance() { console.log("v12 DEBUG CheckTokenBalance: Called..."); /* ... */ }
function initializeChat() { console.log("v12 DEBUG InitializeChat: Setting up initial history."); conversationHistory.push({ role: "assistant", content: "Grrr. What you want, peasant?..." }); }
function setupEventListeners() { console.log("v12 DEBUG SetupEventListeners: Attaching listeners..."); try { if (sendButton && userInput) { sendButton.addEventListener('click', handleUserInput); userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !sendButton.disabled) handleUserInput(); }); } else { console.error("v12 DEBUG: Chat input/button missing!");} if (connectWalletButton) { connectWalletButton.addEventListener('click', connectAndInitializeWallet); } else { console.error("v12 DEBUG: Connect button missing!");} if (themeToggleButton) { themeToggleButton.addEventListener('click', toggleTheme); } else { console.error("v12 DEBUG: Theme button missing!");} if (easterEggTrigger) { easterEggTrigger.addEventListener('click', triggerEasterEgg); } else { console.warn("v12 DEBUG: Easter egg trigger missing.");} } catch(error) { console.error("v12 DEBUG: ERROR attaching listeners:", error); } console.log("v12 DEBUG SetupEventListeners: Finished."); }
function updateCurrentYear() { if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear(); }
function handleUserInput() { console.log("v12 DEBUG HandleUserInput: Fired."); /* ... */ }
async function getBotResponse(userMessage) { console.log("v12 DEBUG GetBotResponse: Called..."); /* ... */ }
function generateMemePlaceholder(userMsg, botReply) { console.log("v12 DEBUG GenerateMemePlaceholder: Called..."); /* ... */ }
function addMessageToChat(text, sender, imageUrl = null) { console.log(`v12 DEBUG AddMessageToChat: Sender: ${sender}...`); try { /*...*/ } catch (error) { /*...*/ } }
function enableInput() { console.log("v12 DEBUG EnableInput: Re-enabling input..."); try { /*...*/ } catch(error) { /*...*/ } }
function getTodayDateString() { return new Date().toISOString().split('T')[0]; }
function getMessageCount() { /*...*/ return { count, limitReached: count >= MAX_FREE_MESSAGES }; }
function incrementMessageCount() { /*...*/ console.log(`v12 DEBUG IncrementMessageCount: Count incremented...`); }
function updateMessageLimitIndicator() { console.log("v12 DEBUG UpdateMessageLimitIndicator: Updating indicator. Verified:", isVerified); if(!messageLimitIndicator) { return; } if (isVerified) { /*...*/ } else { if (typeof getMessageCount === "function") { const messageData = getMessageCount(); const count = messageData.count; const remaining = Math.max(0, MAX_FREE_MESSAGES - count); messageLimitIndicator.textContent = `Messages remaining: ${remaining}`; } else { /*...*/ } } messageLimitIndicator.style.display = 'block'; }
function displayLimitReachedMessage() { console.log("v12 DEBUG DisplayLimitReachedMessage: Triggered."); /*...*/ }
function loadThemePreference() { console.log("v12 DEBUG LoadThemePreference: Loading..."); try { /*...*/ } catch (error) { /*...*/ } }
function toggleTheme() { console.log("v12 DEBUG ToggleTheme: Button clicked..."); try { /*...*/ } catch (error) { /*...*/ } }
function triggerEasterEgg() { console.log("v12 DEBUG TriggerEasterEgg: Clicked!"); alert("much moon! wow!"); /*...*/ }

console.log("v12 DEBUG: chat.js script fully parsed.");
