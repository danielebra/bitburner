const handleInfinity = (value) => (value === Infinity || value === 0 ? 1 : value);

/** @param {NS} ns */
export async function analyzeServer(ns, server, logState = true) {
  // Money
  const currentMoney = handleInfinity(ns.getServerMoneyAvailable(server));
  const maxMoney = ns.getServerMaxMoney(server);
  const currentHackTime = handleInfinity(ns.getHackTime(server));
  const currentGrowTime = handleInfinity(ns.getGrowTime(server));
  const moneyBalancePercentage = ((currentMoney / maxMoney) * 100).toFixed(2);

  // Security
  const currentSecurity = ns.getServerSecurityLevel(server);
  const minSecurity = ns.getServerMinSecurityLevel(server);
  const currentWeakenTime = handleInfinity(ns.getWeakenTime(server));
  const additionalSecurity = currentSecurity - minSecurity;

  // Threads
  const hackThreadsNeeded = Math.ceil(handleInfinity(ns.hackAnalyzeThreads(server, currentMoney)));
  const growThreadsNeeded = Math.ceil(handleInfinity(ns.growthAnalyze(server, maxMoney / currentMoney || 1)));
  const weakenThreadsNeeded = Math.ceil((currentSecurity - minSecurity) * 20);

  const prettyCash = `${ns.nFormat(currentMoney, "$0.0a")} / ${ns.nFormat(
    maxMoney,
    "$0.0a",
  )} (${moneyBalancePercentage}%)`;
  const prettyHack = `${ns.tFormat(currentHackTime)} (t=${hackThreadsNeeded})`;
  const prettyGrow = `${ns.tFormat(currentGrowTime)} (t=${growThreadsNeeded})`;
  const prettyWeaken = `${ns.tFormat(currentWeakenTime)} (t=${weakenThreadsNeeded})`;
  const prettySecurity = `${minSecurity} / ${currentSecurity.toFixed(2)} (Δ ${additionalSecurity.toFixed(2)})`;
  if (logState) {
    ns.print(
      `🧪${server}: ${prettyCash}, Grow ${prettyGrow}, Hack ${prettyHack}, Weaken ${prettyWeaken}, Security ${prettySecurity}`,
    );
  }
  return {
    currentWeakenTime,
    currentGrowTime,
    currentHackTime,
    hackThreadsNeeded,
    growThreadsNeeded,
    weakenThreadsNeeded,
    additionalSecurity,
    moneyBalancePercentage,
    prettyHack,
    prettyWeaken,
    prettySecurity,
    prettyGrow,
    prettyCash,
    maxMoney,
    currentMoney,
    minSecurity,
  };
}
