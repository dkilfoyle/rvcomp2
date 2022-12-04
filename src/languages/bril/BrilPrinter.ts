import { IBrilArgument, IBrilFunction, IBrilInstruction, IBrilLabel, IBrilProgram, IBrilValueInstruction } from "./BrilInterface";

class BrilPrinter {
  public hr: string = "";
  public irkeys: (number | undefined)[] = []; // maps bril hr code line number to ins.key
  line(l: string, key: number | undefined) {
    this.hr = this.hr + l + "\n";
    this.irkeys.push(key);
  }
  print(bril: IBrilProgram) {
    this.hr = "";
    this.irkeys = [];
    bril.functions.forEach((fn) => this.printFunction(fn));
    return this.hr;
  }
  formatArgument(arg: IBrilArgument) {
    return `${arg.name}: ${arg.type}`;
  }
  printFunction(fn: IBrilFunction) {
    const args = fn.args ? "(" + fn.args.map((arg) => this.formatArgument(arg)).join(", ") + ")" : "";
    const kind = fn.type ? `: ${fn.type}` : "";
    this.line(`@${fn.name}${args}${kind} {`, fn.key);
    fn.instrs.forEach((instr) => this.printInstruction(instr));
    this.line("}", fn.key);
  }
  printInstruction(ins: IBrilInstruction | IBrilLabel) {
    if ((<IBrilInstruction>ins).op) {
      ins = ins as IBrilInstruction;
      if (ins.op === "const") this.line(`  ${ins.dest}: ${ins.type} = const ${ins.value};`, ins.key);
      else {
        let rhs = `${ins.op}`;
        if (ins.funcs) rhs += ` ${ins.funcs.join(" @")}`;
        if (ins.args) rhs += ` ${ins.args.join(" ")}`;
        if (ins.labels) rhs += ` .${ins.labels.join(" .")}`;
        const insAsValue = ins as IBrilValueInstruction;
        if (insAsValue.dest) {
          let tyann = `: ${insAsValue.type}`;
          this.line(`  ${insAsValue.dest}${tyann} = ${rhs}`, ins.key);
        } else return this.line(`  ${rhs}`, ins.key);
      }
    } else {
      // label
      ins = ins as IBrilLabel;
      this.line(`.${ins.label}:`, ins.key);
    }
  }
}

export const brilPrinter = new BrilPrinter();
