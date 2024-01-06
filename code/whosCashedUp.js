import { getUsableServersEnriched } from '/code/utils.js'
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL')

  ns.tail()
  while (true) {
    let servers = getUsableServersEnriched(ns)
    ns.clearLog()
    
    servers = servers.filter(info => info.maxMoney > 0 && info.hackable);
    servers.sort((a, b) => b.maxMoney - a.maxMoney);

    // serverMoneyInfo.sort((a, b) => b.percentageFilled - a.percentageFilled);
    // serverMoneyInfo.sort((a, b) => b.currentMoney - a.currentMoney);

    // Display the information
    servers.forEach(info => {
      const prettyCurrentMoney = ns.nFormat(info.currentMoney, "$0.0a")
      const prettyMaxMoney = ns.nFormat(info.maxMoney, "$0.0a")
      const paddedMoney = `${prettyCurrentMoney}/${prettyMaxMoney}`.padEnd(16, ' ')
    ns.print(`${info.name.padEnd(18, ' ')}${paddedMoney}\t(${info.percentageFilled.toFixed(2)}%)`);
    });
    await ns.sleep(2500)
  }
}
