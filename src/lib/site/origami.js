import * as THREE from 'three';

// Thin, flat-shaded paper faces. Each object stays a single low-poly mesh.
const PAPER = [0x7d8fa6, 0xafc1d6, 0x586d88, 0x91a5bd].map(value => new THREE.Color(value));

export function createOrigami(kind) {
  const positions = [];
  const colours = [];
  const triangle = (a, b, c, shade = 0) => {
    const colour = PAPER[shade];
    for (const point of [a, b, c]) {
      positions.push(...point);
      colours.push(colour.r, colour.g, colour.b);
    }
  };
  const quad = (a, b, c, d, shade = 0) => {
    triangle(a, b, c, shade);
    triangle(a, c, d, shade);
  };

  if (kind === 'news') {
    // Envelope: four overlapping folds, with the closing flap on top.
    quad([-.65, 0, 0], [.65, 0, 0], [.65, .78, 0], [-.65, .78, 0], 2);
    triangle([-.65, .015, .012], [.12, .37, .028], [-.65, .765, .012], 0);
    triangle([.65, .015, .014], [.65, .765, .014], [-.12, .37, .03], 3);
    triangle([-.64, .01, .034], [.64, .01, .034], [0, .43, .045], 0);
    triangle([-.64, .78, .052], [0, .355, .075], [.64, .78, .052], 1);
  } else if (kind === 'product') {
    // Folded lily: six narrow petals open from a cup and turn down at the tips.
    // A raised centre crease keeps each petal readable as folded paper.
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const point = (radius, height, side = 0) => [
        Math.cos(angle) * radius - Math.sin(angle) * side,
        height,
        Math.sin(angle) * radius + Math.cos(angle) * side
      ];
      const root = point(.035, .015);
      const neckLeft = point(.16, .28, -.075);
      const neckRight = point(.16, .28, .075);
      const neckFold = point(.16, .31);
      const shoulderLeft = point(.39, .51, -.16);
      const shoulderRight = point(.39, .51, .16);
      const shoulderFold = point(.39, .57);
      const endLeft = point(.61, .53, -.09);
      const endRight = point(.61, .53, .09);
      const endFold = point(.61, .56);
      const tip = point(.8, .39);
      triangle(root, neckFold, neckLeft, 3);
      triangle(root, neckRight, neckFold, 0);
      quad(neckLeft, neckFold, shoulderFold, shoulderLeft, 1);
      quad(neckFold, neckRight, shoulderRight, shoulderFold, 3);
      quad(shoulderLeft, shoulderFold, endFold, endLeft, 1);
      quad(shoulderFold, shoulderRight, endRight, endFold, 3);
      triangle(endLeft, endFold, tip, 1);
      triangle(endFold, endRight, tip, 3);
    }
    // Three slim paper stamens, kept in the same blue-grey palette.
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3;
      const x = Math.cos(angle) * .085;
      const z = Math.sin(angle) * .085;
      const top = .49 + (i === 1 ? .035 : 0);
      quad([x * .3 - .009, .1, z * .3], [x * .3 + .009, .1, z * .3], [x + .009, top, z], [x - .009, top, z], 1);
      quad([x * .3, .1, z * .3 - .009], [x * .3, .1, z * .3 + .009], [x, top, z + .009], [x, top, z - .009], 3);
      const left = [x - .035, top, z];
      const right = [x + .035, top, z];
      const peak = [x, top + .025, z];
      triangle(left, peak, [x, top, z + .02], 1);
      triangle(peak, right, [x, top, z + .02], 3);
      triangle(left, [x, top, z - .02], peak, 3);
      triangle(peak, [x, top, z - .02], right, 1);
    }
  } else if (kind === 'blog') {
    // An open folded booklet: a central valley and two thin, layered leaves.
    for (let layer = 0; layer < 3; layer++) {
      const rise = layer * .014;
      const extent = .62 - layer * .018;
      for (const side of [-1, 1]) {
        const spineFront = [0, .015 + rise, .4];
        const spineBack = [0, .015 + rise, -.4];
        const outerFront = [side * extent, .17 + rise, .4];
        const outerBack = [side * extent, .17 + rise, -.4];
        quad(spineFront, outerFront, outerBack, spineBack, layer === 2 ? (side < 0 ? 1 : 3) : 2);
      }
    }
    // A fine centre fold gives the spread a readable spine at small sizes.
    quad([-.018, .049, .4], [.018, .049, .4], [.018, .049, -.4], [-.018, .049, -.4], 2);
  } else if (kind === 'about') {
    // Crane: diamond body, two creased wings, slender neck and a folded beak.
    const chest = [-.23, .3, 0];
    const back = [.26, .32, 0];
    const ridge = [0, .46, 0];
    const belly = [0, .12, 0];
    for (const side of [-1, 1]) {
      const front = [-.22, .3, side * .12];
      const rear = [.25, .3, side * .1];
      triangle(chest, front, ridge, 0);
      triangle(front, rear, ridge, 3);
      triangle(rear, back, ridge, 1);
      triangle(front, belly, rear, 2);
      const wingTip = [.09, .7, side * .88];
      const crease = [.02, .45, side * .38];
      triangle(front, wingTip, crease, 1);
      triangle(crease, wingTip, rear, 0);
      triangle(front, crease, rear, 3);
      const neckBase = [-.25, .32, side * .055];
      const neckTop = [-.53, .84, side * .023];
      triangle(neckBase, neckTop, [-.37, .76, 0], side < 0 ? 1 : 0);
      triangle(neckBase, [-.37, .76, 0], ridge, 2);
      triangle(neckTop, [-.7, .85, 0], [-.37, .76, 0], 1);
      triangle(neckTop, [-.82, .7, 0], [-.7, .85, 0], side < 0 ? 3 : 2);
      triangle(rear, [.88, .63, 0], [.4, .35, 0], 1);
      triangle(rear, [.4, .35, 0], back, 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  if (kind === 'news') { geometry.rotateX(-.35); geometry.rotateY(-.12); }
  if (kind === 'product') { geometry.rotateY(.55); geometry.rotateX(.66); }
  if (kind === 'blog') { geometry.rotateX(.45); geometry.rotateY(-.18); }
  if (kind === 'about') geometry.rotateY(.65);
  geometry.computeBoundingBox();
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  const scale = Math.min(1.28 / size.x, .64 / size.y);
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -geometry.boundingBox.min.y, -center.z);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}
