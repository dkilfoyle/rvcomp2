// Global Value Numbering optimisation test

void main(int a, int b, int c, int d, int e, int f)
{
  int u;
  int v;
  int w;
  u = a + b;
  v = c + d;
  w = e + f;
  bool test = true;
  int x;
  int y;
  int u;
  int z;
  if (test)
  {
    x = c + d;
    y = c + d;
  }
  else
  {
    u = a + b;
    x = e + f;
    y = e + f;
  }
  z = u + y;
  u = a + b;
}