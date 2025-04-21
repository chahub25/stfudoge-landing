// File: chat.js (Client-Side Logic - v9 DEBUGGING - Message Func Fix)
// Purpose: Restore missing message limiting functions. Wallet Init still disabled.

console.log("chat.js script started - v9 DEBUG Message Func Fix");

// --- Configuration ---
const WALLETCONNECT_PROJECT_ID = '9d4b5847e95ec6872d7ee4d791ee2640'; // Included as requested
const TOKEN_CONTRACT_ADDRESS = '0xd8d01A667A8fEeF10077c61018b4F8fA533703eD';
const CHAIN_ID = 56;
const CHAIN_RPC_URL = 'https://bsc.publicnode.com';
const TOKEN_DECIMALS = 18;
const MAX_FREE_MESSAGES = 50;
const FREE_USER_MODEL = "mistralai/mistral-7b-instruct:free";
const VERIFIED_USER_MODEL = "openai/gpt-3.5-turbo";
console.log("v9 DEBUG: Using Free Model:", FREE_USER_MODEL);
console.log("v9 DEBUG: Using WC Project ID:", WALLETCONNECT_PROJECT_ID);

// --- DOM Elements ---
let chatWindow, userInput, sendButton, connectWalletButton, buyStfuLink, statusIndicator, messageLimitIndicator, themeToggleButton, easterEggTrigger, currentYearSpan;
try {
    chatWindow = document.getElementById('chat-window');
    userInput = document.getElementById('user-input');
    sendButton = document.getElementById('send-button');
    connectWalletButton = document.getElementById('connect-wallet-button');
    buyStfuLink = document.getElementById('buy-stfu-link');
    statusIndicator = document.getElementById('status-indicator');
    messageLimitIndicator = document.getElementById('message-limit-indicator');
    themeToggleButton = document.getElementById('theme-toggle-button');
    easterEggTrigger = document.querySelector('.easter-egg-trigger');
    currentYearSpan = document.getElementById('current-year');
    if (!chatWindow || !userInput || !sendButton || !connectWalletButton || !statusIndicator || !messageLimitIndicator || !themeToggleButton) {
        console.warn("v9 DEBUG: One or more expected DOM elements were not found!");
    }
    console.log("v9 DEBUG: DOM elements obtained/checked");
} catch (e) {
    console.error("v9 DEBUG: Error obtaining DOM elements:", e);
}

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
console.log("v9 DEBUG: App state initialized");

// --- Minimal ABI ---
const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];

// --- Initialization ---
try {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("v9 DEBUG: DOMContentLoaded event fired");

        // *** Wallet Initialization remains COMMENTED OUT for debugging ***
        console.warn("v9 DEBUG: Automatic wallet initialization on load is currently DISABLED.");
        if(statusIndicator) statusIndicator.textContent = "Wallet Init Disabled (Debug Mode)";

        // Load other parts
        loadThemePreference();
        setupEventListeners();
        initializeChat();
        updateMessageLimitIndicator(); // This call requires getMessageCount to exist
        updateCurrentYear();
        console.log("v9 DEBUG: Initial page setup attempted (Wallet Init Skipped).");
    });
} catch (e) {
     console.error("v9 DEBUG: Error setting up DOMContentLoaded listener:", e);
}

// --- Web3Modal & Wallet Connection ---
// (This function is NOT called automatically right now)
function initializeWeb3Modal() {
    // ... function content from v8 DEBUG ...
     console.log("v9 DEBUG InitializeWeb3Modal: Function called (if uncommented).");
     setTimeout(() => { /* ... */ }, 1500);
}

async function connectWallet() {
    // ... function content from v8 DEBUG ...
     console.log("v9 DEBUG ConnectWallet: Button clicked...");
     if (!web3Modal) { /* ... handle error ... */ return; }
     try { /* ... connect logic ... */ } catch (error) { /* ... error handling ... */ }
}

// --- checkTokenBalance function ---
async function checkTokenBalance() { console.log("v9 DEBUG CheckTokenBalance: Called..."); /* ... function content from v8 DEBUG ... */ }

// --- initializeChat function ---
function initializeChat() { console.log("v9 DEBUG InitializeChat: Setting up initial history."); conversationHistory.push({ role: "assistant", content: "Grrr. What you want, peasant?..." }); }

// --- setupEventListeners function ---
function setupEventListeners() { console.log("v9 DEBUG SetupEventListeners: Attaching listeners..."); try { /*...*/ } catch(error) { /*...*/ } console.log("v9 DEBUG SetupEventListeners: Finished."); }

// --- updateCurrentYear function ---
function updateCurrentYear() { if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear(); }

// --- handleUserInput function ---
function handleUserInput() { console.log("v9 DEBUG HandleUserInput: Fired."); /* ... function content from v8 DEBUG ... */ }

// --- getBotResponse function ---
async function getBotResponse(userMessage) { console.log("v9 DEBUG GetBotResponse: Called..."); /* ... function content from v8 DEBUG ... */ }

// --- generateMemePlaceholder function ---
function generateMemePlaceholder(userMsg, botReply) { console.log("v9 DEBUG GenerateMemePlaceholder: Called..."); /* ... */ }

// --- addMessageToChat function ---
function addMessageToChat(text, sender, imageUrl = null) { console.log(`v9 DEBUG AddMessageToChat: Adding message - Sender: ${sender}...`); try { /*...*/ } catch (error) { /*...*/ } }

// --- enableInput function ---
function enableInput() { console.log("v9 DEBUG EnableInput: Re-enabling input..."); try { /*...*/ } catch(error) { /*...*/ } }


// --- Message Limiting functions --- *** NOW INCLUDED ***
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
        // It's a new day, reset count
        localStorage.setItem(MESSAGE_COUNT_KEY, '0');
        localStorage.setItem(LAST_RESET_KEY, today);
        count = 0;
        console.log("v9 DEBUG GetMessageCount: Message count reset for new day.");
    }
    // console.log(`v9 DEBUG GetMessageCount: Count is ${count}. Limit reached: ${count >= MAX_FREE_MESSAGES}`);
    return { count, limitReached: count >= MAX_FREE_MESSAGES };
}

function incrementMessageCount() {
    const { count } = getMessageCount(); // Ensures counter is up-to-date before incrementing
    const newCount = count + 1;
    localStorage.setItem(MESSAGE_COUNT_KEY, newCount.toString());
    console.log(`v9 DEBUG IncrementMessageCount: Count incremented to ${newCount}`);
}

function updateMessageLimitIndicator() {
    console.log("v9 DEBUG UpdateMessageLimitIndicator: Updating indicator. Verified:", isVerified);
    if(!messageLimitIndicator) {
        console.error("v9 DEBUG UpdateMessageLimitIndicator: Indicator element not found!");
        return;
    }
    if (isVerified) {
        messageLimitIndicator.textContent = 'Unlimited Messages. such VIP. wow.';
    } else {
        // Ensure getMessageCount is defined before calling
        if (typeof getMessageCount === "function") {
            const { count } = getMessageCount();
            const remaining = Math.max(0, MAX_FREE_MESSAGES - count);
            messageLimitIndicator.textContent = `Messages remaining: ${remaining}`;
        } else {
             console.error("v9 DEBUG UpdateMessageLimitIndicator: getMessageCount is not defined when needed!");
             messageLimitIndicator.textContent = `Messages remaining: ERROR`; // Show error state
        }
    }
    messageLimitIndicator.style.display = 'block';
}

function displayLimitReachedMessage() {
    console.log("v9 DEBUG DisplayLimitReachedMessage: Limit reached message triggered.");
     const limitMessages = [
        "why so poor? Connect wallet, peasant.",
        "No coins, no chat. STFU.",
        `Limit reached! Buy $STFU or wait until tomorrow. ${buyStfuLink?.outerHTML || 'the buy button'}`,
        "Seriously? Still no $STFU? My time ain't free. much broke. wow.",
        "Outta messages. Need $STFU verification. Connect wallet or get lost."
     ];
     const randomMsg = limitMessages[Math.floor(Math.random() * limitMessages.length)];
     addMessageToChat(randomMsg, "bot");
     if(userInput) { userInput.value = ''; userInput.disabled = true; userInput.placeholder = "Message limit reached..."; }
     if(sendButton) sendButton.disabled = true;
 }
// --- End Message Limiting functions ---


// --- Theme Toggling ---
function loadThemePreference() { console.log("v9 DEBUG LoadThemePreference: Loading..."); try { /*...*/ } catch (error) { /*...*/ } }
function toggleTheme() { console.log("v9 DEBUG ToggleTheme: Button clicked..."); try { /*...*/ } catch (error) { /*...*/ } }

// --- Easter Egg ---
function triggerEasterEgg() { console.log("v9 DEBUG TriggerEasterEgg: Clicked!"); alert("much moon! wow!"); /*...*/ }

console.log("v9 DEBUG: chat.js script fully parsed.");
