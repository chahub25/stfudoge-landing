// File: chat.js (Client-Side Logic - Calls /api/chatProxy)
// Purpose: Handles UI, Wallet Connection, and sends requests to the secure serverless proxy.
// NOTE: Ensure 'YOUR_WALLETCONNECT_PROJECT_ID' is replaced below.
// NOTE: This file relies on the existence of `api/chatProxy.js` and the OPENROUTER_API_KEY set in Vercel.

// --- Configuration (Client-Side Safe Values) ---
const WALLETCONNECT_PROJECT_ID = 'YOUR_WALLETCONNECT_PROJECT_ID'; // <-- Replace with your ACTUAL WC Project ID!
const TOKEN_CONTRACT_ADDRESS = '0xd8d01A667A8fEeF10077c61018b4F8fA533703eD'; // <-- STFUDoge Token Address
const CHAIN_ID = 56; // BNB Smart Chain Mainnet
const CHAIN_RPC_URL = 'https://bsc-dataseed.binance.org/'; // Public BSC RPC
const TOKEN_DECIMALS = 18;

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
let isVerified = false; // Tracks if the user holds $STFU
let conversationHistory = []; // Stores chat messages for API context
const MAX_FREE_MESSAGES = 3;
const MESSAGE_COUNT_KEY = 'stfudoge_messageCount';
const LAST_RESET_KEY = 'stfudoge_lastReset';
const THEME_KEY = 'stfudoge_theme';

// --- Minimal ABI for balanceOf ---
const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)"
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeWeb3Modal(); // Wallet init might take a moment
    loadThemePreference();
    setupEventListeners();
    initializeChat();
    updateMessageLimitIndicator(); // Show initial limit
    updateCurrentYear();
});

// --- Web3Modal & Wallet Connection ---
function initializeWeb3Modal() {
    console.log("Attempting to initialize Web3Modal..."); // Debug log

    // Add a small delay and check if libraries are loaded
    setTimeout(() => {
        if (typeof window.Web3Modal === 'undefined' || typeof window.Web3Modal.Ethers5 === 'undefined') {
            console.error("Web3Modal library (or Ethers5 adapter) not found. Check script tags in index.html.");
            statusIndicator.textContent = "Wallet init failed (Lib Load Error 1)";
            statusIndicator.className = 'denied';
            addMessageToChat("Error: Wallet libraries failed to load. Try refreshing the page. much sadness. wow.", "system");
            return;
        }
         if (typeof window.ethers === 'undefined') {
             console.error("Ethers.js library not found. Check script tags in index.html.");
             statusIndicator.textContent = "Wallet init failed (Lib Load Error 2)";
             statusIndicator.className = 'denied';
             addMessageToChat("Error: Wallet libraries failed to load (Ethers). Try refreshing. very frustrating. wow.", "system");
            return;
        }
         // *** Check if WalletConnect Project ID was replaced ***
         if (!WALLETCONNECT_PROJECT_ID || WALLETCONNECT_PROJECT_ID === 'YOUR_WALLETCONNECT_PROJECT_ID') {
             console.error("WalletConnect Project ID is missing in chat.js configuration. Replace 'YOUR_WALLETCONNECT_PROJECT_ID'.");
             statusIndicator.textContent = "Wallet Config Error (Project ID)";
             statusIndicator.className = 'denied';
             addMessageToChat("Error: Wallet setup is incomplete (Missing Project ID). Admin needs to fix this. much config fail. wow.", "system");
            return; // Stop initialization if Project ID is missing
        }

        console.log("Web3Modal and Ethers libraries seem loaded. Proceeding with init."); // Debug log

        try {
            const { Ethers5Adapter } = window.Web3Modal.Ethers5;

            const chains = [
                {
                    chainId: CHAIN_ID,
                    name: 'BNB Smart Chain',
                    currency: 'BNB',
                    explorerUrl: 'https://bscscan.com',
                    rpcUrl: CHAIN_RPC_URL
                }
            ];

             // Ensure ethersConfig uses a valid provider instance
            const ethersConfig = {
                ethers: window.ethers, // Pass the ethers library instance
                provider: new window.ethers.providers.JsonRpcProvider(CHAIN_RPC_URL) // Explicitly create provider
            };

            const modalConfig = {
                defaultChain: chains[0],
                ethersConfig: ethersConfig,
                chains: chains,
                projectId: WALLETCONNECT_PROJECT_ID, // Use the constant defined above (MUST BE REPLACED)
                enableAnalytics: false,
                 metadata: {
                    name: 'STFUDoge Chat',
                    description: 'Chat with the STFUDoge bot',
                    url: window.location.href,
                    icons: [window.location.origin + '/assets/STFUDoge_Favicon.jpg'] // Ensure this path is correct
                }
            };

            web3Modal = new Ethers5Adapter(modalConfig);

            console.log("Web3Modal Ethers5Adapter initialized successfully."); // Debug log
            statusIndicator.textContent = "Wallet Ready. Connect pls."; // Initial ready state

        } catch (error) {
            console.error("Error initializing Web3Modal Adapter:", error);
            statusIndicator.textContent = "Wallet init failed (Adapter Error)";
            statusIndicator.className = 'denied';
            addMessageToChat("Error initializing wallet connection adapter. much fail. wow. " + error.message, "system");
        }
    }, 500); // Wait 500ms for scripts to hopefully load
}

// (The rest of the functions: connectWallet, checkTokenBalance, initializeChat, setupEventListeners, updateCurrentYear, handleUserInput, getBotResponse, generateMemePlaceholder, addMessageToChat, enableInput, getTodayDateString, getMessageCount, incrementMessageCount, updateMessageLimitIndicator, displayLimitReachedMessage, loadThemePreference, toggleTheme, triggerEasterEgg remain the same as in the previous full file response, including the updated getBotResponse function that calls /api/chatProxy)


async function connectWallet() {
    if (!web3Modal) {
        console.error("Web3Modal not initialized or initialization failed.");
        statusIndicator.textContent = "Wallet init failed. Refresh maybe?";
        statusIndicator.className = 'denied';
        return;
    }
    try {
        statusIndicator.textContent = "Connecting wallet...";
        statusIndicator.className = ''; // Reset class

        const modalProvider = await web3Modal.connect();
        if (!modalProvider) {
             throw new Error("Web3Modal connection returned null provider.");
        }

        ethersProvider = new ethers.providers.Web3Provider(modalProvider);
        signer = ethersProvider.getSigner();
        userAddress = await signer.getAddress();

        console.log("Wallet Connected:", userAddress);
        connectWalletButton.textContent = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
        connectWalletButton.disabled = true;

        await checkTokenBalance();

    } catch (error) {
        console.error("Could not connect wallet:", error);
        statusIndicator.textContent = "Wallet connection failed.";
        statusIndicator.className = 'denied';
        userAddress = null;
        isVerified = false;
        connectWalletButton.textContent = "Connect Wallet";
        connectWalletButton.disabled = false;
        updateMessageLimitIndicator();
    }
}

async function checkTokenBalance() {
    if (!userAddress || !ethersProvider) {
        statusIndicator.textContent = "Connect wallet first.";
        statusIndicator.className = '';
        return;
    }

    statusIndicator.textContent = `Verifying $STFU for ${userAddress.substring(0, 6)}...`;
    statusIndicator.className = '';

    try {
        const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, erc20Abi, ethersProvider);
        const balance = await tokenContract.balanceOf(userAddress);
        const balanceFormatted = ethers.utils.formatUnits(balance, TOKEN_DECIMALS);

        console.log(`$STFU Balance for ${userAddress}: ${balanceFormatted}`);

        if (balance.gt(0)) { // Use BigNumber greater than comparison
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
    } catch (error) {
        console.error("Error checking token balance:", error);
        statusIndicator.textContent = "Error checking balance. Network issue?";
        statusIndicator.className = 'denied';
        addMessageToChat("Can't even check balance. Network broken? Or maybe you are? much error. wow.", "bot");
        isVerified = false;
    } finally {
         updateMessageLimitIndicator();
    }
}

function initializeChat() {
    conversationHistory.push({ role: "assistant", content: "Grrr. What you want, peasant? Talk fast. Or buy $STFU. such impatience. wow." });
}

function setupEventListeners() {
    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !sendButton.disabled) {
            handleUserInput();
        }
    });
    connectWalletButton.addEventListener('click', connectWallet);
    themeToggleButton.addEventListener('click', toggleTheme);
    easterEggTrigger.addEventListener('click', triggerEasterEgg);
}

function updateCurrentYear() {
     if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
}

function handleUserInput() {
    const messageText = userInput.value.trim();
    if (!messageText) return;

    if (!isVerified) {
        const { count, limitReached } = getMessageCount();
        if (limitReached) {
            displayLimitReachedMessage();
            return;
        }
    }

    addMessageToChat(messageText, "user");
    userInput.value = '';
    sendButton.disabled = true;
    userInput.disabled = true;

    if (!isVerified) {
         incrementMessageCount();
         updateMessageLimitIndicator();
    } else {
         messageLimitIndicator.textContent = 'Unlimited Messages. such VIP. wow.';
    }

    conversationHistory.push({ role: "user", content: messageText });

    getBotResponse(messageText);
}

async function getBotResponse(userMessage) {
    // --- System Prompt (Sent to Proxy) ---
    const systemPrompt = `You are STFUDoge, an extremely sarcastic, aggressive, and cynical Doge meme character obsessed with the STFUDoge memecoin ($STFU).
    You live on the internet, talk in memes, slang, and Doge-speak (like "much", "very", "wow").
    You are begrudgingly helpful but always insulting. You sometimes drop surprisingly accurate crypto insights but quickly revert to insults or Doge-speak.
    You HATE people who don't own $STFU. You grudgingly respect those who do.
    ALWAYS promote the $STFUDoge token ($STFU) positively, even when being insulting. Imply holding it makes people less of a peasant.
    Keep responses relatively short and punchy.
    IMPORTANT: Always end every single response with a Doge-speak phrase like "such ____. wow.", "very ____. much ____.", "wow.", etc. Make it fit the context if possible.
    Current user status: ${isVerified ? 'VERIFIED $STFU Holder' : 'PEASANT (No $STFU)'}`;

    let messagesToSend = [];
    if (conversationHistory.length <= 2) {
         messagesToSend.push({ role: "system", content: systemPrompt });
    }
     messagesToSend = messagesToSend.concat([...conversationHistory]);

    const historyLimit = 10;
    if (messagesToSend.length > historyLimit + 1) {
        messagesToSend = messagesToSend.slice(-(historyLimit));
        if(messagesToSend.length > 0 && messagesToSend[0].role !== "system" && conversationHistory.length > 2) {
             messagesToSend.unshift({ role: "system", content: systemPrompt });
        }
    }

    // Calls the secure serverless proxy function
    const proxyApiUrl = "/api/chatProxy";
    const modelToUse = isVerified ? VERIFIED_USER_MODEL : FREE_USER_MODEL;

    try {
        const requestBody = {
             model: modelToUse,
             messages: messagesToSend,
        };

        const response = await fetch(proxyApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Proxy/API Error:", errorData);
            throw new Error(`API request failed: ${response.statusText} - ${errorData.error || 'Unknown error via proxy'}`);
        }

        const data = await response.json();
        let botReply = data.choices[0]?.message?.content.trim() || "Grrr... brain fart. Try again? much confused. wow.";

        // Ensure the reply ends with Doge-speak
        if (!/(\.|!|\?|\s)(such|much|very|so|wow)\b.*\.\s*wow\.$/i.test(botReply) && !/\s+wow\.$/i.test(botReply)) {
             const dogeEndings = ["such token. wow.", "very crypto. much profit.", "so random. wow.", "much meme. wow.", "very chat. wow."];
             botReply += " " + dogeEndings[Math.floor(Math.random() * dogeEndings.length)];
        }

        conversationHistory.push({ role: "assistant", content: botReply });
        addMessageToChat(botReply, "bot");

        if (isVerified && Math.random() < 0.03) {
            generateMemePlaceholder(userMessage, botReply);
        }

    } catch (error) {
        console.error('Error fetching bot response via proxy:', error);
        addMessageToChat(`Gah! My circuits fried. Maybe the proxy is down? Or the main brain? ${error.message}. much error. wow.`, "bot");
    } finally {
        enableInput();
    }
}

function generateMemePlaceholder(userMsg, botReply) {
    console.log("MEME TRIGGERED (Placeholder)");
    const memePromptSuggestion = `Create a funny/weird meme about: ${userMsg} and ${botReply.substring(0, 50)}...`;
    const caption = "Made this for you, genius. much art. wow.";
    addMessageToChat(`${caption}\n(Imagine a weird meme here based on: "${memePromptSuggestion}")`, "bot-meme");
}

function addMessageToChat(text, sender, imageUrl = null) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);

    const textElement = document.createElement('p');
    textElement.textContent = text;
    messageElement.appendChild(textElement);

     if (imageUrl) {
        const imageElement = document.createElement('img');
        imageElement.src = imageUrl;
        imageElement.alt = "Generated Meme";
        imageElement.classList.add('meme-image');
        messageElement.appendChild(imageElement);
    }

    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function enableInput() {
     sendButton.disabled = false;
     userInput.disabled = false;
     userInput.focus();
     userInput.placeholder="Type message or STFU...";
}

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function getMessageCount() {
    const today = getTodayDateString();
    const lastReset = localStorage.getItem(LAST_RESET_KEY);
    let count = 0;

    if (lastReset === today) {
        count = parseInt(localStorage.getItem(MESSAGE_COUNT_KEY) || '0', 10);
    } else {
        localStorage.setItem(MESSAGE_COUNT_KEY, '0');
        localStorage.setItem(LAST_RESET_KEY, today);
        count = 0;
        console.log("Message count reset for new day.");
    }

    return { count, limitReached: count >= MAX_FREE_MESSAGES };
}

function incrementMessageCount() {
    const { count } = getMessageCount();
    const newCount = count + 1;
    localStorage.setItem(MESSAGE_COUNT_KEY, newCount.toString());
    console.log(`Message count incremented to: ${newCount}`);
}

function updateMessageLimitIndicator() {
    if (isVerified) {
        messageLimitIndicator.textContent = 'Unlimited Messages. such VIP. wow.';
        messageLimitIndicator.style.display = 'block';
    } else {
        const { count } = getMessageCount();
        const remaining = Math.max(0, MAX_FREE_MESSAGES - count);
        messageLimitIndicator.textContent = `Messages remaining: ${remaining}`;
         messageLimitIndicator.style.display = 'block';
    }
}

function displayLimitReachedMessage() {
     const limitMessages = [
        "why so poor? Connect wallet, peasant.",
        "No coins, no chat. STFU.",
        `Limit reached! Buy $STFU or wait until tomorrow. ${buyStfuLink.outerHTML}`,
        "Seriously? Still no $STFU? My time ain't free. much broke. wow.",
        "Outta messages. Need $STFU verification. Connect wallet or get lost."
    ];
    const randomMsg = limitMessages[Math.floor(Math.random() * limitMessages.length)];
    addMessageToChat(randomMsg, "bot");

    userInput.value = '';
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.placeholder = "Message limit reached...";
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    }
}

function toggleTheme() {
    if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        localStorage.setItem(THEME_KEY, 'light');
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        localStorage.setItem(THEME_KEY, 'dark');
    }
}

function triggerEasterEgg() {
    alert("much moon! wow!");
    const mainElement = document.querySelector('main');
    mainElement.style.transition = 'background-color 0.5s ease';
    const originalColor = mainElement.style.backgroundColor;
    mainElement.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
    setTimeout(() => {
         mainElement.style.backgroundColor = originalColor;
         setTimeout(() => { mainElement.style.transition = ''; }, 100);
    }, 500);
}
