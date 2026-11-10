/**
 * Turns the "image" value of a menu item into something an <img> can load:
 *  - web addresses (https://...) and uploaded photos (data:...) are used as they are
 *  - a file in the project's images folder, e.g. "images/water.jpg", becomes "/images/water.jpg"
 */
export function photoSrc(image) {
  if (!image) return "";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  return base + encodeURI(image.replace(/^\/+/, ""));
}
