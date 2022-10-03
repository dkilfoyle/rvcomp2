void main() {
  int x = 5;
  j = 3; // should show could not find j
  int y = "hello"; // should show type mismatch error for y
  int z;
  z = true; // should show type mismatch error for z
  int i;
  i = 5 + "hello"; // should show type mistmatch error for "hello"
  print_int(x); 
}