import { HWGW, controller } from "/code/lib/sequencer.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  const target = ns.args[0];
  const dynamicCycles = ns.args[1] || false;

  await controller(ns, target, true);
}
