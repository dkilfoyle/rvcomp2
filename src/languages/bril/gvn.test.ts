import { expect, test } from "vitest";
import { reversePostOrder } from "./gvn";

test("reversePostOrder returns RPO", () => {
  const succs = {
    A: ["T", "C", "B"],
    B: ["D"],
    C: ["B", "E"],
    D: [],
    E: ["D"],
  };
  const rpo = reversePostOrder("A", succs);
  expect(rpo).toEqual(["A", "T", "C", "E", "B", "D"]);
});
