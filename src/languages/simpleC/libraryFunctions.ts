import { parseDocCommentString } from "./ast";
import { ISignature } from "./ScopeStack";

const getLibPos = () => ({ startLineNumber: 0, endLineNumber: 0, startColumn: 0, endColumn: 0 });

export const libraryFunctions: ISignature[] = [
  {
    _name: "functionDeclaration",
    id: "set_pixel",
    type: "int",
    block: { _name: "block", statements: [], heapVars: [] },
    params: [
      { _name: "variableDeclaration", id: "x", type: "float", pos: getLibPos() },
      { _name: "variableDeclaration", id: "y", type: "float", pos: getLibPos() },
      { _name: "variableDeclaration", id: "r", type: "float", pos: getLibPos() },
      { _name: "variableDeclaration", id: "g", type: "float", pos: getLibPos() },
      { _name: "variableDeclaration", id: "b", type: "float", pos: getLibPos() },
    ],
    docComment: parseDocCommentString("/**\n* @desc Print an integer to console\n* @param [int num] Number to print\n*/"),
    pos: getLibPos(),
  },
  {
    _name: "functionDeclaration",
    id: "get_pixel",
    type: "char",
    size: 3,
    block: { _name: "block", statements: [], heapVars: [] },
    params: [
      { _name: "variableDeclaration", id: "x", type: "int", pos: getLibPos() },
      { _name: "variableDeclaration", id: "y", type: "int", pos: getLibPos() },
    ],
    docComment: parseDocCommentString(
      "/**\n* @desc Return the offset (memory address) of the pixel\n* @param [int x] x coord\n @param [int y] y coord\n @returns [int]\n*/"
    ),
    pos: getLibPos(),
  },
  {
    _name: "functionDeclaration",
    id: "print_int",
    type: "void",
    block: { _name: "block", statements: [], heapVars: [] },
    params: [{ _name: "variableDeclaration", id: "x", type: "int", pos: getLibPos() }],
    docComment: parseDocCommentString("/**\n* @desc Print an integer to console\n* @param [int num] Number to print\n*/"),
    pos: getLibPos(),
  },
  {
    _name: "functionDeclaration",
    id: "print_string",
    type: "void",
    block: { _name: "block", statements: [], heapVars: [] },
    params: [{ _name: "variableDeclaration", id: "x", type: "int", pos: getLibPos() }],
    docComment: parseDocCommentString(
      "/**\n* @desc Print the string at memory [offset] to console\n* @param [int offset] memory location of string\n*/"
    ),
    pos: getLibPos(),
  },
  {
    _name: "functionDeclaration",
    id: "print_char",
    type: "void",
    block: { _name: "block", statements: [], heapVars: [] },
    params: [{ _name: "variableDeclaration", id: "x", type: "int", pos: getLibPos() }],
    docComment: parseDocCommentString("/**\n* @desc Print the char to console\n* @param [char c]\n*/"),
    pos: getLibPos(),
  },
  {
    _name: "functionDeclaration",
    id: "print_float",
    type: "void",
    block: { _name: "block", statements: [], heapVars: [] },
    params: [{ _name: "variableDeclaration", id: "x", type: "float", pos: getLibPos() }],
    docComment: parseDocCommentString("/**\n* @desc Print a float to console\n* @param [float num] Number to print\n*/"),
    pos: getLibPos(),
  },
  {
    _name: "functionDeclaration",
    id: "print_bool",
    type: "void",
    block: { _name: "block", statements: [], heapVars: [] },
    params: [{ _name: "variableDeclaration", id: "b", type: "bool", pos: getLibPos() }],
    docComment: parseDocCommentString("/**\n* @desc Print an boolean to console\n* @param [int num] Number to print\n*/"),
    pos: getLibPos(),
  },
  {
    _name: "functionDeclaration",
    id: "render",
    type: "void",
    block: { _name: "block", statements: [], heapVars: [] },
    params: [],
    docComment: parseDocCommentString("/**\n* @desc render screen buffer to DOM canvas\n */"),
    pos: getLibPos(),
  },
];
