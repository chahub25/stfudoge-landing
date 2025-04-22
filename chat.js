// File: chat.js (Client-Side Logic - v13 DEBUG - BAREBONES Lib Check)
// Purpose: Drastically simplified to ONLY test if Web3Modal/Ethers objects exist on window when button is clicked.

console.log("chat.js script started - v13 BAREBONES");

// --- Configuration (WalletConnect ID is still needed for potential init) ---
const WALLETCONNECT_PROJECT_ID = '9d4b5847e95ec6872d7ee4d791ee2640';
console.log("v13 BAREBONES: Using WC Project ID:", WALLETCONNECT_PROJECT_ID);

// --- DOM Elements (Only connect button needed for this test) ---
let connectWalletButton;
let statusIndicator; // Keep status indicator for feedback

// --- Initialization ---
try {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("v13 BAREBONES: DOMContentLoaded event fired");

        // Get elements needed for this specific test
        connectWalletButton = document.getElementById('connect-wallet-button');
        statusIndicator = document.getElementById('status-indicator'); // Get status indicator

        if (connectWalletButton) {
            connectWalletButton.addEventListener('click', checkLibrariesOnClick);
            console.log("v13 BAREBONES: Connect wallet listener attached.");
        } else {
            console.error("v13 BAREBONES: Connect wallet button not found!");
        }

        if(statusIndicator) statusIndicator.textContent = "Ready - Click Connect to Check Libs";
        console.log("v13 BAREBONES: Initial page setup complete.");
    });
} catch (e) {
     console.error("v13 BAREBONES: Error setting up DOMContentLoaded listener:", e);
}

// --- Library Check Function (Called on Button Click) ---
function checkLibrariesOnClick() {
    console.log("v13 BAREBONES checkLibrariesOnClick: Button clicked. Performing check...");
    if(statusIndicator) { statusIndicator.textContent = "Checking Libraries..."; statusIndicator.className = ''; }

    // Add a small delay just in case load timing is extremely tight
    setTimeout(() => {
        // *** DETAILED LIBRARY CHECK ***
        let libsFound = true; // Assume true initially
        console.log("v13 BAREBONES checkLibrariesOnClick: Checking window.Web3Modal:", window.Web3Modal);
        console.log("v13 BAREBONES checkLibrariesOnClick: Checking window.Web3Modal?.Ethers5:", window.Web3Modal?.Ethers5); // Optional chaining
        console.log("v13 BAREBONES checkLibrariesOnClick: Checking window.ethers:", window.ethers);

        if (typeof window.Web3Modal === 'undefined') {
             console.error("v13 BAREBONES checkLibrariesOnClick: window.Web3Modal is UNDEFINED.");
             libsFound = false;
        }
        if (typeof window.Web3Modal?.Ethers5 === 'undefined') { // Check the adapter part specifically
             console.error("v13 BAREBONES checkLibrariesOnClick: window.Web3Modal.Ethers5 is UNDEFINED.");
             libsFound = false;
        }
         if (typeof window.ethers === 'undefined') {
             console.error("v13 BAREBONES checkLibrariesOnClick: window.ethers is UNDEFINED.");
             libsFound = false;
        }

        // Report result
        if (libsFound) {
            console.log("v13 BAREBONES checkLibrariesOnClick: SUCCESS! All required libraries appear to be defined on window object.");
             if (statusIndicator) { statusIndicator.textContent = "Success: Libraries Found!"; statusIndicator.className = 'verified'; }
             // In a real scenario, we would now call initializeWeb3Modal here
        } else {
             console.error("v13 BAREBONES checkLibrariesOnClick: FAILURE! One or more required libraries are missing from window object.");
             if (statusIndicator) { statusIndicator.textContent = "Error: Libraries Missing!"; statusIndicator.className = 'denied'; }
             alert("Required Web3 libraries could not be loaded. This might be due to network issues, browser extensions (ad blockers, privacy tools), or CDN problems. Please try disabling extensions or using a different network/browser if the problem persists."); // User feedback
        }
    }, 100); // Short delay before check

}

console.log("v13 BAREBONES: chat.js script fully parsed.");
