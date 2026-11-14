import { describe, expect, it } from "vitest";
import { activeIndex, carouselMode, clampIndex, slideLabels } from "@/lib/carousel";

describe("carousel", () => {
  it("mode per jumlah item", () => {
    expect(carouselMode(0)).toBe("none");
    expect(carouselMode(1)).toBe("single");
    expect(carouselMode(2)).toBe("carousel");
    expect(carouselMode(5)).toBe("carousel");
  });
  it("label slide '1 dari 4'", () => {
    expect(slideLabels(4)).toEqual(["1 dari 4", "2 dari 4", "3 dari 4", "4 dari 4"]);
    expect(slideLabels(0)).toEqual([]);
  });
  it("indeks dijaga dalam batas", () => {
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(7, 3)).toBe(2);
    expect(clampIndex(1, 0)).toBe(0);
  });
  it("slide aktif dari posisi scroll", () => {
    const offsets = [0, 280, 560, 840];
    expect(activeIndex(0, offsets)).toBe(0);
    expect(activeIndex(300, offsets)).toBe(1);
    expect(activeIndex(800, offsets)).toBe(3);
  });
});
