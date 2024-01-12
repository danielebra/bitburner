/** @param {NS} ns **/
export async function main(ns) {
  const [target, port, jobID, threads] = ns.args;

  const COMPLETED = `${jobID}#COMPLETE#${threads}`;
  const STARTED = `${jobID}#STARTED#${threads}`;

  // ns.tryWritePort(port, STARTED);
  ns.print(STARTED);
  if (jobID) {
    ns.writePort(
      10,
      JSON.stringify({
        jobID: jobID,
        startTimeActual: performance.now(),
      }),
    );
  }

  await ns.hack(target);

  if (jobID) {
    ns.writePort(
      10,
      JSON.stringify({
        jobID: jobID,
        endTimeActual: performance.now(),
      }),
    );
  }

  ns.print(COMPLETED);
  if (port) {
    const published = ns.tryWritePort(port, COMPLETED);
    ns.print(`Pubilshed: ${published} on Port: ${port}`);
  }
}
