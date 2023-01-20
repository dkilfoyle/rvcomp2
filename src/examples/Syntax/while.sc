void main() {
  int i = 0;
  while (i < 5) {
    print_int(i); // expect 0 1 2 3 4
    i = i + 1;
  }
}