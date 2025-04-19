// File: chat.js (Client-Side Logic - Calls /api/chatProxy)
// Updated: 2025-04-19 (v6 - WC ID Included, Final Code Set)

console.log("chat.js script started - v6 Final");

// --- Configuration ---
// WalletConnect Project ID - INSERTED AS PROVIDED
const WALLETCONNECT_PROJECT_ID = '9d4b5847e95ec6872d7ee4d791ee2640';
const TOKEN_CONTRACT_ADDRESS = '0xd8d01A667A8fEeF10077c61018b4F8fA533703eD';
const CHAIN_ID = 56;
const CHAIN_RPC_URL = 'https://bsc.publicnode.com'; // Alternative RPC
const TOKEN_DECIMALS = 18;
const MAX_FREE_MESSAGES = 50; // Increased limit

// --- OpenRouter Models (Sent to Proxy) ---
// **FIXED:** Using mistralai/mistral-7b-instruct:free
const FREE_USER_MODEL = "mistralai/mistral-7b-instruct:free";
const VERIFIED_USER_MODEL = "openai/gpt-3.5-turbo";
console.log("v6: Using Free Model:", FREE_USER_MODEL);
console.log("v6: Using WC Project ID:", WALLETCONNECT_PROJECT_ID); // Verify it's correct

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
console.log("v6: DOM elements obtained");

// --- Application State ---
let web3Modal = null;
let ethersProvider = null;
let signer = null;
let userAddress = null;
let isVerified = false;
let conversationHistory = [];
const MESSAGE_COUNT_KEY = 'stfudoge_messageCount';
const LAST_RESET_KEY = 'stfudoge_lastReset';
const THEME_KEY = 'stfudoge_theme';
console.log("v6: App state initialized");

// --- Minimal ABI ---
const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("v6: DOMContentLoaded event fired");
    // WalletConnect Project ID is now hardcoded, check removed
    console.log("v6: Initializing wallet modal...");
    initializeWeb3Modal();
    loadThemePreference();
    setupEventListeners();
    initializeChat();
    updateMessageLimitIndicator();
    updateCurrentYear();
    console.log("v6: Initial page setup complete");
});

// --- Web3Modal & Wallet Connection ---
function initializeWeb3Modal() {
    console.log("v6 InitializeWeb3Modal: Function called.");
    setTimeout(() => {
        console.log("v6 InitializeWeb3Modal: Timeout finished. Checking libraries...");
        console.log("v6 InitializeWeb3Modal: typeof window.Web3Modal =", typeof window.Web3Modal);
        if (window.Web3Modal) console.log("v6 InitializeWeb3Modal: window.Web3Modal.Ethers5 =", window.Web3Modal.Ethers5);
        console.log("v6 InitializeWeb3Modal: typeof window.ethers =", typeof window.ethers);

        if (typeof window.Web3Modal === 'undefined' || typeof window.Web3Modal.Ethers5 === 'undefined' || typeof window.ethers === 'undefined') {
            console.error("v6 InitializeWeb3Modal: Web3Modal or Ethers library not loaded properly after wait..."); // Truncated log
            if (statusIndicator) { statusIndicator.textContent = "Wallet init failed (Lib Load Error)"; statusIndicator.className = 'denied'; }
            addMessageToChat("Error: Wallet libraries failed to load...", "system");
            return;
        }

        console.log("v6 InitializeWeb3Modal: Libraries seem loaded.");
        try {
            const { Ethers5Adapter } = window.Web3Modal.Ethers5;
            const chains = [{ chainId: CHAIN_ID, name: 'BNB Smart Chain', currency: 'BNB', explorerUrl: 'https://bscscan.com', rpcUrl: CHAIN_RPC_URL }];
            const ethersConfig = { ethers: window.ethers, provider: new window.ethers.providers.JsonRpcProvider(CHAIN_RPC_URL) };
            // ** Using the hardcoded Project ID **
            const modalConfig = {
                defaultChain: chains[0], ethersConfig: ethersConfig, chains: chains, projectId: WALLETCONNECT_PROJECT_ID, enableAnalytics: false,
                metadata: { name: 'STFUDoge Chat', description: 'Chat with the STFUDoge bot', url: window.location.href, icons: [window.location.origin + '/assets/STFUDoge_Favicon.jpg'] }
            };

            console.log("v6 InitializeWeb3Modal: Creating Ethers5Adapter with config:", modalConfig);
            web3Modal = new Ethers5Adapter(modalConfig);
            console.log("v6 InitializeWeb3Modal: Ethers5Adapter creation attempt finished. web3Modal object:", web3Modal);

            if (!web3Modal) {
                 console.error("v6 InitializeWeb3Modal: web3Modal is NULL after adapter creation attempt!");
                 throw new Error("Adapter creation resulted in null object.");
            }
            if (statusIndicator) { statusIndicator.textContent = "Wallet Ready. Connect pls."; statusIndicator.className = ''; }

        } catch (error) {
            console.error("v6 InitializeWeb3Modal: Error during Ethers5Adapter creation:", error);
            if (statusIndicator) { statusIndicator.textContent = "Wallet init failed (Adapter Error)"; statusIndicator.className = 'denied'; }
            addMessageToChat("Error initializing wallet connection adapter... " + error.message, "system");
            web3Modal = null;
        }
    }, 1500); // Timeout remains 1.5 seconds
}

// --- connectWallet function ---
// (No code changes needed, logging is present)
async function connectWallet() {
     console.log("v6 ConnectWallet: Button clicked. Checking web3Modal state:", web3Modal); if (!web3Modal){ console.error("v6 ConnectWallet: web3Modal is not initialized..."); if (statusIndicator) { statusIndicator.textContent = "Wallet init error. Refresh maybe?"; statusIndicator.className = 'denied'; } addMessageToChat("Wallet system isn't ready...", "system"); return;}
     if (statusIndicator) { statusIndicator.textContent = "Connecting wallet..."; statusIndicator.className = ''; } console.log("v6 ConnectWallet: Opening wallet connection modal...");
     try {
         if (connectWalletButton) connectWalletButton.disabled = true;
         const modalProvider = await web3Modal.connect(); if (!modalProvider) { console.error("v6 ConnectWallet: web3Modal.connect() returned null provider."); throw new Error("Wallet connection cancelled or failed.");} console.log("v6 ConnectWallet: Modal provider obtained:", modalProvider);
         ethersProvider = new ethers.providers.Web3Provider(modalProvider); signer = ethersProvider.getSigner(); userAddress = await signer.getAddress();
         console.log("v6 ConnectWallet: Wallet Connected. Address:", userAddress); if (connectWalletButton) connectWalletButton.textContent = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
         if (statusIndicator) statusIndicator.textContent = "Wallet connected. Verifying $STFU...";
         await checkTokenBalance();
     } catch (error) {
         console.error("v6 ConnectWallet: Error during connection:", error); let errorMsg = "Wallet connection failed.";
         if (error.message?.includes("User closed modal") || error.message?.includes("Connection declined")) { errorMsg = "Wallet connection cancelled."; console.log("v6 ConnectWallet: Connection cancelled by user."); }
         else if (error.message?.includes("rejected")) { errorMsg = "Connection request rejected."; console.log("v6 ConnectWallet: Connection rejected by user or wallet."); }
         else { console.error("v6 ConnectWallet: Raw connection error:", error); }
         if (statusIndicator) { statusIndicator.textContent = errorMsg; statusIndicator.className = 'denied'; } addMessageToChat(errorMsg + " much reject. wow.", "system");
         userAddress = null; isVerified = false; if (connectWalletButton) { connectWalletButton.textContent = "Connect Wallet"; connectWalletButton.disabled = false; } updateMessageLimitIndicator();
     }
}


// --- checkTokenBalance function ---
// (No code changes needed, logging is present)
async function checkTokenBalance() {
     console.log("v6 CheckTokenBalance: Called. User Address:", userAddress); if (!userAddress || !ethersProvider) { /*...*/ return; } console.log("v6 CheckTokenBalance: Verifying token:", TOKEN_CONTRACT_ADDRESS); /*...*/
     try { const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, erc20Abi, ethersProvider); const balance = await tokenContract.balanceOf(userAddress); const balanceFormatted = ethers.utils.formatUnits(balance, TOKEN_DECIMALS); console.log(`v6 CheckTokenBalance: Raw Balance: ${balance.toString()}, Formatted: ${balanceFormatted}`);
         if (balance.gt(0)) { isVerified = true; const displayBalance = parseFloat(balanceFormatted).toFixed(4); if(statusIndicator) { statusIndicator.textContent = `✅ STFUDoge Verified (${displayBalance} $STFU)...`; statusIndicator.className = 'verified'; } addMessageToChat("Hah, you actually have coins...", "bot"); }
         else { isVerified = false; if(statusIndicator) { statusIndicator.textContent = `❌ No $STFU found...`; statusIndicator.className = 'denied'; } addMessageToChat(`Zero $STFU? pathetic... ${buyStfuLink?.outerHTML || 'the buy button'}...`, "bot"); }
     } catch (error) { console.error("v6 CheckTokenBalance: Error checking balance:", error); if(statusIndicator) { statusIndicator.textContent = "Error checking balance..."; statusIndicator.className = 'denied'; } addMessageToChat("Can't even check balance...", "bot"); isVerified = false; }
     finally { console.log("v6 CheckTokenBalance: Finished. Verified status:", isVerified); updateMessageLimitIndicator(); }
}

// --- initializeChat function ---
// (No changes needed)
function initializeChat() { console.log("v6 InitializeChat: Setting up initial history."); conversationHistory.push({ role: "assistant", content: "Grrr. What you want, peasant?..." }); }

// --- setupEventListeners function ---
// (No changes needed, logging is present)
function setupEventListeners() { console.log("v6 SetupEventListeners: Attaching listeners..."); try { /*...*/ } catch(error) { console.error("v6 SetupEventListeners: CRITICAL ERROR...", error); /*...*/ } console.log("v6 SetupEventListeners: Finished."); }

// --- updateCurrentYear function ---
// (No changes needed)
function updateCurrentYear() { if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear(); }

// --- handleUserInput function ---
// (No changes needed, logging is present)
function handleUserInput() { console.log("v6 HandleUserInput: Fired."); /*...*/ }

// --- getBotResponse function ---
// (No changes needed, uses updated model constant, logging is present)
async function getBotResponse(userMessage) {
     console.log("v6 GetBotResponse: Called..."); const systemPrompt = `You are STFUDoge... Status: ${isVerified ? 'VERIFIED' : 'PEASANT'}`; /*...*/ let messagesToSend = []; /*...*/
     console.log("v6 GetBotResponse: Sending messages to proxy:", messagesToSend); const proxyApiUrl = "/api/chatProxy"; const modelToUse = isVerified ? VERIFIED_USER_MODEL : FREE_USER_MODEL; console.log("v6 GetBotResponse: Using model:", modelToUse);
     try { const requestBody = { model: modelToUse, messages: messagesToSend }; console.log("v6 GetBotResponse: Sending POST to", proxyApiUrl); const response = await fetch(proxyApiUrl, { /*...*/ }); console.log("v6 GetBotResponse: Received response status:", response.status);
         if (!response.ok) { let errorData; try { errorData = await response.json(); } catch { /*...*/ } console.error("v6 GetBotResponse: Proxy/API Error Response:", errorData); throw new Error(/*...*/); }
         const data = await response.json(); console.log("v6 GetBotResponse: Success response data:", data); let botReply = data.choices?.[0]?.message?.content?.trim() || /*...*/;
         // Doge speak enforcement
         if (!/(\.|!|\?|\s)(such|much|very|so|wow)\b.*\.\s*wow\.$/i.test(botReply) && !/\s+wow\.$/i.test(botReply)) { /*...*/ botReply += /*...*/; }
         console.log("v6 GetBotResponse: Final bot reply:", botReply); conversationHistory.push({ role: "assistant", content: botReply }); addMessageToChat(botReply, "bot");
         if (isVerified && Math.random() < 0.03) { generateMemePlaceholder(userMessage, botReply); }
     } catch (error) { console.error('v6 GetBotResponse: CRITICAL Error fetching bot response via proxy:', error); addMessageToChat(`Gah! My circuits fried... ${error.message}.`, "bot"); }
     finally { console.log("v6 GetBotResponse: Re-enabling input."); enableInput(); }
}

// --- generateMemePlaceholder function ---
// (No changes needed)
function generateMemePlaceholder(userMsg, botReply) { console.log("v6 GenerateMemePlaceholder: Called..."); /*...*/ }

// --- addMessageToChat function ---
// (No changes needed, logging is present)
function addMessageToChat(text, sender, imageUrl = null) { console.log(`v6 AddMessageToChat: Adding message - Sender: ${sender}...`); try { /*...*/ } catch (error) { console.error("v6 AddMessageToChat: Error adding message:", error); } }

// --- enableInput function ---
// (No changes needed)
function enableInput() { console.log("v6 EnableInput: Re-enabling input..."); try { /*...*/ } catch(error) { console.error("v6 EnableInput: Error:", error); } }

// --- Message Limiting functions ---
// (No changes needed, logging is present)
function getTodayDateString() { return new Date().toISOString().split('T')[0]; }
function getMessageCount() { /*...*/ return { count, limitReached: count >= MAX_FREE_MESSAGES }; }
function incrementMessageCount() { /*...*/ console.log(`v6 IncrementMessageCount: Count incremented...`); }
function updateMessageLimitIndicator() { /*...*/ }
function displayLimitReachedMessage() { console.log("v6 DisplayLimitReachedMessage: Triggered."); /*...*/ }

// --- Theme Toggling ---
// (No changes needed, logging is present)
function loadThemePreference() { console.log("v6 LoadThemePreference: Loading..."); try { /*...*/ } catch (error) { console.error("v6 LoadThemePreference: Error:", error); } }
function toggleTheme() { console.log("v6 ToggleTheme: Button clicked..."); try { /*...*/ } catch (error) { console.error("v6 ToggleTheme: Error:", error); } }

// --- Easter Egg ---
// (No changes needed)
function triggerEasterEgg() { console.log("v6 TriggerEasterEgg: Clicked!"); alert("much moon! wow!"); /*...*/ }

console.log("v6: chat.js script fully parsed.");
