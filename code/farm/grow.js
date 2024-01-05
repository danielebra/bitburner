/** @param {NS} ns **/
export async function main(ns) {
  const [target, port, jobID] = ns.args;

  const COMPLETED = `${jobID}#COMPLETE`;
  const STARTED = `${jobID}#STARTED`;

  ns.tryWritePort(port, STARTED);
  ns.print(STARTED)

  await ns.grow(target);

  ns.tryWritePort(port, COMPLETED);
  ns.print(COMPLETED)
}
