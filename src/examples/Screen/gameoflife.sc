int count_neighbors(int x, int y) {
  int count = 0;
  if (x > 0) {
    if (y > 0)
      if (get_pixel(x-1, y-1)[1] == 255) count++;
    if (get_pixel(x-1, y)[1] == 255) count++;
    if (y < 100)
      if (get_pixel(x-1, y+1)[1] == 255) count++;
  }
  if (x < 99) {
    if (y > 0)
      if (get_pixel(x+1, y-1)[1] == 255) count++;
    if (get_pixel(x+1, y)[1] == 255) count++;
    if (y < 100)
      if (get_pixel(x+1, y+1)[1] == 255) count++;
  }
  if (y > 0)
    if (get_pixel(x, y-1)[1] == 255) count++;
  if (y < 99)
    if (get_pixel(x, y+1)[1] == 255) count++;
  
  return count;
} 

void setup() {
  set_pixel(0,0, 0,255,0);
  set_pixel(1,0, 0,255,0);
  set_pixel(2,0, 0,255,0);
  set_pixel(3,0, 0,255,0);
  set_pixel(0,1, 0,255,0);
  set_pixel(1,1, 0,255,0);
  set_pixel(2,1, 0,255,0);
  set_pixel(3,1, 0,255,0);
  set_pixel(0,2, 0,255,0);
  set_pixel(1,2, 0,255,0);
  set_pixel(2,2, 0,255,0);
  set_pixel(3,2, 0,255,0);
  set_pixel(0,3, 0,255,0);
  set_pixel(1,3, 0,255,0);
  set_pixel(2,3, 0,255,0);
  set_pixel(3,3, 0,255,0);
}

void clear_screen() {
  for (int x=0; x<100; x++;) {
    for (int y=0; y<100; y++;) {
      set_pixel(x,y,0,0,0);
    }
  }
}

void main() {
  clear_screen();
  setup();
  
  print_int(count_neighbors(0,0));
  print_int(count_neighbors(3,3));
  print_int(count_neighbors(2,2));
  print_int(get_pixel(0,0)[1]);

  for (int frame=0; frame < 50; frame++;) {
    for (int x=0; x<100; x++;) {
      for (int y=0; y<100; y++;) {
        int pixel = get_pixel(x,y)[1];
        int neighbors = count_neighbors(x,y);
        if (pixel == 255) {
          // alive
          if (neighbors < 2)
            set_pixel(x,y,0,0,0); 
          else if (neighbors > 3)
            set_pixel(x,y,0,0,0); 
        } else {
          // dead
          if (neighbors == 3)
            set_pixel(x,y,0,255,0); 
        }
      }
    }
    render();
  }
}