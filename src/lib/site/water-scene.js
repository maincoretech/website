import * as THREE from 'three';
import { createOrigami } from './origami.js';
import { CAMERA_VIEWS as VIEWS, createCameraAxis, advanceCameraAxis, resetCameraAxis, cameraAxisSettled } from './camera-motion.js';
import { WATER_PHASE_GLSL, RIPPLE_GLSL, SCROLL_WAKE_GLSL, advanceScrollWake, advancePointerFlow, scrollDisturbance, RIPPLE_COUNT, RIPPLE_LIFETIME, prepareRipples, sampleFloat } from './water-motion.js';

const BACKGROUND = 0x10151c;
const EYE = new THREE.Vector3(0, 1.65, 1.6);

// A composed backdrop, not a free camera: only section changes travel through 3D.
// Water and a small folded-paper accent share the existing lightweight render loop.
export function createWaterScene(host, onFailure, { paper = true, onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(BACKGROUND);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BACKGROUND, 0.041);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 60);
  const geometries = new Set();
  const materials = new Set();
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const direction = new THREE.Vector3();
  let region = 'product';
  let still = false;
  let visible = true;
  let disposed = false;
  let firstFrame = true;
  let width = 1;
  let height = 1;
  let yaw = 0;
  let pitch = 0;
  const yawMotion = createCameraAxis();
  const pitchMotion = createCameraAxis();
  let journey = null;
  let frame = 0;
  let renderDeadline = 0;
  let lastTime = 0;
  let waterTime = 0;
  const ripples = Array.from({ length: RIPPLE_COUNT }, () => new THREE.Vector4(0, 0, -100, 0));
  const rippleField = Array.from({ length: RIPPLE_COUNT }, () => new THREE.Vector4());
  const raycaster = new THREE.Raycaster();
  const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.012);
  const touchPoint = new THREE.Vector2();
  const waterHit = new THREE.Vector3();
  const flow = new THREE.Vector3();
  const flowTarget = new THREE.Vector3();
  const scrollWake = new THREE.Vector2(.68, 0);
  const waterProjection = new THREE.Matrix4();
  const scrollSample = new THREE.Vector3();
  function scrollHeight(x, z) {
    if (scrollWake.y === 0) return 0;
    scrollSample.set(x, .012, z).applyMatrix4(waterProjection);
    if (scrollSample.z < -1 || scrollSample.z > 1) return 0;
    return scrollDisturbance((1 - scrollSample.y) / 2, scrollWake);
  }
  let pendingScroll = 0;
  const input = new THREE.Vector2();
  let inputPending = false;
  let inputRect;
  let dragId = null;
  let rippleIndex = 0;
  let rippleSequence = 0;
  let lastRippleTime = -1;
  const previousTouchAction = host.style.touchAction;
  if (paper) host.style.touchAction = 'none';

  const geometry = (value) => (geometries.add(value), value);
  const material = (value) => (materials.add(value), value);
  const waterMaterial = material(new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      ripples: { value: rippleField },
      flow: { value: flow },
      scrollWake: { value: scrollWake },
      viewportHeight: { value: 1 },
      viewportWidth: { value: 1 },
      surfaceBand: { value: new THREE.Vector2(.76, .8) },
      surfaceCurve: { value: .04 },
      deep: { value: new THREE.Color(0x141e2a) },
      light: { value: new THREE.Color(0x8eadc9) }
    },
    vertexShader: `
      varying vec2 surfaceUv;
      varying vec2 waterPoint;
      varying float waterDepth;
      void main() {
        surfaceUv = uv;
        waterPoint = (modelMatrix * vec4(position, 1.)).xz;
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.);
        waterDepth = -viewPosition.z;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec2 surfaceUv;
      varying vec2 waterPoint;
      varying float waterDepth;
      uniform float time;
      uniform vec2 surfaceBand;
      uniform float viewportWidth;
      uniform float surfaceCurve;
      uniform vec3 deep;
      uniform vec3 light;
      ${WATER_PHASE_GLSL}
      ${RIPPLE_GLSL}
      ${SCROLL_WAKE_GLSL}
      void main() {
        vec2 p = surfaceUv - .5;
        float radius = length(p) * 2.;
        float edge = 1. - smoothstep(.82, 1., radius);
        // Fade the distant water before the pool boundary becomes visible.
        // Camera depth follows every view; nearby props and waves stay crisp.
        float farFade = 1. - smoothstep(5.8, 10.5, waterDepth);
        float screenY = 1. - gl_FragCoord.y / viewportHeight;
        float side = gl_FragCoord.x / viewportWidth * 2. - 1.;
        float arc = side * side * surfaceCurve;
        float surfaceFade = smoothstep(surfaceBand.x + arc, surfaceBand.y + arc, screenY);
        float ripple = disturbance(waterPoint, time);
        ripple += scrollDisturbance(1. - gl_FragCoord.y / viewportHeight);
        float wave = sin(waterPhase(waterPoint, time) + ripple * 1.4);
        float sheen = pow(max(0., wave), 14.) * .045;
        // Read as transverse wave crests, without a bright longitudinal beam.
        vec3 colour = mix(deep, light, .07 + sheen + abs(ripple) * .09);
        gl_FragColor = vec4(colour, edge * farFade * surfaceFade * .94);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        // Fixed monochrome sub-level noise breaks up 8-bit gradient bands.
        // Compensate for alpha so the fade stays dithered after blending;
        // no time component, so holding still never introduces shimmer.
        float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715)))) - .5;
        gl_FragColor.rgb += vec3(grain / (255. * max(gl_FragColor.a, .05)));
      }
    `
  }));
  const disc = geometry(new THREE.PlaneGeometry(2, 2));
  scene.add(new THREE.HemisphereLight(0xc5d6eb, 0x151c26, 2.3));
  const key = new THREE.DirectionalLight(0xbacfea, 3.2);
  key.position.set(-6, 10, -4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9bbee8, 2.4);
  rim.position.set(5, 4, -12);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x9cabbd, 0.5);
  fill.position.set(3, 2, 5);
  scene.add(fill);

  function pool(x, z, sx, sz) {
    const mesh = new THREE.Mesh(disc, waterMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, .012, z);
    mesh.scale.set(sx, sz, 1);
    scene.add(mesh);
  }
  const ground = new THREE.Mesh(
    geometry(new THREE.PlaneGeometry(90, 90)),
    material(new THREE.MeshStandardMaterial({ color: BACKGROUND, roughness: 1, dithering: true }))
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.055;
  scene.add(ground);

  // Three paper accents share one material; no textures, shadows or model downloads.
  const paperMaterial = material(new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: .9, side: THREE.DoubleSide
  }));
  const props = {};
  for (const [id, angle] of Object.entries(VIEWS)) {
    const x = Math.sin(angle);
    const z = -Math.cos(angle);
    pool(EYE.x + x * 5, EYE.z + z * 5, 7, 6);
    if (!paper) continue;
    const prop = new THREE.Mesh(geometry(createOrigami(id)), paperMaterial);
    prop.position.set(EYE.x + x * 5.4, .025, EYE.z + z * 5.4);
    prop.rotation.y = -angle;
    prop.userData.home = prop.position.clone();
    prop.userData.angle = -angle;
    props[id] = prop;
    scene.add(prop);
  }
  const propProjection = new THREE.Vector3();
  const propCorners = Array.from({ length: 8 }, () => new THREE.Vector3());
  const floatingProps = Object.values(props);
  const pose = {};
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const tilt = new THREE.Quaternion();
  const heading = new THREE.Quaternion();
  function destination() {
    return { yaw: VIEWS[region] ?? 0, pitch: .015 };
  }
  function moveCamera(animate) {
    const target = destination();
    if (animate && !firstFrame && !preference.matches) journey = { target };
    else {
      yaw = target.yaw;
      pitch = target.pitch;
      journey = null;
      resetCameraAxis(yawMotion, yaw);
      resetCameraAxis(pitchMotion, pitch);
    }
    wake();
  }
  function waterEnabled() {
    return !still && !preference.matches;
  }
  function draw(now) {
    const dt = Math.min((now - lastTime) / 1000, .1);
    lastTime = now;
    if (waterEnabled()) waterTime += dt;
    if (waterEnabled()) {
      advanceScrollWake(scrollWake, pendingScroll, dt);
      pendingScroll = 0;
    }
    if (journey) {
      advanceCameraAxis(yawMotion, journey.target.yaw, dt);
      advanceCameraAxis(pitchMotion, journey.target.pitch, dt);
      yaw = yawMotion.value;
      pitch = pitchMotion.value;
      if (cameraAxisSettled(yawMotion, journey.target.yaw) && cameraAxisSettled(pitchMotion, journey.target.pitch)) {
        yaw = journey.target.yaw;
        pitch = journey.target.pitch;
        resetCameraAxis(yawMotion, yaw);
        resetCameraAxis(pitchMotion, pitch);
        journey = null;
      }
    }
    camera.position.copy(EYE);
    direction.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(direction.add(camera.position));
    // Project onto the same current-camera screen band used by gl_FragCoord.
    // Reuse one matrix/vector: five height samples per prop, no extra render loop.
    camera.updateMatrixWorld();
    waterProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (inputPending) {
      inputPending = false;
      disturb(input.x, input.y);
    }
    if (waterEnabled()) advancePointerFlow(flow, flowTarget, dt);
    waterMaterial.uniforms.time.value = waterTime;
    prepareRipples(waterTime, ripples, rippleField);
    const smoothing = !waterEnabled() ? 1 : 1 - Math.exp(-dt * 14);
    for (const prop of floatingProps) {
      const { home, angle } = prop.userData;
      if (waterEnabled()) {
        sampleFloat(home.x, home.z, waterTime, pose, rippleField, flow, true, scrollHeight);
      } else {
        Object.assign(pose, { x: home.x, y: home.y, z: home.z, slopeX: 0, slopeZ: 0, yaw: 0 });
      }
      prop.position.x += (pose.x - prop.position.x) * smoothing;
      prop.position.y += (pose.y - prop.position.y) * smoothing;
      prop.position.z += (pose.z - prop.position.z) * smoothing;
      normal.set(-pose.slopeX, 1, -pose.slopeZ).normalize();
      tilt.setFromUnitVectors(up, normal);
      heading.setFromAxisAngle(up, angle + pose.yaw);
      tilt.multiply(heading);
      prop.quaternion.slerp(tilt, smoothing);
    }
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      onReady?.();
    }
    if (import.meta.env.DEV) {
      const prop = props[region];
      if (prop) {
        const { min, max } = prop.geometry.boundingBox;
        prop.geometry.boundingBox.getCenter(propProjection);
        prop.localToWorld(propProjection).project(camera);
        host.dataset.propPosition = ((propProjection.x + 1) * width / 2).toFixed(1) + ',' + ((1 - propProjection.y) * height / 2).toFixed(1);
        propCorners.forEach((corner, i) => {
          corner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z);
          prop.localToWorld(corner).project(camera);
          corner.set((corner.x + 1) * width / 2, (1 - corner.y) * height / 2, 0);
        });
        host.dataset.propBounds = [
          Math.min(...propCorners.map(p => p.x)), Math.min(...propCorners.map(p => p.y)),
          Math.max(...propCorners.map(p => p.x)), Math.max(...propCorners.map(p => p.y))
        ].map(v => v.toFixed(1)).join(',');
        host.dataset.propKind = { product: 'lily', blog: 'book', about: 'crane' }[region];
        host.dataset.propPose = [...prop.position.toArray(), ...prop.quaternion.toArray()].map(v => v.toFixed(4)).join(',');
      }
      host.dataset.frames = String(renderer.info.render.frame);
      host.dataset.drawCalls = String(renderer.info.render.calls);
      host.dataset.triangles = String(renderer.info.render.triangles);
      host.dataset.waterTime = waterTime.toFixed(3);
      host.dataset.ripples = String(ripples.filter(r => waterTime - r.z < RIPPLE_LIFETIME).length);
      host.dataset.rippleSequence = String(rippleSequence);
      host.dataset.dragging = String(dragId !== null);
      host.dataset.flow = flow.toArray().map(v => v.toFixed(3)).join(',');
      host.dataset.scrollWake = scrollWake.toArray().map(v => v.toFixed(4)).join(',');
      host.dataset.region = region;
      host.dataset.moving = String(!!journey);
      host.dataset.camera = camera.position.toArray().map(v => v.toFixed(3)).join(',');
      host.dataset.view = yaw.toFixed(3) + ',' + pitch.toFixed(3);
    }
  }
  function canRun() {
    return !disposed && visible && !document.hidden;
  }
  function tick(now) {
    frame = 0;
    if (!canRun()) return;
    // Keep the same cadence through the turn's tail and the idle water motion.
    // Visibility/reduced-motion gates still stop the loop when it is not needed.
    const interval = 1000 / 60;
    if (now + .5 < renderDeadline) {
      frame = requestAnimationFrame(tick);
      return;
    }
    renderDeadline += interval;
    if (renderDeadline < now) renderDeadline = now + interval;
    draw(now);
    if (journey || waterEnabled()) {
      // One display-synchronised clock, capped at 60 fps even on fast displays.
      frame = requestAnimationFrame(tick);
    }
  }
  function wake(immediate = false) {
    if (immediate) renderDeadline = 0;
    if (canRun() && !frame) { renderDeadline = 0; frame = requestAnimationFrame(tick); }
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  function visibility() {
    if (canRun()) {
      lastTime = performance.now();
      wake();
    } else { endDrag(); stop(); }
  }
  function resize() {
    const nextWidth = Math.max(1, host.clientWidth);
    const nextHeight = Math.max(1, host.clientHeight);
    if (!firstFrame && nextWidth === width && nextHeight === height) return;
    endDrag();
    width = nextWidth;
    height = nextHeight;
    renderer.setSize(width, height, false);
    waterMaterial.uniforms.viewportHeight.value = renderer.domElement.height;
    waterMaterial.uniforms.viewportWidth.value = renderer.domElement.width;
    camera.aspect = width / height;
    camera.fov = width < 760 ? 66 : 58;
    camera.updateProjectionMatrix();
    // Fit paper between the actual reading edge and navigation, including short
    // screens. Every section shares the same projected centre.
    const viewport = host.getBoundingClientRect();
    const shell = host.parentElement;
    const readingPanel = shell.querySelector('.reading-panel');
    const tabs = shell.querySelector('.site-navigation');
    // The scene can finish fading out after an article has removed its tabs.
    if (!readingPanel || !tabs) return;
    const reading = readingPanel.getBoundingClientRect();
    const navigation = tabs.getBoundingClientRect();
    const top = reading.bottom - viewport.top + 2;
    const bottom = navigation.top - viewport.top - 14;
    const targetY = (top + bottom) / 2;
    const targetX = width / 2;
    const layoutCamera = camera.clone();
    const ray = new THREE.Vector3();
    const centre = new THREE.Vector3();
    const corner = new THREE.Vector3();
    let paperTop = Infinity;
    for (const [id, prop] of Object.entries(props)) {
      const angle = VIEWS[id];
      const previousHome = prop.userData.home.clone();
      const previousOffset = prop.position.clone().sub(previousHome);
      const previousRotation = prop.quaternion.clone();
      layoutCamera.position.copy(EYE);
      layoutCamera.lookAt(EYE.x + Math.sin(angle) * Math.cos(.015), EYE.y + Math.sin(.015), EYE.z - Math.cos(angle) * Math.cos(.015));
      layoutCamera.updateMatrixWorld();
      ray.set(targetX / width * 2 - 1, 1 - targetY / height * 2, .5).unproject(layoutCamera).sub(EYE).normalize();
      prop.rotation.set(0, -angle, 0);
      prop.scale.setScalar(.79);
      const box = prop.geometry.boundingBox;
      box.getCenter(centre);
      for (let attempt = 0; attempt < 4; attempt++) {
        const distance = (.025 + centre.y * prop.scale.y - EYE.y) / ray.y;
        prop.position.copy(EYE).addScaledVector(ray, distance);
        prop.position.y = .025;
        prop.updateMatrixWorld();
        let left = Infinity, right = -Infinity, upper = Infinity, lower = -Infinity;
        for (let i = 0; i < 8; i++) {
          corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
          prop.localToWorld(corner).project(layoutCamera);
          const x = (corner.x + 1) * width / 2, y = (1 - corner.y) * height / 2;
          left = Math.min(left, x); right = Math.max(right, x);
          upper = Math.min(upper, y); lower = Math.max(lower, y);
        }
        const fit = Math.min(1, (navigation.width / 3 - 24) / (right - left), (bottom - top) / (lower - upper));
        if (fit >= .999 || attempt === 3) {
          paperTop = Math.min(paperTop, upper);
          break;
        }
        prop.scale.multiplyScalar(Math.max(.1, fit * .96));
      }
      prop.userData.home.copy(prop.position);
      if (!firstFrame) {
        prop.position.add(previousOffset);
        prop.quaternion.copy(previousRotation);
      }
    }
    // Extend the faint upper edge behind the last lines of text. Fade only the
    // water material, never the paper, and do not follow its per-frame bob.
    if (!Number.isFinite(paperTop)) paperTop = targetY;
    waterMaterial.uniforms.surfaceBand.value.set((paperTop - 48) / height, (paperTop + 58) / height);
    waterMaterial.uniforms.surfaceCurve.value = Math.min(54, Math.max(18, width * .045)) / height;
    if (import.meta.env.DEV) host.dataset.waterBand = [paperTop - 48, paperTop + 58].map(value => value.toFixed(1)).join(',');
    // A resize must not snap an in-progress camera journey to its destination.
    // Repaint in the same ResizeObserver turn: setSize clears the drawing buffer.
    if (firstFrame) moveCamera(false);
    draw(performance.now());
    wake();
  }
  function pointerMove(event) {
    if (event.pointerId !== dragId) return;
    // Keep only the newest input; projection and sampling run once per rendered frame.
    input.set(event.clientX, event.clientY);
    inputPending = true;
    wake();
  }
  function disturb(clientX, clientY, first = false) {
    if (!waterEnabled() || !props[region]) return false;
    touchPoint.set((clientX - inputRect.left) / width * 2 - 1, 1 - (clientY - inputRect.top) / height * 2);
    raycaster.setFromCamera(touchPoint, camera);
    if (!raycaster.ray.intersectPlane(waterPlane, waterHit)) return false;
    // Match the visible water band, not an invisible radius around the paper.
    // A finger can keep travelling across the foreground without losing its wake.
    const screenY = (clientY - inputRect.top) / height;
    const side = (clientX - inputRect.left) / width * 2 - 1;
    const edge = waterMaterial.uniforms.surfaceBand.value.x
      + side * side * waterMaterial.uniforms.surfaceCurve.value;
    if (screenY < edge || waterHit.distanceToSquared(EYE) > 1600) {
      flowTarget.z = 0;
      return false;
    }
    flowTarget.set(waterHit.x, waterHit.z, .75);
    // Drag trails are rate-limited; a new press always gets its own immediate impulse.
    // Very rapid taps recycle the oldest of four slots, keeping work bounded.
    if (first || waterTime - lastRippleTime >= RIPPLE_LIFETIME / RIPPLE_COUNT + .02) {
      ripples[rippleIndex].set(waterHit.x, waterHit.z, waterTime, .85);
      rippleIndex = (rippleIndex + 1) % RIPPLE_COUNT;
      rippleSequence++;
      lastRippleTime = waterTime;
    }
    return true;
  }
  function startDrag(event) {
    // Only bare scenery receives gestures; reading, links and navigation stay native.
    if (dragId !== null || event.button !== 0 || !event.isPrimary) return;
    inputRect = host.getBoundingClientRect();
    if (!disturb(event.clientX, event.clientY, true)) return;
    dragId = event.pointerId;
    host.setPointerCapture(dragId);
    host.style.cursor = 'grabbing';
    wake(true);
  }
  function endDrag(event) {
    if (event && event.pointerId !== dragId) return;
    // A short swipe can end between frames. Do not discard its final position.
    if (event?.type === 'pointerup' && inputRect) {
      disturb(event.clientX, event.clientY);
      advancePointerFlow(flow, flowTarget, 0);
    }
    const id = dragId;
    dragId = null;
    inputPending = false;
    flowTarget.z = 0;
    if (id !== null && host.hasPointerCapture(id)) host.releasePointerCapture(id);
    host.style.cursor = '';
  }
  function motionChange() {
    endDrag();
    pendingScroll = 0;
    scrollWake.set(.68, 0);
    moveCamera(false);
  }
  function lost(event) {
    event.preventDefault();
    stop();
    onFailure();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visibility();
  });
  observer.observe(host);
  document.addEventListener('visibilitychange', visibility);
  preference.addEventListener('change', motionChange);
  host.addEventListener('pointermove', pointerMove);
  host.addEventListener('pointerdown', startDrag);
  host.addEventListener('pointerup', endDrag);
  host.addEventListener('pointercancel', endDrag);
  host.addEventListener('lostpointercapture', endDrag);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  resize();

  return {
    select(id) {
      if (!Object.hasOwn(VIEWS, id) || region === id) return;
      region = id;
      endDrag();
      pendingScroll = 0;
      // Preserve the existing wave and let advanceScrollWake decay it naturally.
      moveCamera(true);
    },
    setStill(value) {
      if (still === value) return;
      still = value;
      if (still) { endDrag(); pendingScroll = 0; scrollWake.set(.68, 0); }
      lastTime = performance.now();
      wake();
    },
    scroll(delta) {
      if (!waterEnabled() || !canRun() || !Number.isFinite(delta)) return;
      pendingScroll = Math.max(-120, Math.min(120, pendingScroll + delta));
      wake(true);
    },
    dispose() {
      disposed = true;
      endDrag();
      stop();
      resizeObserver.disconnect();
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      preference.removeEventListener('change', motionChange);
      host.removeEventListener('pointermove', pointerMove);
      host.removeEventListener('pointerdown', startDrag);
      host.removeEventListener('pointerup', endDrag);
      host.removeEventListener('pointercancel', endDrag);
      host.removeEventListener('lostpointercapture', endDrag);
      host.style.touchAction = previousTouchAction;
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      geometries.forEach(value => value.dispose());
      materials.forEach(value => value.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
