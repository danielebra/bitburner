/** @param {NS} ns */
export async function main(ns) {

    const target = ns.args[0];
    // Defines how much money a server should have before we hack it
    // In this case, it is set to the maximum amount of money.
    const moneyThresh = ns.getServerMaxMoney(target) * 0.9;

    // Defines the maximum security level the target server can
    // have. If the target's security level is higher than this,
    // we'll weaken it before doing anything else
    const securityThresh = ns.getServerMinSecurityLevel(target) + 3;


    // Infinite loop that continously hacks/grows/weakens the target server
    while(true) {
        if (ns.getServerSecurityLevel(target) > securityThresh) {
            // If the server's security level is above our threshold, weaken it
            ns.print("Weakening")
            await ns.weaken(target);
        } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
            // If the server's money is less than our threshold, grow it
            ns.print("Growing")
            await ns.grow(target);
        } else {
            // Otherwise, hack it
            ns.print("Hacking")
            await ns.hack(target);
        }
    }
}