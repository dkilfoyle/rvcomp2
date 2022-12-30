
void undeclared() {
  // should show undeclared j
  j = 3; 
  int i;
  // should show undeclared k
  i = 5 + k; 
  // should show undeclared function hello
  i = 5 - hello(); 
}

int funReturnsInt() {
  int i=5;
  return i;
}

void funReturnsVoid() {
  int i=5;
}

void typemismatch() {
  int i;
  bool b;
  // mismatch assign int = bool
  i = true;
  // mismatch assign bool = int
  b = 5;
  // mismatch in expression
  i = 5 + b;
  // mismatch assign bool = fun:int
  b = funReturnsInt();
  // mismatch assign int = fun:void
  i = funReturnsVoid();  // mismatch
}

void funReturnWrongType1() {
  return 5;
}

int funReturnsWrongType2() {
  int i=5;
}

void funTakesArgs(int i, bool b) {
  return;
}

// duplicate function
void funTakesArgs() {
}

void testFunctions() {
  // argument type mismatch
  funTakesArgs(true, 5);

  // wrong number arguments
  funTakesArgs(5);
}

void main() {
  // duplicate delcaration
  int x;
  int x;
}