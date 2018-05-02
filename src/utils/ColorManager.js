const PALETTE = [
  // A desaturated categorical color scheme. Compatible with greys, I think:
  // http://colorbrewer2.org/#type=qualitative&scheme=Set3&n=12
  // pull a few out and assign to specific materials in ImageGenerator.
  // [128 / 255, 177 / 255, 211 / 255, 1], // mod, blue
  [217 / 255, 217 / 255, 217 / 255, 1], // zirc, grey
  [255 / 255, 237 / 255, 111 / 255, 1], // He, yellow
  [141 / 255, 211 / 255, 199 / 255, 1], // blue-green, teal
  [190 / 255, 186 / 255, 218 / 255, 1], // blue-purple, indigo
  [251 / 255, 128 / 255, 114 / 255, 1], // red
  [253 / 255, 180 / 255, 98 / 255, 1], // orange
  [179 / 255, 222 / 255, 105 / 255, 1], // green
  [252 / 255, 205 / 255, 229 / 255, 1], // pink
  [188 / 255, 128 / 255, 189 / 255, 1], // purple
  [204 / 255, 235 / 255, 197 / 255, 1], // light green
  [255 / 255, 255 / 255, 179 / 255, 1], // light yellow
];

// default alpha of 1 (opaque)
function toRGBA(color) {
  return `rgba(${Math.floor(color[0] * 255)}, ${Math.floor(
    color[1] * 255
  )}, ${Math.floor(color[2] * 255)}, ${color[3] === undefined ? 1 : color[3]})`;
}

function createColorManager(palette = PALETTE) {
  const colorInfo = {};
  const nameInfo = {};
  let colorIds = 1;
  let count = palette.length;
  while (count--) {
    const color = palette[count];
    const rgba = toRGBA(color);
    colorInfo[rgba] = {
      color,
      names: [],
    };
  }

  function mapIfNeeded(name, color = null) {
    // we want forward and reverse lookup, so we can discover if colors are used.
    if (!nameInfo[name]) {
      let rgba = null;
      if (!color) {
        // assign the next unused palette color. Choose one of the least-used
        // if all have been used.
        let minLengthSeen = 1000;
        Object.keys(colorInfo).forEach((infoRGBA) => {
          // avoid assigning colors with a '0' alpha
          if (
            colorInfo[infoRGBA].color[3] > 0 &&
            (!rgba || colorInfo[infoRGBA].names.length < minLengthSeen)
          ) {
            rgba = infoRGBA;
            minLengthSeen = colorInfo[infoRGBA].names.length;
          }
        });
      } else {
        // look up a palette color, or create a new entry.
        rgba = toRGBA(color);
      }
      if (!colorInfo[rgba]) {
        colorInfo[rgba] = {
          // default alpha of 1 (opaque)
          color: color[3] === undefined ? color.concat(1) : color,
          names: [],
        };
      }
      colorInfo[rgba].names.push(name);
      nameInfo[name] = { rgba, color: colorInfo[rgba].color, id: colorIds++ };
    }
  }

  function setColor(name, color) {
    // color assignment and mapping handled here:
    mapIfNeeded(name, color);
    // TODO override color already set.
  }

  function getColor(name) {
    mapIfNeeded(name);
    return nameInfo[name].color;
  }

  function getColorRGBA(name) {
    mapIfNeeded(name);
    return nameInfo[name].rgba;
  }

  function getId(name) {
    mapIfNeeded(name);
    return nameInfo[name].id;
  }

  function getColorMapping() {
    return nameInfo;
  }

  // see if a color is used, without changing the mapping.
  function usesColor(color) {
    const rgba = toRGBA(color);
    return colorInfo[rgba] && colorInfo[rgba].names.length > 0;
  }

  // see if a name is used, without changing the mapping.
  function hasName(name) {
    return !!nameInfo[name];
  }

  return {
    getId,
    setColor,
    getColor,
    getColorRGBA,
    getColorMapping,
    hasName,
    usesColor,
  };
}

export default {
  createColorManager,
  toRGBA,
};
