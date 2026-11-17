type RGB = [number, number, number];

function luminance(rgb: RGB) {
  const channels = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function accessibleAccent(hex: string, dark: boolean) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#76594c";
  const original = [1, 3, 5].map((offset) => parseInt(safe.slice(offset, offset + 2), 16)) as RGB;
  const background: RGB = dark ? [21, 27, 25] : [247, 245, 240];
  const bg = luminance(background);
  const target = dark ? 255 : 0;
  for (let step = 0; step <= 100; step++) {
    const rgb = original.map((value) => Math.round(value + (target - value) * step / 100)) as RGB;
    const fg = luminance(rgb);
    if ((Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05) >= 4.5) {
      return "#" + rgb.map((value) => value.toString(16).padStart(2, "0")).join("");
    }
  }
  return dark ? "#ffffff" : "#000000";
}

export function themeAccents(hex: string) {
  return { light: accessibleAccent(hex, false), dark: accessibleAccent(hex, true) };
}
