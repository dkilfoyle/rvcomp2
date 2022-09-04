/**
 * This is a minimal script that generates TypeScript definitions
 * from a Chevrotain parser.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { generateCstDts } from "chevrotain";
import { productions } from "../parser";

const dtsString = generateCstDts(productions);
const dtsPath = resolve(__dirname, "..", "simpleC_cst.d.ts");
writeFileSync(dtsPath, dtsString);
