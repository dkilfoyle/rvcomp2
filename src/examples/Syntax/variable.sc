void declaration () {
  // declaration
  int i;
  i = 1;
  print_int(i); // 1

  int j = 2;
  print_int(j); // 2

  int k = i + j;
  print_int(k); // 3

  bool a;
  a = true;
  print_bool(a); // true

  bool b = false;
  print_bool(b); // false

  bool c = k > i;
  print_bool(c); //true
}

void scope() {
  int i = 10;
  print_int(i); // 10
  {
    int i = 15;
    print_int(i); // 15
  }
  print_int(i); // 10
}

void main() {
  declaration(); // expect: 1 2 3 true false true
  scope(); // expect 10 15 10
}