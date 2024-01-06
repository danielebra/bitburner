/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("scan");
    ns.disableLog("getHackingLevel");
    ns.disableLog("getServerRequiredHackingLevel");
    ns.disableLog("getServerNumPortsRequired");
    let servers = discoverServers(ns);
    ns.print(servers);
    
    for (let server of servers) {
        if (!ns.hasRootAccess(server) && canHackServer(ns, server)) {
            ns.tprint("Gaining root for " + server);
            await gainRootAccess(ns, server);
        }
        else {
          ns.print("Skipping " + server);
        }
    }
}

/** @param {NS} ns **/
function discoverServers(ns) {
    let discoveredServers = ['home']; // Start with 'home'
    let toScan = ['home']; // Queue of servers to scan

    while (toScan.length) {
        let server = toScan.shift();
        let connectedServers = ns.scan(server);

        for (let connectedServer of connectedServers) {
            if (!discoveredServers.includes(connectedServer)) {
                discoveredServers.push(connectedServer);
                toScan.push(connectedServer);
            }
        }
    }
    return discoveredServers;
}

/** @param {NS} ns **/
function canHackServer(ns, server) {
    // Check if your hacking level is high enough
    // if (ns.getHackingLevel() < ns.getServerRequiredHackingLevel(server)) {
    //     return false;
    // }

    // Count the number of port-opening scripts available
    let portsRequired = ns.getServerNumPortsRequired(server);
    let portsAvailable = 0;
    if (ns.fileExists("BruteSSH.exe", "home")) portsAvailable++;
    if (ns.fileExists("FTPCrack.exe", "home")) portsAvailable++;
    if (ns.fileExists("relaySMTP.exe", "home")) portsAvailable++;
    if (ns.fileExists("HTTPWorm.exe", "home")) portsAvailable++;
    if (ns.fileExists("SQLInject.exe", "home")) portsAvailable++;
    // Add more checks for other port-opening scripts

    return portsAvailable >= portsRequired;
}

/** @param {NS} ns **/
async function gainRootAccess(ns, server) {
    // Use available hacking scripts to open ports
    if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(server);
    if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(server);
    if (ns.fileExists("relaySMTP.exe", "home")) ns.relaysmtp(server);
    if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(server);
    if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(server);
    // Add more scripts as required

    ns.nuke(server); // Gain root access
}
