import { CstNodeLocation } from "chevrotain";
import { IAstDeclaration, IAstFunctionDeclaration, IAstVariableDeclaration, IDeclarationType, IDeclarationValue, IPos } from "./ast";
import { libraryFunctions } from "./libraryFunctions";

export type ISignature = IAstVariableDeclaration | IAstFunctionDeclaration;
export interface IScope {
  name: string;
  signatures: ISignature[];
  location: CstNodeLocation;
  parent: IScope | undefined;
  children: IScope[];
}

export class ScopeStack {
  public stack!: IScope;
  public currentScope!: IScope;

  constructor() {
    // this.stack = this.getGlobalScope();
    // this.currentScope = this.stack;
  }

  reset(location: CstNodeLocation) {
    this.stack = { ...this.getGlobalScope(location) };
    this.currentScope = this.stack;
  }

  getAllocArrays() {
    return this.currentScope.signatures
      .filter((sig) => sig._name == "variableDeclaration" && sig.size && sig.initExpr && sig.initExpr._name != "stringLiteralExpression") // string literals are not alloced onto heap, they live in data segments
      .map((sig) => sig.id);
  }

  getGlobalScope(location: CstNodeLocation): IScope {
    return {
      name: "global",
      location,
      parent: undefined,
      children: [],
      signatures: [...libraryFunctions],
    };
  }

  pushScope(name: string, location: CstNodeLocation | undefined) {
    if (!location) throw new Error("Need node location");
    const newScope: IScope = { name, location, parent: this.currentScope, signatures: [], children: [] };
    if (this.currentScope) this.currentScope.children.push(newScope);
    this.currentScope = newScope;
  }

  popScope() {
    if (this.currentScope.parent) this.currentScope = this.currentScope.parent;
  }

  // addToScope(name: string, type: string, pos: IPos, params?: IVariableDeclaration[], docComment?: DocComment) {
  //   this.currentScope.signatures.push({ name, type, pos, docComment, params: params ? params : [], kind: params ? "function" : "variable" });
  // }

  addToScope(signature: ISignature) {
    if (this.currentScope.signatures.find((s) => s.id == signature.id)) {
      throw new Error(`Cannot redefine scope variable ${signature.id}`);
    }
    this.currentScope.signatures.push(signature);
  }

  getSignature(testid: string, scope = this.currentScope): ISignature | undefined {
    const found = scope.signatures.find((sig) => sig.id == testid);
    if (found) return found;
    if (scope.parent) return this.getSignature(testid, scope.parent);
    else return undefined;
  }

  isPosInScopeRange(offset: number, scope: IScope) {
    let x: number;
    return offset >= scope.location.startOffset && scope.location.endOffset && offset < scope.location.endOffset;
  }

  getScopeAtLocation(offset: number, scope: IScope = this.stack): IScope | null {
    if (scope.children.length == 0) return scope;

    for (let i = 0; i < scope.children.length; i++) {
      let child = this.getScopeAtLocation(offset, scope.children[i]);
      if (child) return child;
    }

    return null;
  }

  getSignatureAtLocation(testid: string, offset: number, scope = this.currentScope) {
    if (!this.isPosInScopeRange(offset, scope)) return null;

    // if leaf scope then look for id
    if (scope.children.length === 0) return this.getSignature(testid, scope);

    // scopes do not overlap so only one of the children will contain pos
    let signature;
    scope.children.find((childScope) => {
      signature = this.getSignatureAtLocation(testid, offset, childScope);
      return signature;
    });

    // this scope doesn't have testid
    return signature;
  }

  isInScope(testid: string, scope = this.currentScope): ISignature | undefined {
    return this.getSignature(testid, scope);
  }

  flattenDown(scope = this.stack): ISignature[] {
    const sigs: ISignature[] = [];
    const getScopeSymbols = (scope: IScope) => {
      scope.signatures.forEach((sig) => {
        sigs.push(sig);
      });
      scope.children.forEach((child) => getScopeSymbols(child));
    };
    getScopeSymbols(scope);
    return sigs;
  }

  flattenUp(scope = this.stack): ISignature[] {
    const sigs: ISignature[] = [];
    const getScopeSymbols = (scope: IScope) => {
      scope.signatures.forEach((sig) => {
        sigs.push(sig);
      });
      if (scope.parent) getScopeSymbols(scope.parent);
    };
    getScopeSymbols(scope);
    return sigs;
  }
}
