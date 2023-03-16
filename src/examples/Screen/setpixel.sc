void clearScreen() {
  for (int i=0; i < 100; i++;) {
    for (int j=0; j<100; j++;) {
      set_pixel(i,j,0,0,0);
    }
  }
}

void drawCorners() {
  set_pixel(1,1,255,255,255);
  set_pixel(1,98,255,255,255);
  set_pixel(98,1,255,255,255);
  set_pixel(98,98,255,255,255);
}

void main() {
  clearScreen();
  drawCorners();

  int x = 1;
  int y = 0;
  
  set_pixel(x, y, 65, 66, 67);
  
  char[3] p = get_pixel(x,y);
  print_int(p[0]); // expect 65

  print_int(get_pixel(x,y)[1]); // expect 66

  print_bool(get_pixel(x,y)[2]==67); // expect true
  render();
}
    