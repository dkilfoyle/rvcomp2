void main() {
  int i = 10;
  print_int(i); // 10
  {
    int i = 15;
    // should detect i is already defined in a parent scope
    // make i.1 instead
    print_int(i); // 15
    // scope with i.1 is popped
  }
  print_int(i); // 10
}