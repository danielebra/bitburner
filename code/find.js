/** @param {NS} ns */
export async function main(ns) {
  let target = ns.args[0] || "w0r1d_d43m0n";

  let path = traverse("home", target, "home");
  if (path == "") {
    ns.tprint("Could not find " + target);
    return;
  }

  ns.tprint(path);
  const doc = eval("document");

  // Auto connect

  const terminal = doc.getElementById("terminal-input")
  terminal.value = path

  const handler = Object.keys(terminal)[1];
  terminal[handler].onChange({target:terminal});

  // Simulate an enter press
  terminal[handler].onKeyDown({key:'Enter',preventDefault:()=>null});

  function traverse(server, target, from) {
    if (server == target) {
      return target;
    }
    let nodes = ns.scan(server);
    for (let i = 0; i < nodes.length; i++) {
      let child = nodes[i];
      if (child == from) {
        continue;
      }
      if (child == target) {
        return server + "; connect " + target;
      }
      let children = ns.scan(server);
      if (children.length === 0) {
        continue;
      }
      let foundOn = traverse(child, target, server);
      if (foundOn != "") {
        return server + "; connect " + foundOn;
      }
    }
    return "";
  }
}


