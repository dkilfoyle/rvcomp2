int getz() {
  return 10;
}

void main() {
  int z;
  z = getz();
  int x;
  if (z > 5) {
    x = 1;
  } else {
    x = 2;
  }
  print_int(x); 
}