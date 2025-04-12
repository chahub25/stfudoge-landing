// File: chat.js (Client-Side Logic - Calls /api/chatProxy)
// Updated: 2025-04-12 (v3)

// --- Configuration (Client-Side Safe Values) ---
// !!! IMPORTANT: Make sure this Project ID is correct! !!!
const WALLETCONNECT_PROJECT_ID = '9d4b5847e95ec6872d7ee4d791ee2640'; // <-- Replace with your ACTUAL WC Project ID!
const TOKEN_CONTRACT_ADDRESS = '0xd8d01A667A8fEeF10077c61018b4F8fA533703eD'; // <-- STFUDoge Token Address
const CHAIN_ID = 56; // BNB Smart Chain Mainnet
// Using an alternative public RPC node for testing
const CHAIN_RPC_URL = 'https://bsc.publicnode.com'; // Alternative RPC - was 'https://bsc-dataseed.binance.org/'
const TOKEN_DECIMALS = 18;

// --- Message Limit ---
const MAX_FREE_MESSAGES = 50; // Increased from 3

// --- OpenRouter Models (Sent to Proxy) ---
const FREE_USER_MODEL = "openchat/openchat-7b:free";
const VERIFIED_USER_MODEL = "openai/gpt-3.5-turbo";

// --- DOM Elements ---
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const connectWalletButton = document.getElementById('connect-wallet-button');
const buyStfuLink = document.getElementById('buy-stfu-link');
const statusIndicator = document.getElementById('status-indicator');
const messageLimitIndicator = document.getElementById('message-limit-indicator');
const themeToggleButton = document.getElementById('theme-toggle-button');
const easterEggTrigger = document.querySelector('.easter-egg-trigger');
const currentYearSpan = document.getElementById('current-year');

// --- Application State ---
let web3Modal;
let ethersProvider;
let signer;
let userAddress = null;
let isVerified = false;
let conversationHistory = [];
const MESSAGE_COUNT_KEY = 'stfudoge_messageCount';
const LAST_RESET_KEY = 'stfudoge_lastReset';
const THEME_KEY = 'stfudoge_theme';

// --- Minimal ABI for balanceOf ---
const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)"
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Make sure wallet connect ID is set before initializing
    if (!WALLETCONNECT_PROJECT_ID || WALLETCONNECT_PROJECT_ID === 'YOUR_WALLETCONNECT_PROJECT_ID') {
         console.error("WalletConnect Project ID is missing in chat.js configuration. Replace 'YOUR_WALLETCONNECT_PROJECT_ID'. Wallet cannot initialize.");
         statusIndicator.textContent = "Wallet Config Error (Project ID)";
         statusIndicator.className = 'denied';
         addMessageToChat("Error: Wallet setup is incomplete (Missing Project ID). Admin needs to fix this. much config fail. wow.", "system");
    } else {
        initializeWeb3Modal(); // Initialize only if Project ID seems present
    }
    loadThemePreference();
    setupEventListeners();
    initializeChat();
    updateMessageLimitIndicator();
    updateCurrentYear();
});

// --- Web3Modal & Wallet Connection ---
function initializeWeb3Modal() {
    console.log("Attempting to initialize Web3Modal...");

    setTimeout(() => {
        if (typeof window.Web3Modal === 'undefined' || typeof window.Web3Modal.Ethers5 === 'undefined' || typeof window.ethers === 'undefined') {
            console.error("Web3Modal or Ethers library not loaded properly. Check script tags or network connection.");
            statusIndicator.textContent = "Wallet init failed (Lib Load Error)";
            statusIndicator.className = 'denied';
            addMessageToChat("Error: Wallet libraries failed to load. Try refreshing. much sadness. wow.", "system");
            return;
        }

        console.log("Web3Modal/Ethers libs loaded. WalletConnect Project ID:", WALLETCONNECT_PROJECT_ID);

        try {
            const { Ethers5Adapter } = window.Web3Modal.Ethers5;
            const chains = [{ chainId: CHAIN_ID, name: 'BNB Smart Chain', currency: 'BNB', explorerUrl: 'https://bscscan.com', rpcUrl: CHAIN_RPC_URL }];
            const ethersConfig = { ethers: window.ethers, provider: new window.ethers.providers.JsonRpcProvider(CHAIN_RPC_URL) };
            const modalConfig = {
                defaultChain: chains[0], ethersConfig: ethersConfig, chains: chains, projectId: WALLETCONNECT_PROJECT_ID, enableAnalytics: false,
                metadata: { name: 'STFUDoge Chat', description: 'Chat with the STFUDoge bot', url: window.location.href, icons: [window.location.origin + '/assets/STFUDoge_Favicon.jpg'] }
            };
            web3Modal = new Ethers5Adapter(modalConfig);
            console.log("Web3Modal Ethers5Adapter initialized successfully.");
            statusIndicator.textContent = "Wallet Ready. Connect pls.";
        } catch (error) {
            console.error("Error initializing Web3Modal Adapter:", error);
            statusIndicator.textContent = "Wallet init failed (Adapter Error)";
            statusIndicator.className = 'denied';
            addMessageToChat("Error initializing wallet connection adapter. much fail. wow. " + error.message, "system");
        }
    }, 500);
}

async function connectWallet() {
    if (!web3Modal) {
        console.error("Web3Modal not initialized. Cannot connect.");
        statusIndicator.textContent = "Wallet init error. Refresh maybe?";
        statusIndicator.className = 'denied';
        addMessageToChat("Wallet system isn't ready. Try refreshing. much confusion. wow.", "system")
        return;
    }
    statusIndicator.textContent = "Connecting wallet...";
    statusIndicator.className = '';
    console.log("Opening wallet connection modal...");
    try {
        const modalProvider = await web3Modal.connect();
        if (!modalProvider) throw new Error("Web3Modal connection returned null provider.");

        ethersProvider = new ethers.providers.Web3Provider(modalProvider);
        signer = ethersProvider.getSigner();
        userAddress = await signer.getAddress();

        console.log("Wallet Connected:", userAddress);
        connectWalletButton.textContent = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
        connectWalletButton.disabled = true;
        statusIndicator.textContent = "Wallet connected. Verifying $STFU..."; // Update status before async check
        await checkTokenBalance();

    } catch (error) {
        console.error("Could not connect wallet:", error);
        // Provide more specific feedback if possible
        let errorMsg = "Wallet connection failed.";
        if (error.message?.includes("User closed modal")) {
             errorMsg = "Wallet connection cancelled.";
        } else if (error.message?.includes("rejected")) {
             errorMsg = "Connection request rejected.";
        }
        statusIndicator.textContent = errorMsg;
        statusIndicator.className = 'denied';
        addMessageToChat(errorMsg + " much reject. wow.", "system");
        userAddress = null;
        isVerified = false;
        connectWalletButton.textContent = "Connect Wallet";
        connectWalletButton.disabled = false;
        updateMessageLimitIndicator();
    }
}

// --- checkTokenBalance function remains the same ---
async function checkTokenBalance() {
    // (No changes needed in this function from the previous full version)
    if (!userAddress || !ethersProvider) { /* ... */ return; }
    statusIndicator.textContent = `Verifying $STFU for ${userAddress.substring(0, 6)}...`;
    statusIndicator.className = '';
    try {
        const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, erc20Abi, ethersProvider);
        const balance = await tokenContract.balanceOf(userAddress);
        const balanceFormatted = ethers.utils.formatUnits(balance, TOKEN_DECIMALS);
        console.log(`$STFU Balance for ${userAddress}: ${balanceFormatted}`);
        if (balance.gt(0)) {
            isVerified = true;
            const displayBalance = parseFloat(balanceFormatted).toFixed(4);
            statusIndicator.textContent = `✅ STFUDoge Verified (${displayBalance} $STFU). Unlimited access granted. such wow.`;
            statusIndicator.className = 'verified';
            addMessageToChat("Hah, you actually have coins. Fine, talk. Don't waste my time. much verified. wow.", "bot");
        } else {
            isVerified = false;
            statusIndicator.textContent = `❌ No $STFU found. Get some tokens, peasant.`;
            statusIndicator.className = 'denied';
            addMessageToChat(`Zero $STFU? pathetic. Go buy some or STFU. ${buyStfuLink.outerHTML}. very poor. wow.`, "bot");
        }
    } catch (error) { /* ... error handling ... */
        console.error("Error checking token balance:", error);
        statusIndicator.textContent = "Error checking balance. Network issue?";
        statusIndicator.className = 'denied';
        addMessageToChat("Can't even check balance. Network broken? Or maybe you are? much error. wow.", "bot");
        isVerified = false;
    } finally {
         updateMessageLimitIndicator();
    }
}


// --- initializeChat function remains the same ---
function initializeChat() { /* ... */
    conversationHistory.push({ role: "assistant", content: "Grrr. What you want, peasant? Talk fast. Or buy $STFU. such impatience. wow." });
}

// --- setupEventListeners function remains the same ---
function setupEventListeners() { /* ... */
    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !sendButton.disabled) handleUserInput(); });
    connectWalletButton.addEventListener('click', connectWallet);
    themeToggleButton.addEventListener('click', toggleTheme);
    easterEggTrigger.addEventListener('click', triggerEasterEgg);
}

// --- updateCurrentYear function remains the same ---
function updateCurrentYear() { /* ... */
    if (currentYearSpan) { currentYearSpan.textContent = new Date().getFullYear(); }
}

// --- handleUserInput function remains the same ---
function handleUserInput() { /* ... */
    const messageText = userInput.value.trim();
    if (!messageText) return;
    if (!isVerified) {
        const { count, limitReached } = getMessageCount();
        if (limitReached) { displayLimitReachedMessage(); return; }
    }
    addMessageToChat(messageText, "user");
    userInput.value = '';
    sendButton.disabled = true; userInput.disabled = true;
    if (!isVerified) { incrementMessageCount(); updateMessageLimitIndicator(); }
    else { messageLimitIndicator.textContent = 'Unlimited Messages. such VIP. wow.'; }
    conversationHistory.push({ role: "user", content: messageText });
    getBotResponse(messageText);
}

// --- getBotResponse function remains the same (calling proxy) ---
async function getBotResponse(userMessage) { /* ... */
    const systemPrompt = `You are STFUDoge... Current user status: ${isVerified ? 'VERIFIED $STFU Holder' : 'PEASANT (No $STFU)'}`; // Truncated for brevity
    let messagesToSend = [];
    if (conversationHistory.length <= 2) messagesToSend.push({ role: "system", content: systemPrompt });
    messagesToSend = messagesToSend.concat([...conversationHistory]);
    const historyLimit = 10; // Manage history size
    if (messagesToSend.length > historyLimit + 1) { /* ... slice logic ... */
         messagesToSend = messagesToSend.slice(-(historyLimit));
        if(messagesToSend.length > 0 && messagesToSend[0].role !== "system" && conversationHistory.length > 2) {
             messagesToSend.unshift({ role: "system", content: systemPrompt });
        }
    }

    const proxyApiUrl = "/api/chatProxy";
    const modelToUse = isVerified ? VERIFIED_USER_MODEL : FREE_USER_MODEL;
    try {
        const requestBody = { model: modelToUse, messages: messagesToSend };
        const response = await fetch(proxyApiUrl, { /* ... POST request to proxy ... */
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(requestBody)
        });
        if (!response.ok) { /* ... error handling ... */
             const errorData = await response.json();
             console.error("Proxy/API Error:", errorData);
             throw new Error(`API request failed: ${response.statusText} - ${errorData.error || 'Unknown error via proxy'}`);
        }
        const data = await response.json();
        let botReply = data.choices[0]?.message?.content.trim() || "Grrr... brain fart. Try again? much confused. wow.";
        // Ensure doge speak ending
        if (!/(\.|!|\?|\s)(such|much|very|so|wow)\b.*\.\s*wow\.$/i.test(botReply) && !/\s+wow\.$/i.test(botReply)) { /* ... append ending ... */
             const dogeEndings = ["such token. wow.", "very crypto. much profit.", "so random. wow.", "much meme. wow.", "very chat. wow."];
             botReply += " " + dogeEndings[Math.floor(Math.random() * dogeEndings.length)];
        }
        conversationHistory.push({ role: "assistant", content: botReply });
        addMessageToChat(botReply, "bot");
        if (isVerified && Math.random() < 0.03) { /* ... meme placeholder call ... */ generateMemePlaceholder(userMessage, botReply); }
    } catch (error) { /* ... error handling ... */
         console.error('Error fetching bot response via proxy:', error);
         addMessageToChat(`Gah! My circuits fried. Maybe the proxy is down? Or the main brain? ${error.message}. much error. wow.`, "bot");
    } finally { enableInput(); }
}

// --- generateMemePlaceholder function remains the same ---
function generateMemePlaceholder(userMsg, botReply) { /* ... */ console.log("MEME TRIGGERED (Placeholder)"); /* ... */ }

// --- addMessageToChat function remains the same ---
function addMessageToChat(text, sender, imageUrl = null) { /* ... */ }

// --- enableInput function remains the same ---
function enableInput() { /* ... */ }

// --- Message Limiting functions remain the same ---
function getTodayDateString() { /* ... */ return new Date().toISOString().split('T')[0]; }
function getMessageCount() { /* ... */
    const today = getTodayDateString(); const lastReset = localStorage.getItem(LAST_RESET_KEY); let count = 0;
    if (lastReset === today) count = parseInt(localStorage.getItem(MESSAGE_COUNT_KEY) || '0', 10);
    else { localStorage.setItem(MESSAGE_COUNT_KEY, '0'); localStorage.setItem(LAST_RESET_KEY, today); count = 0; console.log("Message count reset."); }
    return { count, limitReached: count >= MAX_FREE_MESSAGES };
 }
function incrementMessageCount() { /* ... */
    const { count } = getMessageCount(); const newCount = count + 1; localStorage.setItem(MESSAGE_COUNT_KEY, newCount.toString()); console.log(`Msg count: ${newCount}`);
}
function updateMessageLimitIndicator() { /* ... */
     if (isVerified) { messageLimitIndicator.textContent = 'Unlimited Messages. such VIP. wow.'; messageLimitIndicator.style.display = 'block'; }
     else { const { count } = getMessageCount(); const remaining = Math.max(0, MAX_FREE_MESSAGES - count); messageLimitIndicator.textContent = `Messages remaining: ${remaining}`; messageLimitIndicator.style.display = 'block'; }
}
function displayLimitReachedMessage() { /* ... */
     const limitMessages = [ /* ... */ ]; const randomMsg = limitMessages[Math.floor(Math.random() * limitMessages.length)]; addMessageToChat(randomMsg, "bot");
     userInput.value = ''; userInput.disabled = true; sendButton.disabled = true; userInput.placeholder = "Message limit reached...";
 }

// --- Theme Toggling functions remain the same ---
function loadThemePreference() { /* ... */ }
function toggleTheme() { /* ... */ }

// --- Easter Egg function remains the same ---
function triggerEasterEgg() { /* ... */ }
