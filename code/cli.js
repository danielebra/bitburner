/** @param {NS} ns */
export async function main(ns) {
  window.ns = ns;
  await ns.asleep(60 * 60 * 1000);
}