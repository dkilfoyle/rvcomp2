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
  for (int x=0; x<100; x++;) {
    for (int y=0; y<100; y++;) {
      if (random() < 0.2f) set_pixel(x,y,0,255,0);
      } 
  }
}

void clear_screen() {
  for (int x=0; x<100; x++;) {
    for (int y=0; y<100; y++;) {
      set_pixel(x,y,0,0,0);
    }
  }
}

bool frame() {
  bool changes = false;
  for (int x=0; x<100; x++;) {
    for (int y=0; y<100; y++;) {
      char pixel = get_pixel(x,y)[1];
      int neighbors = count_neighbors(x,y);
      if (pixel == 255) {
        // alive
        if (neighbors < 2) {
          set_pixel(x,y,0,0,0); 
          changes = true;
        }
        else if (neighbors > 3) {
          set_pixel(x,y,0,0,0); 
          changes = true;
        }
      } else {
        // dead
        if (neighbors == 3) {
          set_pixel(x,y,0,255,0); 
          changes = true;
        }
      }
    }
  }
  render();
  return changes;
}

void main() {
  clear_screen();
  setup();
  render();
  
  //print_int(count_neighbors(0,0));
  //print_int(count_neighbors(3,3));
  //print_int(count_neighbors(2,2));
  //print_int(get_pixel(0,0)[1]);
}