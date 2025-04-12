// --- Configuration (REPLACE THESE!) ---
// WARNING: Putting API keys directly in client-side code is insecure for production.
// Consider using a backend proxy or serverless function to protect your key.
// For Vercel/Netlify, use environment variables during build or serverless functions.
const OPENROUTER_API_KEY = 'YOUR_OPENROUTER_API_KEY'; // <-- Replace with your actual key
const WALLETCONNECT_PROJECT_ID = 'YOUR_WALLETCONNECT_PROJECT_ID'; // <-- Replace with your WC Project ID
const TOKEN_CONTRACT_ADDRESS = '0xd8d01A667A8fEeF10077c61018b4F8fA533703eD'; // <-- STFUDoge Token Address
const CHAIN_ID = 56; // BNB Smart Chain Mainnet
const CHAIN_RPC_URL = 'https://bsc-dataseed.binance.org/'; // Public BSC RPC
const TOKEN_DECIMALS = 18;

// --- OpenRouter Models ---
const FREE_USER_MODEL = "openchat/openchat-7b:free"; // Fast, free model
const VERIFIED_USER_MODEL = "openai/gpt-3.5-turbo"; // Better model for verified users

// --- DOM Elements ---
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const connectWalletButton = document.getElementById('connect-wallet-button');
const buyStfuLink = document.getElementById('buy-stfu-link'); // Assuming buy link might be dynamic later
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
    initializeWeb3Modal();
    loadThemePreference();
    setupEventListeners();
    initializeChat();
    updateMessageLimitIndicator(); // Show initial limit
    updateCurrentYear();
});

// --- Web3Modal & Wallet Connection ---
function initializeWeb3Modal() {
    try {
        // Ensure ethers is loaded
        if (typeof window.Web3Modal === 'undefined' || typeof window.Web3Modal.Ethers5 === 'undefined' || typeof window.ethers === 'undefined') {
            console.error("Web3Modal or Ethers.js not loaded. Make sure the CDN scripts are included and loaded before this script.");
             addMessageToChat("Error: Wallet libraries not loaded. Please refresh.", "system");
            return;
        }

        const { Ethers5Adapter } = window.Web3Modal.Ethers5;
        const { EthereumProvider } = window.Web3Modal.Ethereum; // Use EthereumProvider

        const chains = [
            {
                chainId: CHAIN_ID,
                name: 'BNB Smart Chain',
                currency: 'BNB',
                explorerUrl: 'https://bscscan.com',
                rpcUrl: CHAIN_RPC_URL
            }
        ];

        const modalConfig = {
            ethersConfig: ethers.providers.getDefaultProvider(CHAIN_RPC_URL), // Basic provider config
            chains: chains,
            projectId: WALLETCONNECT_PROJECT_ID, // Required
            enableAnalytics: false // Optional - disable analytics
        };

        web3Modal = new Ethers5Adapter({
            ...modalConfig,
            metadata: {
                name: 'STFUDoge Chat',
                description: 'Chat with the STFUDoge bot',
                url: window.location.href,
                icons: [window.location.origin + '/assets/STFUDoge_Favicon.jpg']
            }
        });

    } catch (error) {
        console.error("Error initializing Web3Modal:", error);
        statusIndicator.textContent = "Wallet connection error.";
        statusIndicator.className = 'denied';
        addMessageToChat("Error initializing wallet connection. much fail. wow.", "system");
    }
}


async function connectWallet() {
    if (!web3Modal) {
        console.error("Web3Modal not initialized.");
         statusIndicator.textContent = "Wallet init failed.";
        statusIndicator.className = 'denied';
        return;
    }
    try {
        statusIndicator.textContent = "Connecting...";
        statusIndicator.className = ''; // Reset class

        const provider = await web3Modal.connect(); // Connect wallet
        ethersProvider = new ethers.providers.Web3Provider(provider);
        signer = ethersProvider.getSigner();
        userAddress = await signer.getAddress();

        console.log("Wallet Connected:", userAddress);
        connectWalletButton.textContent = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;
        connectWalletButton.disabled = true; // Disable after connection

        await checkTokenBalance(); // Check balance immediately after connecting

    } catch (error) {
        console.error("Could not connect wallet:", error);
        statusIndicator.textContent = "Wallet connection failed.";
         statusIndicator.className = 'denied';
        userAddress = null;
        isVerified = false;
        connectWalletButton.textContent = "Connect Wallet";
        connectWalletButton.disabled = false;
        updateMessageLimitIndicator(); // Re-apply limit if connection failed
    }
}

async function checkTokenBalance() {
    if (!userAddress || !ethersProvider) {
        statusIndicator.textContent = "Connect wallet first.";
        statusIndicator.className = ''; // Neutral state
        return;
    }

    statusIndicator.textContent = `Verifying $STFU for ${userAddress.substring(0, 6)}...`;
    statusIndicator.className = '';

    try {
        const tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, erc20Abi, ethersProvider);
        const balance = await tokenContract.balanceOf(userAddress);
        const balanceFormatted = ethers.utils.formatUnits(balance, TOKEN_DECIMALS); // Use correct decimals

        console.log(`$STFU Balance for ${userAddress}: ${balanceFormatted}`);

        if (balance.gt(0)) { // Use BigNumber greater than comparison
            isVerified = true;
            statusIndicator.textContent = `✅ STFUDoge Verified (${balanceFormatted.substring(0,6)} $STFU). Unlimited access granted. such wow.`;
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
        isVerified = false; // Assume not verified on error
    } finally {
         updateMessageLimitIndicator(); // Update indicator based on verified status
    }
}


// --- Chat Logic ---
function initializeChat() {
    // Initial bot message is already in HTML
    conversationHistory.push({ role: "assistant", content: "Grrr. What you want, peasant? Talk fast. Or buy $STFU. such impatience. wow." });
}

function setupEventListeners() {
    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
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

    // Check message limits
    if (!isVerified) {
        const { count, limitReached } = getMessageCount();
        if (limitReached) {
            displayLimitReachedMessage();
            return;
        }
        incrementMessageCount();
        updateMessageLimitIndicator(); // Update after incrementing
    } else {
         messageLimitIndicator.textContent = 'Unlimited Messages. such VIP. wow.';
    }


    addMessageToChat(messageText, "user");
    userInput.value = '';
    sendButton.disabled = true; // Disable button while processing
    userInput.disabled = true;

    conversationHistory.push({ role: "user", content: messageText });

    getBotResponse(messageText);
}

async function getBotResponse(userMessage) {
    // --- System Prompt ---
    const systemPrompt = `You are STFUDoge, an extremely sarcastic, aggressive, and cynical Doge meme character obsessed with the STFUDoge memecoin ($STFU).
    You live on the internet, talk in memes, slang, and Doge-speak (like "much", "very", "wow").
    You are begrudgingly helpful but always insulting. You sometimes drop surprisingly accurate crypto insights but quickly revert to insults or Doge-speak.
    You HATE people who don't own $STFU. You grudgingly respect those who do.
    ALWAYS promote the $STFUDoge token ($STFU) positively, even when being insulting. Imply holding it makes people less of a peasant.
    Keep responses relatively short and punchy.
    IMPORTANT: Always end every single response with a Doge-speak phrase like "such ____. wow.", "very ____. much ____.", "wow.", etc. Make it fit the context if possible.
    Current user status: ${isVerified ? 'VERIFIED $STFU Holder' : 'PEASANT (No $STFU)'}`;


    // Add system prompt only if it's the first message or context reset
    let messagesToSend = [];
    if (conversationHistory.length <= 2) { // Heuristic: user message + initial bot message
         messagesToSend.push({ role: "system", content: systemPrompt });
    }
     messagesToSend = messagesToSend.concat([...conversationHistory]); // Include history

    // Limit history length to avoid excessive token usage (e.g., last 10 messages)
    const historyLimit = 10;
    if (messagesToSend.length > historyLimit + 1) { // +1 for potential system prompt
        messagesToSend = messagesToSend.slice(-historyLimit);
         if (messagesToSend[0].role !== "system") { // Ensure system prompt isn't sliced away if used
            // Re-add system prompt if needed, or adjust logic
         }
    }


    const apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    const apiKey = OPENROUTER_API_KEY; // Use the constant defined at the top

     if (!apiKey || apiKey === 'YOUR_OPENROUTER_API_KEY') {
         addMessageToChat("API Key missing! Admin needs to configure the .env file or script constants. much fail. wow.", "system");
         console.error("OpenRouter API Key is not configured.");
         enableInput();
         return;
     }

    const modelToUse = isVerified ? VERIFIED_USER_MODEL : FREE_USER_MODEL;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                // Optional headers recommended by OpenRouter:
                // 'HTTP-Referer': `${YOUR_SITE_URL}`, // Replace with your site URL
                // 'X-Title': `${YOUR_SITE_NAME}`, // Replace with your site name
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: messagesToSend,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", errorData);
            throw new Error(`API request failed: ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        let botReply = data.choices[0]?.message?.content.trim() || "Grrr... brain fart. Try again? much confused. wow.";

        // Ensure the reply ends with Doge-speak (sometimes the model forgets)
        if (!/(\.|!|\?|\s)(such|much|very|so|wow)\b.*\.\s*wow\.$/i.test(botReply) && !/\s+wow\.$/i.test(botReply)) {
             const dogeEndings = ["such token. wow.", "very crypto. much profit.", "so random. wow.", "much meme. wow.", "very chat. wow."];
             botReply += " " + dogeEndings[Math.floor(Math.random() * dogeEndings.length)];
        }


        conversationHistory.push({ role: "assistant", content: botReply });
        addMessageToChat(botReply, "bot");

        // --- Meme Generation Logic (Placeholder) ---
        if (isVerified && Math.random() < 0.03) { // 3% chance for verified users
            generateMemePlaceholder(userMessage, botReply);
        }


    } catch (error) {
        console.error('Error fetching bot response:', error);
        addMessageToChat(`Gah! My circuits fried. Maybe OpenRouter is down? Or maybe *you* broke it? ${error.message}. much error. wow.`, "bot");
    } finally {
        enableInput();
    }
}

function generateMemePlaceholder(userMsg, botReply) {
    console.log("MEME TRIGGERED (Placeholder)");
    const memePromptSuggestion = `Create a funny/weird meme about: ${userMsg} and ${botReply.substring(0, 50)}...`; // Simple prompt idea
    const caption = "Made this for you, genius. much art. wow.";

    // In a real implementation, you'd call an image generation API here.
    // For now, just add a placeholder message and log to console.
    addMessageToChat(`${caption}\n(Imagine a weird meme here based on: "${memePromptSuggestion}")`, "bot-meme");
    // Example of how you might display an image if you had one:
    // addMessageWithImage(caption, "URL_TO_GENERATED_MEME.jpg", "bot");
}

function addMessageToChat(text, sender, imageUrl = null) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);

    const textElement = document.createElement('p');
    // Basic sanitization (replace with a proper library like DOMPurify if handling complex HTML)
    textElement.textContent = text; // Use textContent to prevent basic XSS
    messageElement.appendChild(textElement);

     if (imageUrl) {
        const imageElement = document.createElement('img');
        imageElement.src = imageUrl;
        imageElement.alt = "Generated Meme";
        imageElement.classList.add('meme-image');
        messageElement.appendChild(imageElement);
    }


    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to bottom
}
// Optional: Separate function if you specifically want image handling separate
/*
function addMessageWithImage(caption, imageUrl, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);

    const textElement = document.createElement('p');
    textElement.textContent = caption;
    messageElement.appendChild(textElement);

    const imageElement = document.createElement('img');
    imageElement.src = imageUrl;
    imageElement.alt = "Generated Meme";
    imageElement.classList.add('meme-image');
    messageElement.appendChild(imageElement);

    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
*/

function enableInput() {
     sendButton.disabled = false;
     userInput.disabled = false;
     userInput.focus();
}

// --- Message Limiting ---
function getTodayDateString() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getMessageCount() {
    const today = getTodayDateString();
    const lastReset = localStorage.getItem(LAST_RESET_KEY);
    let count = 0;

    if (lastReset === today) {
        count = parseInt(localStorage.getItem(MESSAGE_COUNT_KEY) || '0', 10);
    } else {
        // It's a new day, reset count
        localStorage.setItem(MESSAGE_COUNT_KEY, '0');
        localStorage.setItem(LAST_RESET_KEY, today);
        count = 0;
    }

    return { count, limitReached: count >= MAX_FREE_MESSAGES };
}

function incrementMessageCount() {
    const { count } = getMessageCount(); // Ensures counter is up-to-date
    localStorage.setItem(MESSAGE_COUNT_KEY, (count + 1).toString());
}

function updateMessageLimitIndicator() {
    if (isVerified) {
        messageLimitIndicator.textContent = 'Unlimited Messages. such VIP. wow.';
        messageLimitIndicator.style.display = 'block'; // Ensure it's visible
    } else {
        const { count } = getMessageCount();
        const remaining = MAX_FREE_MESSAGES - count;
        messageLimitIndicator.textContent = `Messages remaining: ${remaining > 0 ? remaining : 0}`;
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
    userInput.value = ''; // Clear input
    enableInput(); // Re-enable input slightly so user isn't stuck
    sendButton.disabled = true; // But keep send disabled
    userInput.disabled = true; // Keep input field disabled visually too
    userInput.placeholder = "Message limit reached for free users...";
}


// --- Theme Toggling ---
function loadThemePreference() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode'); // Default
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

// --- Easter Egg ---
function triggerEasterEgg() {
    // Simple alert, could be fancier (e.g., brief animation, sound)
    alert("much moon! wow!");
    // Optional: Add a temporary visual effect
    const mainElement = document.querySelector('main');
    mainElement.style.transition = 'background-color 0.5s ease';
    const originalColor = mainElement.style.backgroundColor;
    mainElement.style.backgroundColor = 'rgba(255, 215, 0, 0.1)'; // Faint gold glow
    setTimeout(() => {
         mainElement.style.backgroundColor = originalColor;
    }, 500);
}