/** @param {NS} ns */
import { getUsableServers } from '/code/utils.js';

export async function main(ns) {
    let servers = getUsableServers(ns);

    // Filter out servers with no money
    servers = servers.filter(server => ns.getServerMaxMoney(server) > 0);

    // Sort servers by their maximum money
    servers.sort((a, b) => ns.getServerMaxMoney(a) - ns.getServerMaxMoney(b));

    servers.forEach(server => {
        const money = ns.getServerMaxMoney(server);
        const formattedMoney = money.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
        ns.tprint(`${server}: ${formattedMoney}`);
    });
}
