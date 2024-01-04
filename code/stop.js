import { getUsableServers } from "/code/utils.js";
/** @param {NS} ns **/
export async function main(ns) {
    ns.tail()
    const servers = getUsableServers(ns)
    servers.forEach(server => ns.killall(server))
}
