// TODO: Debug case where induction variable i is a function parameter
// eg main(int i) ....

void main() {
  int i = 0;
  int x = 10;
  while (i < 5) {
    print_int(i + x * x); // expect 100, 101, 102, 103, 104
    i = i + 1;
    if (i == 2)
      print_string("Is 2");
    else
      print_string("Is not 2");
  }
}