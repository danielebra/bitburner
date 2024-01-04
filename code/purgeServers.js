/** @param {NS} ns */
export async function main(ns) {
    let purchasedServers = ns.getPurchasedServers();
    
    if (purchasedServers.length === 0) {
        ns.tprint("No purchased servers to delete.");
        return;
    }

    for (let server of purchasedServers) {
        ns.killall(server);
        if (ns.deleteServer(server)) {
            ns.tprint("Deleted server: " + server);
        } else {
            ns.tprint("Failed to delete server: " + server);
        }
    }
}