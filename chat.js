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
         if (!WALLETCONNECT_PROJECT_ID || WALLETCONNECT_PROJECT_ID === 'YOUR_WALLETCONNECT_PROJECT_ID') {
             console.error("WalletConnect Project ID is missing in chat.js configuration.");
             statusIndicator.textContent = "Wallet Config Error (Project ID)";
             statusIndicator.className = 'denied';
             addMessageToChat("Error: Wallet setup is incomplete (Missing Project ID). Admin needs to fix this. much config fail. wow.", "system");
            return;
        }

        console.log("Web3Modal and Ethers libraries seem loaded. Proceeding with init."); // Debug log

        try {
            const { Ethers5Adapter } = window.Web3Modal.Ethers5;
            // No need for EthereumProvider import/usage here if using Ethers5Adapter directly

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
                 // Use ethersConfig correctly
                defaultChain: chains[0], // Optional: set default chain
                ethersConfig: ethersConfig,
                chains: chains,
                projectId: WALLETCONNECT_PROJECT_ID,
                enableAnalytics: false,
                 metadata: {
                    name: 'STFUDoge Chat',
                    description: 'Chat with the STFUDoge bot',
                    url: window.location.href,
                    icons: [window.location.origin + '/assets/STFUDoge_Favicon.jpg'] // Ensure this path is correct
                }
            };

            web3Modal = new Ethers5Adapter(modalConfig); // Pass combined config

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
