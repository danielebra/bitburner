/** @param {NS} ns */
import { calculateOptimalServerMemory } from '/code/optimalServer.js';

export async function main(ns) {
  const targetNumberOfServers = 25
  const memSize = calculateOptimalServerMemory(ns, targetNumberOfServers, ns.getPlayer().money * 0.9);

  for (let i = 0; i < targetNumberOfServers; i++) {
    const purchased = ns.purchaseServer("node-" + memSize, memSize)
    if (purchased) {
      ns.tprint("Server purchased");
    }
    else {
      ns.tprint("Failed to purchase server");
      break;
    }
  }
}