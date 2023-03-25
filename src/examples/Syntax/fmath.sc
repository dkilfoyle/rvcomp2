void main() {
  float f = 1.0f;
  // test operator precedence
  float g;
  g = f + 2f * 3f;
  assert(g == 7.0f, "g==7f");
  // test explicit int to float cast
  float x;
  x = f + ((float)2) * ((float)3);
  assert(x == 7f, "x==7f");
}