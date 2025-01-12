// Use Sets for faster lookups
const RECOGNISED_TLDS = new Set([".moe.edu.sg", ".edu.sg", ".edu", ".gov.sg", ".gov", ".bnpparibas"]);
const WHITELISTED_TLDS = new Set([".net", ".com", ".org", ".com.sg", ".sg"]);
const ALL_TLDS = new Set([...RECOGNISED_TLDS, ...WHITELISTED_TLDS]);
const activeRequests = new Set();

/**
 * Extracts the hostname from a given URL
 * @param {string} url 
 * @returns {string|null} hostname or null if invalid
 */
function getHostname(url) {
    try {
        return new URL(url).hostname;
    } catch (error) {
        console.error("Invalid URL:", url, error);
        return null;
    }
}

/**
 * Updates the Chrome extension badge UI
 * @param {number} tabId 
 * @param {string} text 
 * @param {string} color 
 */
function updateBadge(tabId, text, color) {
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color, tabId });
}

/**
 * Violation test case 1: Checks if URL contains '@'
 * @param {} url 
 * @returns 
 */
function containsAlias(url) {
    return url.includes('@');
}

/**
 * Violation test case 2: Check if URL starts with 'http'
 * @param {*} url 
 * @returns 
 */
function containsHttp(url) {
    return url.startsWith('http://');
}

/**
 * Check if it's a government TLD or commercial TLD
 * @param {*} hostname 
 * @param {*} tabId 
 * @returns 
 */
function checkAndUpdateTLDStatus(url) {
    let isRecognised = false;
    let isWhiteListed = false;

    for (const tld of ALL_TLDS) {
        if (url.endsWith(tld)) {
            isRecognised = RECOGNISED_TLDS.has(tld);
            isWhiteListed = WHITELISTED_TLDS.has(tld);
            break; // Stop searching once a match is found
        }
    }

    return { isRecognised, isWhiteListed };
}

/**
 * Records domain for future whitelisting
 * @param {*} hostname 
 * @returns 
 */
function fetchInsertHistory(hostname) {
    if (activeRequests.has(`insert-${hostname}`)) return; // Prevent duplicate call
    activeRequests.add(`insert-${hostname}`);
    
    fetch(`https://nrpboxnv6vwrbkelfndmnm5mrm0qhlgh.lambda-url.ap-southeast-1.on.aws/insert-history?domainName=${encodeURIComponent(hostname)}`)
        .then(response => response.ok ? response.json() : Promise.reject(`Error: ${response.status} ${response.statusText}`))
        .then(data => console.log("Insert History Success:", data))
        .catch(error => console.error("Insert History Request failed:", error))
        .finally(() => activeRequests.delete(`insert-${hostname}`)); // Remove from active requests
}

/**
 * Handles tab updates and security checks
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;
    const hostname = getHostname(tab.url);
    if (!hostname) return;

    let hasViolation = false;

    fetchInsertHistory(hostname);

    // Array of test functions
    const testCases = [
        { 
            name: "Alias Check", 
            func: (hostname) => ({
                isViolated: hostname ? containsAlias(hostname) : false
            })
        },
        { 
            name: "HTTP Check", 
            func: (hostname) => ({
                isViolated: hostname ? containsHttp(tab.url) : false
            })
        },
        { 
            name: "TLD Recognition Check", 
            func: (hostname) => {
                const { isRecognised, isWhiteListed } = checkAndUpdateTLDStatus(hostname);
                return { isRecognised, isWhiteListed };
            }
        }
    ];

    let violations = testCases
        .map(test => ({ name: test.name, violation: test.func(hostname) }))
        .filter(result => result.violation);

    /* Iterate through the violation */
    // violations.forEach(violation => {
    //     if (violation.violation.hasOwnProperty("isViolated")) {
    //         console.log("Violation Detected:", violation.violation.isViolated);
    //     } else {
    //         console.log("isRecognised:", violation.violation.isRecognised);
    //         console.log("isWhiteListed:", violation.violation.isWhiteListed);
    //     }
    // });

    hasViolation = violations.some(v => {
        // Handle `isRecognised` (TLD Check)
        if ((v.violation.hasOwnProperty("isRecognised") && v.violation.isRecognised === false) ||
        (v.violation.hasOwnProperty("isViolated") && v.violation.isViolated === true) ||
        (v.violation.hasOwnProperty("isWhiteListed") && v.violation.isWhiteListed === true)) {
            /* 11 January 2025 - Task: Included advance check through searchengine indexing history */
            fetch("https://nrpboxnv6vwrbkelfndmnm5mrm0qhlgh.lambda-url.ap-southeast-1.on.aws/query")
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Ensure response contains valid data
                if (!data.domains || !Array.isArray(data.domains)) {
                    console.error("Invalid API response format.");
                    return;
                }

                // Remove "www." if it exists in the hostname
                const cleanHostname = hostname.startsWith("www.") ? hostname.substring(4) : hostname
                // Search for the hostname in the list of domains
                if (!data.domains.find(item => item.domainname.toLowerCase() === cleanHostname.toLowerCase() && item.indexed === true)) {
                    chrome.action.setBadgeText({ text: `0`, tabId });
                    chrome.action.setBadgeBackgroundColor({ color: "red", tabId });
                    chrome.tabs.sendMessage(tabId, {
                        action: "warn_user",
                        message: " this website is not approved, all clicks have been disabled."
                    });
                }
            })
            .catch(error => console.error("Error fetching data:", error));
            return;
        }
        hasViolation = false;
    });

    if (!hasViolation) {
        chrome.action.setBadgeText({ text: `100`, tabId });
        chrome.action.setBadgeBackgroundColor({ color: "green", tabId });
    }
});
