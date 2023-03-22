int color(int iteration, int offset, int scale) {
  iteration = ((iteration*scale)+offset) % 1024;
  if (iteration < 256) {
    return iteration;
  } else if (iteration < 512) {
    return 255 - (iteration - 255);
  } else {
    return 0;
  }
}

void main() {
  float y = 0f;
  while (y < 100f) {
    y = y + 1f;
    if (((int)y) % 10 == 0) render();
    float x  = 0f;
    while (x < 100f) {
      x = x + 1f;

      float e = (y / 50f) - 1.5f;
      float f = (x / 50f) - 1f;

      float a = 0f;
      float b = 0f;
      float i = 0f;
      float j = 0f;
      int iteration = 0;

      while ((((i * i) + (j * j)) < 4f) && (iteration < 255)) {
        i = ((a * a) - (b * b)) + e;
        j = ((2f * a) * b) + f;
        a = i;
        b = j;
        iteration++;
      }

      int r = iteration == 255 ? 0 : color(iteration, 0, 4);
      int g = iteration == 255 ? 0 : color(iteration, 128, 4);
      int bb = iteration == 255 ? 0 : color(iteration, 356, 4);

      set_pixel(x, y, r, g, bb);
    }
  }
  render();
}
    