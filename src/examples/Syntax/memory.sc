void main() {
  int[3] x = [1,2,3];
  int[6] y = [10,11,12,13,14,15];

  char[5] a = "Hello";
  char[3] b = "abc";

  print_int(x[0]); // expect 1
  print_int(y[5]); // expect 15

  print_string(a); // expect Hello
  print_char(b[2]); // expect c;
}