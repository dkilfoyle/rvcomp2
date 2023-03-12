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
    if ((<IBrilInstruction>ins).op) {
      ins = ins as IBrilInstruction;
      if (ins.op === "const") this.line(`  ${ins.dest}: ${this.formatType(ins.type)} = const ${ins.value};`, ins.key || -99);
      else if (ins.op === "phi") {
        let lhs = `${ins.dest}: ${this.formatType(ins.type)}`;
        if (!ins.labels) throw new Error("Phi instruction is missing labels");
        let rhs = "phi";
        for (let i = 0; i < ins.labels?.length; i++) rhs += ` ${ins.labels[i]} ${ins.args[i]}`;
        this.line(`  ${lhs} = ${rhs};`, ins.key || -99);
      } else {
        let rhs = `${ins.op}`;
        if (ins.funcs?.length) rhs += ` ${ins.funcs.join(" @")}`;
        if (ins.args?.length) rhs += ` ${ins.args.join(" ")}`;
        if (ins.labels?.length) rhs += ` .${ins.labels.join(" .")}`;
        const insAsValue = ins as IBrilValueInstruction;
        if (insAsValue.dest) {
          let tyann = `: ${this.formatType(insAsValue.type)}`;
          this.line(`  ${insAsValue.dest}${tyann} = ${rhs};`, ins.key || -99);
        } else this.line(`  ${rhs};`, ins.key || -99);
      }
    } else {
      // label
      ins = ins as IBrilLabel;
      this.line(`.${ins.label}:`, ins.key || -99);
    }
  }
}

export const brilPrinter = new BrilPrinter();
