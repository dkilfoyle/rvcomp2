int add(int a, int b) {
  return a + b;
}

void main() {
  int i = 5;
  print_int(i); // 5

  int j = 5 + 2 + 3;
  print_int(j); // 10

  int k = 5 + 2 * 3;
  print_int(k); // 11

  int m = (5 + 2) * 3;
  print_int(m); // 21;

  int n = 3 + add(4,5);
  print_int(n); // 12

  bool b = 5 == 5;
  print_bool(b); // true

  bool c = 5 >= 4;
  print_bool(c); // true

  bool d = (2+3) > (1+2);
  print_bool(d); // true
}