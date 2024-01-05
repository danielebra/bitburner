/** @param {NS} ns **/
export async function main(ns) {
  const [target, port, jobID, threads] = ns.args;

  const COMPLETED = `${jobID}#COMPLETE#${threads}`;
  const STARTED = `${jobID}#STARTED#${threads}`;

  ns.tryWritePort(port, STARTED);
  ns.print(STARTED)

  await ns.weaken(target);

  ns.tryWritePort(port, COMPLETED);
  ns.print(COMPLETED)
}
