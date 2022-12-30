// Local Value Numbering optimisation test

void cse() {
  // Common Subexpression Elimination (with commutative)
  int a = 4;
  int b = 2;
  print_int((a+b)*(b+a)); // should be simplified to mul v0 v0
}

void copy_propogation() {
  int x = 1;
  int y;
  y = x;
  int z;
  z = y;
  print_int(z);
}

void constant_folding() {
  int a = 4;
  int b = 2;
  int c;
  c = ((a+b) * (a+b));
  print_int(c);
}

void main() {
  cse();
  copy_propogation();
  constant_folding();
}