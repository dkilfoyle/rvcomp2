# Optimisations

## Dead Code Elimination (DCE)

Delete instructions that write to a variable that will never be used (ie is not an arg an any instruction). SSA means that this can delete instructions that rewrite to variable that will not be used again

eg 

x:int = const 10;
call print_int x
x:int = add a b

Trivial DCE will not delete x:int = add a b because x is used earlier
SSA DCE will delete x:int = add a b because in SSA x.2 is never used

x.1:int = const 10;
call print_int x.1
x.2:int = add a b

## Dataflow Analysis

### Live variables

Variables that at a block location are already defined and might be used along some path in the future

### Constant propogation

List of variables with a live constant value ie still contains the original constant value and has not been overwritten. ? not needed in SSA form because constant defined variables are never overwritten
