// Dead Code Elimination optimisation test

void main() {
  int a = 4; // should be dropped
  int b = 2;
  int c = 4; // should be dropped
  print_int(b); 
}