int count_neighbors(int x, int y) {
  int count = 0;
  if (x > 0) {
    if (y > 0)
      if (get_pixel(x-1, y-1) > 0) count++;
    if (get_pixel(x-1, y) > 0) count++;
    if (y < 100)
      if (get_pixel(x-1, y+1) > 0) count++;
  }
  if (x < 99) {
    if (y > 0)
      if (get_pixel(x+1, y-1) > 0) count++;
    if (get_pixel(x+1, y) > 0) count++;
    if (y < 100)
      if (get_pixel(x+1, y+1) > 0) count++;
  }
  if (y > 0)
    if (get_pixel(x, y-1) > 0) count++;
  if (y < 99)
    if (get_pixel(x, y+1) > 0) count++;
  
  return count;
} 

void main() {
  for (int x=0; x<100; x++;) {
    for (int y=0; y<100; y++;) {
      int pixel = get_pixel(x,y);
      int neighbors = count_neighbors(x,y);
      if (pixel > 0) {
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
}