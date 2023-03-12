import { IBrilValueInstruction, IBrilValueType } from "./BrilInterface";

// eg { op: "add", args: [1,2] } => add #1 #2
export class VNValue {
  op: string;
  args: number[];
  constructor(op: string, args: number[] = []) {
    this.op = op;
    this.args = op == "add" || op == "mul" ? args.sort((a, b) => a - b) : args;
  }
  toString() {
    if (this.op == "const") return `${this.op} ${this.args[0]}`;
    else return `${this.op} ${this.args.map((arg) => "#" + arg).join(" ")}`;
  }
}

//                              LVN                     DCE
// a.0:int = const 6;           unchanged               unchanged
// b.0:int = const 6;           unchanged               unchanged
// c.0:int = id b.0;            unchanged               dropped
// d.0:int = const 8;           unchanged               unchanged
// s.0: int = add c.0 d.0       s.0 = add a.0 d.0       unchanged
// s.1: int = add d.0 c.0       s.1 = id s.0            dropped
// e.0: int = const 10;         unchanged               unchanged
// s.2: int = add s.1 e.0       s.2 = add s.0 e.0       unchanged

// value2num     <------------+
// num2canonvar  +----------------------+

//               lvntable
//               index | LVNValue   | canonvar | constval
//               ------|------------|----------|----------
//               0     | const 6    | a.0      | 6
//               1     | const 8    | d.0      | 8
//               2     | add #0, #1 | s.0      |
//               3     | const 10   | e.0      |
//               4     | add #2, #3 | s.2      |
//               ^
// var2num  {    |
//         a.0 : 0,
//         b.0 : 0,
//         c.0 : 0,
//         d.0 : 1,
//         s.0 : 2,
//         s.1 : 2,
//         e.0 : 3,
//         s.2 : 3,
//          }

export class VNTable {
  rows: { value: VNValue; canonvar: string; constval?: number | boolean }[];
  var2num: Record<string, number>;
  constructor() {
    this.rows = [];
    this.var2num = {};
  }
  toTable() {
    return this.rows.map((row) => ({ value: row.value.toString(), canonvar: row.canonvar, constval: row.constval?.toString() }));
  }
  addVar(varname: string, num: number) {
    this.var2num[varname] = num;
  }
  addValue(value: VNValue, canonvar: string, constval?: number) {
    // const findValue = this.findValueIndex(value);
    // if (findValue !== -1) return findValue
    if (this.hasValue(value)) {
      // throw new Error("LVNTable already has " + value.toString());
    }
    this.rows.push({ value, canonvar, constval });
    this.addVar(canonvar, this.rows.length - 1);
    return this.rows.length - 1;
  }

  findValueIndex(value: VNValue) {
    return this.rows.findIndex((r) => r.value.toString() == value.toString());
  }

  hasValue(value: VNValue) {
    return this.rows.some((r) => r.value.toString() == value.toString());
  }
  hasVar(varName: string) {
    return Object.keys(this.var2num).includes(varName);
  }

  value2num(value: VNValue) {
    if (value.op == "id") return value.args[0]; // use the underlying value number
    return this.rows.findIndex((r) => r.value.toString() == value.toString());
  }
  num2canonvar(num: number) {
    return this.rows[num].canonvar;
  }
  instruction2value(instruction: IBrilValueInstruction) {
    if (instruction.op == "const") {
      return new VNValue(`const ${instruction.value}`, []);
    } else {
      let args = "args" in instruction ? instruction.args : [];
      let argsNum = args.map((arg) => this.var2num[arg]);
      return new VNValue(instruction.op, argsNum);
    }
  }
  isConst(num: number) {
    return typeof this.rows[num].constval !== "undefined";
  }
  num2const(num: number) {
    return this.rows[num].constval;
  }
  var2canonvar(arg: string) {
    if (this.var2num[arg]) return this.num2canonvar(this.var2num[arg]);
    else return arg;
  }
  vars2canonvars(args: string[]) {
    return args.map((arg) => this.var2canonvar(arg));
  }
}

const foldable_ops: Record<string, (a: IBrilValueType, b: IBrilValueType) => IBrilValueType> = {
  add: (a: IBrilValueType, b: IBrilValueType) => (a as number) + (b as number),
  mul: (a: IBrilValueType, b: IBrilValueType) => (a as number) * (b as number),
  sub: (a: IBrilValueType, b: IBrilValueType) => (a as number) - (b as number),
  div: (a: IBrilValueType, b: IBrilValueType) => (a as number) / (b as number),
  gt: (a: IBrilValueType, b: IBrilValueType) => a > b,
  lt: (a: IBrilValueType, b: IBrilValueType) => a < b,
  ge: (a: IBrilValueType, b: IBrilValueType) => a >= b,
  le: (a: IBrilValueType, b: IBrilValueType) => a <= b,
  ne: (a: IBrilValueType, b: IBrilValueType) => a != b,
  eq: (a: IBrilValueType, b: IBrilValueType) => a == b,
  or: (a: IBrilValueType, b: IBrilValueType) => (a as boolean) || (b as boolean),
  and: (a: IBrilValueType, b: IBrilValueType) => (a as boolean) && (b as boolean),
  not: (a: IBrilValueType) => !a,
};

export const fold = (vnTable: VNTable, value: VNValue) => {
  if (value.op in foldable_ops) {
    const const_args = value.args.map((arg) => {
      if (!vnTable.rows[arg]) debugger;
      return vnTable.rows[arg].constval;
    });
    let const_count = 0;
    const_args.forEach((arg) => {
      if (typeof arg !== "undefined") const_count++;
    });

    if (const_count == 2 && value.op in foldable_ops) return foldable_ops[value.op](const_args[0]!, const_args[1]!);
    if (const_count == 1 && value.args.length == 1 && value.op == "not") return foldable_ops["not"](const_args[0]!, 0);
    if (const_count == 1 && ["eq", "ne", "le", "ge"].includes(value.op) && value.args[0] == value.args[1])
      return value.op !== "ne" ? true : false;
    if (const_count == 1 && ["and", "or"].includes(value.op)) {
      const const_val = vnTable.rows[typeof const_args[0] !== undefined ? value.args[0]! : value.args[1]!].constval;
      if ((value.op == "and" && !const_val) || (value.op == "or" && const_val)) return const_val;
    }
  }
  return undefined;
};
