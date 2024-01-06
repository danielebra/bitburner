import { getUsableServers } from "/code/utils.js";
/** @param {NS} ns */
export async function main(ns) {
  const servers = getUsableServers(ns);
  ns.disableLog("ALL");
  ns.tail();

  for (const server of servers) {
    const files = ns.ls(server, ".cct");
    if (files.length) {
      ns.print(server, files);
    }
  }
}
