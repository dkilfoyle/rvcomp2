import { IBrilArgument, IBrilFunction, IBrilInstruction, IBrilLabel, IBrilProgram, IBrilType, IBrilValueInstruction } from "./BrilInterface";

class BrilPrinter {
  public hr: string = "";
  public lineNum: number = 0;
  public curFn: string = "";
  public irkeys: Record<string, Record<number, number>> = {}; // map irKeys[fnName][instrKey] = bril hr line number
  line(l: string, key: number) {
    this.hr = this.hr + l + "\n";
    this.irkeys[this.curFn][key] = this.lineNum++;
  }
  print(bril: IBrilProgram) {
    this.hr = "";
    this.irkeys = {};
    this.lineNum = 0;
    Object.values(bril.functions).forEach((fn) => this.printFunction(fn));
    if (bril.data.size) {
      this.hr += "\n/* Data Segment\n";
      bril.data.forEach((d) => {
        this.hr += `[${d.offset}-${d.offset + d.size - 1}]: ${d.bytes.toString()}\n`;
      });
      this.hr += "*/ end Data Segment";
    }
    return this.hr;
  }
  formatArgument(arg: IBrilArgument) {
    return `${arg.name}: ${arg.type}`;
  }
  formatType(typ: IBrilType) {
    if (typeof typ === "object") {
      if (typ.hasOwnProperty("ptr")) {
        return `ptr<${typ.ptr}>`;
      } else {
        debugger;
        throw new Error("invalid type");
      }
    } else return `${typ}`;
  }
  formatInstruction(ins: IBrilInstruction, indentNum = 0, semi = true) {
    let line: string = "";
    if ("op" in ins) {
      if (ins.op === "const") line = `${ins.dest}: ${this.formatType(ins.type)} = const ${ins.value}`;
      else if (ins.op === "phi") {
        let lhs = `${ins.dest}: ${this.formatType(ins.type)}`;
        if (!ins.labels) throw new Error("Phi instruction is missing labels");
        let rhs = "phi";
        for (let i = 0; i < ins.labels?.length; i++) rhs += ` ${ins.labels[i]} ${ins.args[i]}`;
        line = `${lhs} = ${rhs}`;
      } else {
        let rhs = `${ins.op}`;
        if (ins.args?.length) rhs += ` ${ins.args.join(" ")}`;
        if (ins.labels?.length) rhs += ` .${ins.labels.join(" .")}`;
        if (ins.funcs?.length) rhs += ` ${ins.funcs.join(" @")}`;
        const insAsValue = ins as IBrilValueInstruction;
        if (insAsValue.dest) {
          let tyann = `: ${this.formatType(insAsValue.type)}`;
          line = `${insAsValue.dest}${tyann} = ${rhs}`;
        } else line = `${rhs}`;
      }
    }
    return `${" ".repeat(indentNum)}${line}${semi ? ";" : ""}`;
  }

  formatLabel(ins: IBrilLabel) {
    // label
    return `.${ins.label}:`;
  }

  printFunction(fn: IBrilFunction) {
    this.curFn = fn.name;
    this.irkeys[fn.name] = {};
    const args = fn.args ? "(" + fn.args.map((arg) => this.formatArgument(arg)).join(", ") + ")" : "";
    const kind = fn.type ? ":" + this.formatType(fn.type) : "";
    this.line(`@${fn.name}${args}${kind} {`, fn.key || -99);
    fn.instrs.forEach((instr) => this.printInstruction(instr));
    this.line("}", fn.key || -99);
  }
  printInstruction(ins: IBrilInstruction | IBrilLabel) {
    if ("op" in ins) this.line(this.formatInstruction(ins as IBrilInstruction, 2, true), ins.key || -99);
    else if ("label" in ins) this.line(this.formatLabel(ins as IBrilLabel), ins.key || -99);
    else throw Error("brilPrinter: printInstruction: unknown instruction type");
  }
}

export const brilPrinter = new BrilPrinter();
