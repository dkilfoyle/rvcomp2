void main() {
  float y = 0f;
  while (y < 100f) {
    y = y + 1f;
    if ((int)y % 10 == 0) print_float(y);
    float x  = 0f;
    while (x < 100f) {
      x = x + 1f;

      float e = (y / 50f) - 1.5f;
      float f = (x / 50f) - 1f;

      float a = 0f;
      float b = 0f;
      float i = 0f;
      float j = 0f;
      float c = 0f;

      while ((((i * i) + (j * j)) < 4f) && (c < 255f)) {
        i = ((a * a) - (b * b)) + e;
        j = ((2f * a) * b) + f;
        a = i;
        b = j;
        c = c + 1f;
      }
      set_pixel(x, y, c, c, c);
    }
  }
  render();
}
    