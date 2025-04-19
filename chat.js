// File: chat.js (Client-Side Logic - Calls /api/chatProxy)
// Updated: 2025-04-19 (v4 Logging) // Assuming date from context
// Purpose: Handles UI, Wallet Connection, and sends requests to the secure serverless proxy.

console.log("chat.js script started - v4 Logging"); // Log script start with version

// --- Configuration ---
// !!! IMPORTANT: Make sure this Project ID is correct! !!!
const WALLETCONNECT_PROJECT_ID = '9d4b5847e95ec6872d7ee4d791ee2640'; // 
const TOKEN_CONTRACT_ADDRESS = '0xd8d01A667A8fEeF10077c61018b4F8fA533703eD';
const CHAIN_ID = 56;
const CHAIN_RPC_URL = 'https://bsc.publicnode.com'; // Alternative RPC
const TOKEN_DECIMALS = 18;
const MAX_FREE_MESSAGES = 50; // Increased limit
const FREE_USER_MODEL = "openchat/openchat-7b:free";
const VERIFIED_USER_MODEL = "openai/gpt-3.5-turbo";

// --- DOM Elements ---
// (Assign elements - ensure these IDs exist in index.html)
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
console.log("v4: DOM elements obtained");

// --- Application State ---
let web3Modal = null; // Initialize as null
let ethersProvider = null;
let signer = null;
let userAddress = null;
let isVerified = false;
let conversationHistory = [];
const MESSAGE_COUNT_KEY = 'stfudoge_messageCount';
const LAST_RESET_KEY = 'stfudoge_lastReset';
const THEME_KEY = 'stfudoge_theme';
console.log("v4: App state initialized");

// --- Minimal ABI ---
const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("v4: DOMContentLoaded event fired");
    // Make sure wallet connect ID is set before initializing
    if (!WALLETCONNECT_PROJECT_ID || WALLETCONNECT_PROJECT_ID === 'YOUR_WALLETCONNECT_PROJECT_ID') {
         console.error("v4 FATAL: WalletConnect Project ID is missing in chat.js. Replace 'YOUR_WALLETCONNECT_PROJECT_ID'. Wallet cannot initialize.");
         if (statusIndicator) { // Check if element exists before updating
            statusIndicator.textContent = "Wallet Config Error (Project ID)";
            statusIndicator.className = 'denied';
         }
         addMessageToChat("Error: Wallet setup is incomplete (Missing Project ID). Admin needs to fix this. much config fail. wow.", "system");
    } else {
        console.log("v4: Project ID found. Initializing wallet modal...");
        initializeWeb3Modal(); // Initialize only if Project ID seems present
    }
    // Load other parts even if wallet fails initially
    loadThemePreference();
    setupEventListeners();
    initializeChat();
    updateMessageLimitIndicator();
    updateCurrentYear();
    console.log("v4: Initial page setup complete");
});

// --- Web3Modal & Wallet Connection ---
function initializeWeb3Modal() {
    console.log("v4 InitializeWeb3Modal: Function called.");

    // Increased timeout for library loading
    setTimeout(() => {
        console.log("v4 InitializeWeb3Modal: Timeout finished. Checking libraries...");
        console.log("v4 InitializeWeb3Modal: typeof window.Web3Modal =", typeof window.Web3Modal);
        if (window.Web3Modal) console.log("v4 InitializeWeb3Modal: window.Web3Modal.Ethers5 =", window.Web3Modal.Ethers5);
        console.log("v4 InitializeWeb3Modal: typeof window.ethers =", typeof window.ethers);

        if (typeof window.Web3Modal === 'undefined' || typeof window.Web3Modal.Ethers5 === 'undefined' || typeof window.ethers === 'undefined') {
            console.error("v4 InitializeWeb3Modal: Web3Modal or Ethers library not loaded properly after wait. Check script tags, CDNs, or network connection.");
            if (statusIndicator) {
                statusIndicator.textContent = "Wallet init failed (Lib Load Error)";
                statusIndicator.className = 'denied';
            }
            addMessageToChat("Error: Wallet libraries failed to load. Try refreshing. much sadness. wow.", "system");
            return;
        }

        console.log("v4 InitializeWeb3Modal: Libraries seem loaded. Proceeding with init.");
        console.log("v4 InitializeWeb3Modal: Using Project ID:", WALLETCONNECT_PROJECT_ID);
        console.log("v4 InitializeWeb3Modal: Using RPC URL:", CHAIN_RPC_URL);

        try {
            const { Ethers5Adapter } = window.Web3Modal.Ethers5;
            const chains = [{ chainId: CHAIN_ID, name: 'BNB Smart Chain', currency: 'BNB', explorerUrl: 'https://bscscan.com', rpcUrl: CHAIN_RPC_URL }];
            const ethersConfig = { ethers: window.ethers, provider: new window.ethers.providers.JsonRpcProvider(CHAIN_RPC_URL) };
            const modalConfig = {
                defaultChain: chains[0], ethersConfig: ethersConfig, chains: chains, projectId: WALLETCONNECT_PROJECT_ID, enableAnalytics: false,
                metadata: { name: 'STFUDoge Chat', description: 'Chat with the STFUDoge bot', url: window.location.href, icons: [window.location.origin + '/assets/STFUDoge_Favicon.jpg'] }
            };

            console.log("v4 InitializeWeb3Modal: Creating Ethers5Adapter with config:", modalConfig);
            web3Modal = new Ethers5Adapter(modalConfig); // Assign to the global variable
            console.log("v4 InitializeWeb3Modal: Ethers5Adapter created successfully. web3Modal object:", web3Modal);

            if (statusIndicator) {
                statusIndicator.textContent = "Wallet Ready. Connect pls."; // Update status
                 statusIndicator.className = ''; // Reset potential error class
            }

        } catch (error) {
            console.error("v4 InitializeWeb3Modal: Error during Ethers5Adapter creation:", error);
            if (statusIndicator) {
                statusIndicator.textContent = "Wallet init failed (Adapter Error)";
                statusIndicator.className = 'denied';
            }
            addMessageToChat("Error initializing wallet connection adapter. much fail. wow. " + error.message, "system");
            web3Modal = null; // Ensure it's null on failure
        }
    }, 1500); // Increased timeout to 1.5 seconds
}

async function connectWallet() {
    console.log("v4 ConnectWallet: Button clicked. Checking web3Modal state:", web3Modal);
    if (!web3Modal) {
        console.error("v4 ConnectWallet: web3Modal is not initialized or initialization failed. Cannot connect.");
        if (statusIndicator) {
            statusIndicator.textContent = "Wallet init error. Refresh maybe?";
            statusIndicator.className = 'denied';
        }
        addMessageToChat("Wallet system isn't ready. Try refreshing the page. much confusion. wow.", "system")
        return;
    }

    if (statusIndicator) {
        statusIndicator.textContent = "Connecting wallet...";
        statusIndicator.className = '';
    }
    console.log("v4 ConnectWallet: Opening wallet connection modal...");

    try {
        // Ensure button is disabled while connecting
        if (connectWalletButton) connectWalletButton.disabled = true;

        const modalProvider = await web3Modal.connect();
        if (!modalProvider) {
             console.error("v4 ConnectWallet: web3Modal.connect() returned null provider.");
             throw new Error("Wallet connection cancelled or failed.");
        }
        console.log("v4 ConnectWallet: Modal provider obtained:", modalProvider);

        ethersProvider = new ethers.providers.Web3Provider(modalProvider);
        signer = ethersProvider.getSigner();
        userAddress = await signer.getAddress();

        console.log("v4 ConnectWallet: Wallet Connected. Address:", userAddress);
        if (connectWalletButton) connectWalletButton.textContent = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
        // connectWalletButton remains disabled

        if (statusIndicator) statusIndicator.textContent = "Wallet connected. Verifying $STFU...";
        await checkTokenBalance(); // Check balance after successful connection

    } catch (error) {
        console.error("v4 ConnectWallet: Error during connection:", error);
        let errorMsg = "Wallet connection failed.";
        if (error.message?.includes("User closed modal") || error.message?.includes("Connection declined")) {
             errorMsg = "Wallet connection cancelled.";
             console.log("v4 ConnectWallet: Connection cancelled by user.");
        } else if (error.message?.includes("rejected")) {
             errorMsg = "Connection request rejected.";
             console.log("v4 ConnectWallet: Connection rejected by user or wallet.");
        } else {
            // Log the raw error for more details
            console.error("v4 ConnectWallet: Raw connection error:", error);
        }

        if (statusIndicator) {
            statusIndicator.textContent = errorMsg;
            statusIndicator.className = 'denied';
        }
        addMessageToChat(errorMsg + " much reject. wow.", "system");

        // Reset state
        userAddress = null;
        isVerified = false;
        if (connectWalletButton) {
            connectWalletButton.textContent = "Connect Wallet";
            connectWalletButton.disabled = false; // Re-enable button on failure
        }
        updateMessageLimitIndicator(); // Update limit display on failure
    }
}

// --- checkTokenBalance function: Adding logs ---
async function checkTokenBalance() {
    console.log("v4 CheckTokenBalance: Called. User Address:", userAddress);
    if (!userAddress || !ethersProvider) {
        console.log("v4 CheckTokenBalance: Missing address or provider.");
        if(statusIndicator) { statusIndicator.textContent = "Connect wallet first."; statusIndicator.className = ''; }
        return;
    }
    console.log("v4 CheckTokenBalance: Verifying token:", TOKEN_CONTRACT_ADDRESS);
    if(statusIndicator) { statusIndicator.textContent = `Verifying $STFU for ${userAddress.substring(0, 6)}...`; statusIndicator.className = ''; }
    try {
        const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, erc20Abi, ethersProvider);
        const balance = await tokenContract.balanceOf(userAddress);
        const balanceFormatted = ethers.utils.formatUnits(balance, TOKEN_DECIMALS);
        console.log(`v4 CheckTokenBalance: Raw Balance: ${balance.toString()}, Formatted: ${balanceFormatted}`);
        if (balance.gt(0)) {
            isVerified = true;
            const displayBalance = parseFloat(balanceFormatted).toFixed(4);
            if(statusIndicator) { statusIndicator.textContent = `✅ STFUDoge Verified (${displayBalance} $STFU). Unlimited access granted. such wow.`; statusIndicator.className = 'verified'; }
            addMessageToChat("Hah, you actually have coins. Fine, talk. Don't waste my time. much verified. wow.", "bot");
        } else {
            isVerified = false;
             if(statusIndicator) { statusIndicator.textContent = `❌ No $STFU found. Get some tokens, peasant.`; statusIndicator.className = 'denied'; }
            addMessageToChat(`Zero $STFU? pathetic. Go buy some or STFU. ${buyStfuLink?.outerHTML || 'the buy button'}. very poor. wow.`, "bot");
        }
    } catch (error) {
        console.error("v4 CheckTokenBalance: Error checking balance:", error);
         if(statusIndicator) { statusIndicator.textContent = "Error checking balance. Network issue?"; statusIndicator.className = 'denied'; }
        addMessageToChat("Can't even check balance. Network broken? Or maybe you are? much error. wow.", "bot");
        isVerified = false;
    } finally {
         console.log("v4 CheckTokenBalance: Finished. Verified status:", isVerified);
         updateMessageLimitIndicator();
    }
}

// --- initializeChat: Adding log ---
function initializeChat() {
    console.log("v4 InitializeChat: Setting up initial conversation history.");
    // Ensure chatWindow exists before adding initial message? No, initial message is in HTML.
    conversationHistory.push({ role: "assistant", content: "Grrr. What you want, peasant? Talk fast. Or buy $STFU. such impatience. wow." });
}

// --- setupEventListeners: Adding logs ---
function setupEventListeners() {
    console.log("v4 SetupEventListeners: Attaching listeners...");
    try {
        if (sendButton && userInput) {
             sendButton.addEventListener('click', handleUserInput);
             userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !sendButton.disabled) handleUserInput(); });
             console.log("v4 SetupEventListeners: Chat listeners attached.");
        } else { console.error("v4 SetupEventListeners: Chat input/button not found!"); }

        if (connectWalletButton) {
            connectWalletButton.addEventListener('click', connectWallet);
            console.log("v4 SetupEventListeners: Wallet connect listener attached.");
        } else { console.error("v4 SetupEventListeners: Connect wallet button not found!"); }

        if (themeToggleButton) {
            themeToggleButton.addEventListener('click', toggleTheme);
            console.log("v4 SetupEventListeners: Theme toggle listener attached.");
        } else { console.error("v4 SetupEventListeners: Theme toggle button not found!"); }

         if (easterEggTrigger) {
            easterEggTrigger.addEventListener('click', triggerEasterEgg);
             console.log("v4 SetupEventListeners: Easter egg listener attached.");
        } else { console.warn("v4 SetupEventListeners: Easter egg trigger not found."); }

    } catch(error) {
        console.error("v4 SetupEventListeners: CRITICAL ERROR attaching event listeners:", error);
        addMessageToChat("Fatal Error: UI could not be initialized. Please refresh. much broken. wow.", "system");
    }
     console.log("v4 SetupEventListeners: Finished attaching listeners.");
}

// --- updateCurrentYear: No changes needed ---
function updateCurrentYear() { if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear(); }

// --- handleUserInput: Adding logs ---
function handleUserInput() {
    console.log("v4 HandleUserInput: Fired.");
    if (!userInput || !sendButton) { console.error("v4 HandleUserInput: Input or Send button missing!"); return; } // Safety check

    const messageText = userInput.value.trim();
    if (!messageText) {
        console.log("v4 HandleUserInput: Empty input, ignoring.");
        return;
    }
    console.log("v4 HandleUserInput: User typed:", messageText);

    // Check limits *before* adding message visually or incrementing
    if (!isVerified) {
        const { count, limitReached } = getMessageCount();
        console.log(`v4 HandleUserInput: Free user. Count: ${count}, Limit Reached: ${limitReached}`);
        if (limitReached) {
            console.log("v4 HandleUserInput: Message limit reached, displaying message.");
            displayLimitReachedMessage();
            return; // Stop processing
        }
    } else {
         console.log("v4 HandleUserInput: User is verified.");
    }

    console.log("v4 HandleUserInput: Adding user message to chat window.");
    addMessageToChat(messageText, "user"); // Display user message immediately

    // Clear input & disable buttons
    userInput.value = '';
    sendButton.disabled = true;
    userInput.disabled = true;
    console.log("v4 HandleUserInput: Input cleared, buttons disabled.");

    // Increment count *after* successful validation and UI update for free users
    if (!isVerified) {
         incrementMessageCount(); // Increment happens here now
         updateMessageLimitIndicator();
    } else {
         if (messageLimitIndicator) messageLimitIndicator.textContent = 'Unlimited Messages. such VIP. wow.';
    }

    // Add to history *before* sending to API
    conversationHistory.push({ role: "user", content: messageText });
    console.log("v4 HandleUserInput: Message added to history. Current history length:", conversationHistory.length);

    console.log("v4 HandleUserInput: Calling getBotResponse...");
    getBotResponse(messageText); // Get the bot's reply
}

// --- getBotResponse: Adding logs ---
async function getBotResponse(userMessage) {
    console.log("v4 GetBotResponse: Called for user message:", userMessage);
    const systemPrompt = `You are STFUDoge... Current user status: ${isVerified ? 'VERIFIED $STFU Holder' : 'PEASANT (No $STFU)'}`; // Truncated
    let messagesToSend = [];
    // (Context management logic remains same)
     if (conversationHistory.length <= 2) messagesToSend.push({ role: "system", content: systemPrompt });
    messagesToSend = messagesToSend.concat([...conversationHistory]);
    const historyLimit = 10; // Manage history size
    if (messagesToSend.length > historyLimit + 1) {
        messagesToSend = messagesToSend.slice(-(historyLimit));
        if(messagesToSend.length > 0 && messagesToSend[0].role !== "system" && conversationHistory.length > 2) {
             messagesToSend.unshift({ role: "system", content: systemPrompt });
        }
    }
    console.log("v4 GetBotResponse: Sending messages to proxy:", messagesToSend);

    const proxyApiUrl = "/api/chatProxy"; // Ensure this path is correct
    const modelToUse = isVerified ? VERIFIED_USER_MODEL : FREE_USER_MODEL;
    console.log("v4 GetBotResponse: Using model:", modelToUse);

    try {
        const requestBody = { model: modelToUse, messages: messagesToSend };
        console.log("v4 GetBotResponse: Sending POST to", proxyApiUrl, "with body:", requestBody);

        const response = await fetch(proxyApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        console.log("v4 GetBotResponse: Received response status:", response.status, response.statusText);

        if (!response.ok) {
            let errorData;
            try { errorData = await response.json(); } catch { errorData = { error: `Could not parse error response. Status: ${response.status}` }; }
            console.error("v4 GetBotResponse: Proxy/API Error Response:", errorData);
            throw new Error(`API request failed: ${response.statusText} - ${errorData.error || 'Unknown error via proxy'}`);
        }

        const data = await response.json();
        console.log("v4 GetBotResponse: Success response data:", data);
        let botReply = data.choices?.[0]?.message?.content?.trim() || "Grrr... brain fart. Try again? much confused. wow.";

        // (Doge speak enforcement remains same)
        if (!/(\.|!|\?|\s)(such|much|very|so|wow)\b.*\.\s*wow\.$/i.test(botReply) && !/\s+wow\.$/i.test(botReply)) {
             const dogeEndings = ["such token. wow.", "very crypto. much profit.", "so random. wow.", "much meme. wow.", "very chat. wow."];
             botReply += " " + dogeEndings[Math.floor(Math.random() * dogeEndings.length)];
        }

        console.log("v4 GetBotResponse: Final bot reply:", botReply);
        conversationHistory.push({ role: "assistant", content: botReply });
        addMessageToChat(botReply, "bot");

        if (isVerified && Math.random() < 0.03) { generateMemePlaceholder(userMessage, botReply); }

    } catch (error) {
        console.error('v4 GetBotResponse: CRITICAL Error fetching bot response via proxy:', error);
        addMessageToChat(`Gah! My circuits fried. Maybe the proxy is down? Or the main brain? ${error.message}. much error. wow.`, "bot");
    } finally {
        console.log("v4 GetBotResponse: Re-enabling input.");
        enableInput();
    }
}

// --- generateMemePlaceholder: Adding log ---
function generateMemePlaceholder(userMsg, botReply) {
    console.log("v4 GenerateMemePlaceholder: Called (Placeholder). User:", userMsg, "Bot:", botReply);
    const memePromptSuggestion = `Create a funny/weird meme about: ${userMsg} and ${botReply.substring(0, 50)}...`;
    const caption = "Made this for you, genius. much art. wow.";
    addMessageToChat(`${caption}\n(Imagine a weird meme here based on: "${memePromptSuggestion}")`, "bot-meme");
}

// --- addMessageToChat: Adding logs ---
function addMessageToChat(text, sender, imageUrl = null) {
    console.log(`v4 AddMessageToChat: Adding message - Sender: ${sender}, Text: ${text.substring(0, 50)}...`, imageUrl ? `ImageURL: ${imageUrl}` : '');
    try {
        if(!chatWindow) {
            console.error("v4 AddMessageToChat: chatWindow element not found!");
            return;
        }
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        const textElement = document.createElement('p');
        textElement.textContent = text; // Use textContent for safety
        messageElement.appendChild(textElement);

        if (imageUrl) {
            const imageElement = document.createElement('img');
            imageElement.src = imageUrl;
            imageElement.alt = "Generated Meme";
            imageElement.classList.add('meme-image');
            messageElement.appendChild(imageElement);
        }

        chatWindow.appendChild(messageElement);
        chatWindow.scrollTop = chatWindow.scrollHeight; // Instant scroll to bottom
        console.log("v4 AddMessageToChat: Message appended to window.");
    } catch (error) {
         console.error("v4 AddMessageToChat: Error adding message to DOM:", error);
    }
}

// --- enableInput: Adding log ---
function enableInput() {
    console.log("v4 EnableInput: Re-enabling input field and send button.");
    try {
        if (sendButton) sendButton.disabled = false;
        if (userInput) {
             userInput.disabled = false;
             userInput.focus();
             userInput.placeholder="Type message or STFU...";
        }
    } catch(error) {
         console.error("v4 EnableInput: Error re-enabling input:", error);
    }
}

// --- Message Limiting functions: Adding logs ---
function getTodayDateString() { return new Date().toISOString().split('T')[0]; }

function getMessageCount() {
    const today = getTodayDateString(); const lastReset = localStorage.getItem(LAST_RESET_KEY); let count = 0;
    if (lastReset === today) count = parseInt(localStorage.getItem(MESSAGE_COUNT_KEY) || '0', 10);
    else { localStorage.setItem(MESSAGE_COUNT_KEY, '0'); localStorage.setItem(LAST_RESET_KEY, today); count = 0; console.log("v4 GetMessageCount: Message count reset for new day."); }
    // console.log(`v4 GetMessageCount: Count is ${count}. Limit reached: ${count >= MAX_FREE_MESSAGES}`); // Logged in handleUserInput now
    return { count, limitReached: count >= MAX_FREE_MESSAGES };
 }
function incrementMessageCount() {
    const { count } = getMessageCount(); const newCount = count + 1; localStorage.setItem(MESSAGE_COUNT_KEY, newCount.toString());
    console.log(`v4 IncrementMessageCount: Count incremented to ${newCount}`);
}
function updateMessageLimitIndicator() {
    // console.log("v4 UpdateMessageLimitIndicator: Called. Verified:", isVerified); // Can be noisy, check count instead
    if(!messageLimitIndicator) { console.error("v4 UpdateMessageLimitIndicator: Indicator element not found!"); return; }
     if (isVerified) { messageLimitIndicator.textContent = 'Unlimited Messages. such VIP. wow.'; }
     else { const { count } = getMessageCount(); const remaining = Math.max(0, MAX_FREE_MESSAGES - count); messageLimitIndicator.textContent = `Messages remaining: ${remaining}`; }
     messageLimitIndicator.style.display = 'block';
}
function displayLimitReachedMessage() {
    console.log("v4 DisplayLimitReachedMessage: Limit reached message triggered.");
     const limitMessages = [
        "why so poor? Connect wallet, peasant.",
        "No coins, no chat. STFU.",
        `Limit reached! Buy $STFU or wait until tomorrow. ${buyStfuLink?.outerHTML || 'the buy button'}`,
        "Seriously? Still no $STFU? My time ain't free. much broke. wow.",
        "Outta messages. Need $STFU verification. Connect wallet or get lost."
     ]; const randomMsg = limitMessages[Math.floor(Math.random() * limitMessages.length)]; addMessageToChat(randomMsg, "bot");
     if(userInput) { userInput.value = ''; userInput.disabled = true; userInput.placeholder = "Message limit reached..."; }
     if(sendButton) sendButton.disabled = true;
 }

// --- Theme Toggling: Adding logs ---
function loadThemePreference() {
    try {
        const savedTheme = localStorage.getItem(THEME_KEY);
        console.log("v4 LoadThemePreference: Saved theme is:", savedTheme);
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
        }
         console.log("v4 LoadThemePreference: Body classes after load:", document.body.className);
    } catch (error) {
        console.error("v4 LoadThemePreference: Error loading theme:", error);
    }
}

function toggleTheme() {
    console.log("v4 ToggleTheme: Button clicked. Current body classes:", document.body.className);
    try {
        if (document.body.classList.contains('dark-mode')) {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            localStorage.setItem(THEME_KEY, 'light');
            console.log("v4 ToggleTheme: Switched to light mode.");
        } else {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            localStorage.setItem(THEME_KEY, 'dark');
             console.log("v4 ToggleTheme: Switched to dark mode.");
        }
         console.log("v4 ToggleTheme: Body classes after toggle:", document.body.className);
    } catch (error) {
        console.error("v4 ToggleTheme: Error toggling theme:", error);
    }
}

// --- Easter Egg: No changes needed ---
function triggerEasterEgg() { console.log("v4 TriggerEasterEgg: Clicked!"); alert("much moon! wow!"); /* ... */ }

// Final log to indicate script finished loading (or at least parsing)
console.log("v4: chat.js script fully parsed.");
