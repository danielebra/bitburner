/** @param {NS} ns */
export async function main(ns) {
  const size = ns.args[0];
  const outcome = ns.purchaseServer(`node_${size}`, Number(size));
  ns.tprint(outcome);
}
