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
  float py = 0f;
  while (py < 100f) {
    py = py + 1f;
    if (((int)py) % 10 == 0) render();
    
    float px  = 0f;
    while (px < 100f) {
      px = px + 1f;

      // map px to complex plane a = [-2 to 0.47]
      // map py to complex plane a = [-1.12 to 1.12]

      float a0 = (px / 50f) - 1.5f;
      float b0 = (py / 50f) * 1.12f - 1.12f;

      // c is the point on the complex plane that we are drawing
      // c = a0 + b0i

      // z(n+1) = (z(n))^2 + c
      // where:
      //   z = a + bi
      //   z0 = 0 + 0i (so a=0, b=0)
      //   z^2 = (a+bi)(a+bi) = a^2 + 2abi - b^2
      // so:
      //   z(n+1) = (a^2 + 2abi - b^2) + (a0 + b0i)
      //   new a = Re(z(n+1)) = a^2 - b^2 + a0
      //   new b = Im(z(n+1)) = 2ab + b0

      float a = 0f;
      float b = 0f;
      int iteration = 0;

      // remains bounded if |Z| <= 2
      // |z| = sqrt(a^2 + B^2)
      // so |z| <= 2 is (a^2+b^2) < 2^2

      while ((((a * a) + (b * b)) < 4f) && (iteration < 255)) {
        float atemp = ((a*a) - (b*b)) + a0;
        b = ((2f * a) * b) + b0;
        a = atemp;
        iteration++;
      }

      int rc = iteration == 255 ? 0 : color(iteration, 0, 4);
      int gc = iteration == 255 ? 0 : color(iteration, 128, 4);
      int bc = iteration == 255 ? 0 : color(iteration, 356, 4);

      set_pixel(px, py, rc, gc, bc);
    }
  }
  // render();
}
    