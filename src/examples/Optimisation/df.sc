void main() {
  int result = 1;
  int i = 9;
  while (i >= 0) {
    result = result * i;
    i = i -1;
  }
  print_int(result);
}