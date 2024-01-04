/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const moneyThresh = ns.getServerMaxMoney(target) * 0.75; // Lowered to 75%
    const securityThresh = ns.getServerMinSecurityLevel(target) + 5; // Slightly higher threshold

    // Dynamically determine hack amount
    const hackPercentage = ns.hackAnalyze(target);
    const optimalHackAmount = () => ns.getServerMoneyAvailable(target) * hackPercentage;

    while (true) {
        const currentSecurityLevel = ns.getServerSecurityLevel(target);
        const currentMoney = ns.getServerMoneyAvailable(target);

        if (currentSecurityLevel > securityThresh) {
            // Weaken if security level is too high
            await ns.weaken(target);
        } else if (currentMoney < moneyThresh) {
            // Grow if money is below threshold
            await ns.grow(target);
        } else {
            // Hack only if the money is above threshold and security is low
            const hackAmount = optimalHackAmount();
            await ns.hack(target)//, { threads: Math.floor(hackAmount) });
            await ns.sleep(200); // Small delay to allow server recovery
        }

        // Adjust delay based on server state
        await ns.sleep(adjustDelay(currentSecurityLevel, currentMoney, securityThresh, moneyThresh));
    }
}

// Function to adjust delay based on server state
function adjustDelay(securityLevel, money, securityThresh, moneyThresh) {
    const securityDiff = securityLevel - securityThresh;
    const moneyRatio = money / moneyThresh;

    let delay = 1000; // Base delay

    // Increase delay if security level is much higher than threshold
    if (securityDiff > 5) {
        delay += 1000 * (securityDiff - 5);
    }

    // Decrease delay if money is significantly above the threshold (encourage hacking)
    if (moneyRatio > 1.2) {
        delay -= 500;
    }

    // Ensure delay is not negative and does not exceed a maximum reasonable value
    return Math.min(Math.max(delay, 500), 5000);
}
