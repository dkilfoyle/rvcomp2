// lvn optimisation test

void main() {
  int a = 4;
  int b = 2;
  int c = 4; // should be dropped
  int z;
  z=(a+b)*(b+a); // should be simplified to mul v0 v0
}