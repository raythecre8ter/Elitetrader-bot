class AvatarRenderer {
  constructor() {
    this.scenes = {};
    this.animationFrames = {};
    this.threeAvailable = typeof THREE !== 'undefined';
    this.clock = this.threeAvailable ? new THREE.Clock() : { getDelta: () => 0.016 };
  }

  createAvatar(canvasOrContainer, config, options = {}) {
    const id = options.id || 'avatar-' + Date.now();
    const width = options.width || 280;
    const height = options.height || 320;

    if (!this.threeAvailable) return id;

    let canvas;
    if (canvasOrContainer instanceof HTMLCanvasElement) {
      canvas = canvasOrContainer;
    } else {
      canvas = document.createElement('canvas');
      canvasOrContainer.innerHTML = '';
      canvasOrContainer.appendChild(canvas);
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.3, 3.2);
    camera.lookAt(0, 0.2, 0);

    this.setupLighting(scene, config);
    const avatar = this.buildAvatar(scene, config);
    this.addParticleAura(scene, config);

    this.scenes[id] = { renderer, scene, camera, avatar, config, time: 0 };
    this.animate(id);
    return id;
  }

  setupLighting(scene, config) {
    scene.add(new THREE.AmbientLight(0x404060, 0.6));

    const keyLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    keyLight.position.set(2, 3, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8888cc, 0.3);
    fillLight.position.set(-2, 1, 1);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 2, -3);
    scene.add(rimLight);

    const auraColors = {
      warm_golden: 0xFFD700, deep_blue: 0x4169E1, iridescent: 0xDA70D6,
      silver_gold: 0xC0C0C0, vibrant_fire: 0xFF6347, warm_firelight: 0xFF8C00
    };
    const auraLight = new THREE.PointLight(auraColors[config.aura] || 0x7EB09B, 0.4, 5);
    auraLight.position.set(0, 0, 1.5);
    scene.add(auraLight);
  }

  buildAvatar(scene, config) {
    const group = new THREE.Group();
    const skinColor = new THREE.Color(config.skinTone || '#D4A574');
    const hairColor = new THREE.Color(config.hairColor === '#SILVER' ? '#C0C0C0' : (config.hairColor || '#2C1810'));
    const outfitColor = new THREE.Color(config.outfitColor || '#E8DDD3');
    const accentColor = new THREE.Color(config.accentColor || '#7EB09B');

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6, metalness: 0.05 });

    // Head
    const headGeom = new THREE.SphereGeometry(0.38, 32, 32);
    headGeom.scale(1, 1.12, 1);
    const head = new THREE.Mesh(headGeom, skinMat);
    head.position.y = 1.15;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 });
    const eyeColorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(config.eyeColor || '#4A7C59'), roughness: 0.2, metalness: 0.1 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });

    [-0.13, 0.13].forEach(x => {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), eyeWhiteMat);
      white.position.set(x, 1.2, 0.32);
      white.scale.set(1, 0.75, 0.5);
      group.add(white);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), eyeColorMat);
      iris.position.set(x, 1.2, 0.36);
      iris.scale.set(1, 0.85, 0.5);
      group.add(iris);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 12), pupilMat);
      pupil.position.set(x, 1.2, 0.38);
      pupil.scale.set(1, 0.85, 0.5);
      group.add(pupil);
    });

    // Eyebrows
    const browMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
    [-0.13, 0.13].forEach(x => {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.03), browMat);
      brow.position.set(x, 1.3, 0.33);
      brow.rotation.z = x > 0 ? -0.1 : 0.1;
      group.add(brow);
    });

    // Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), skinMat);
    nose.position.set(0, 1.12, 0.38);
    nose.scale.set(0.8, 1.2, 0.8);
    group.add(nose);

    // Mouth
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0xCC7777, roughness: 0.4 });
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI), mouthMat);
    mouth.position.set(0, 1.02, 0.34);
    mouth.rotation.x = Math.PI;
    mouth.rotation.z = Math.PI;
    group.add(mouth);

    // Neck
    group.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 16), skinMat), { position: new THREE.Vector3(0, 0.8, 0) }));

    // Torso
    const torsoMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.7, metalness: 0.05 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.65, 16), torsoMat);
    torso.position.y = 0.42;
    torso.castShadow = true;
    group.add(torso);

    // Shoulders
    [-0.3, 0.3].forEach(x => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), torsoMat);
      s.position.set(x, 0.68, 0);
      group.add(s);
    });

    // Arms & hands
    [-0.32, 0.32].forEach(x => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.45, 12), torsoMat);
      arm.position.set(x, 0.4, 0.02);
      arm.rotation.z = x > 0 ? -0.15 : 0.15;
      group.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), skinMat);
      hand.position.set(x * 1.05, 0.16, 0.02);
      group.add(hand);
    });

    this.addHair(group, config, hairColor);
    if (config.accessories) this.addAccessories(group, config, accentColor);

    group.position.y = -0.5;
    scene.add(group);

    return {
      group, head, mouth,
      eyes: group.children.filter(c => c.material === eyeColorMat),
      pupils: group.children.filter(c => c.material === pupilMat)
    };
  }

  addHair(group, config, hairColor) {
    const mat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8, metalness: 0.05 });
    switch (config.hairStyle) {
      case 'flowing': {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.41, 24, 24), mat);
        m.position.set(0, 1.22, -0.02); m.scale.set(1, 1.05, 1); group.add(m);
        for (let i = 0; i < 6; i++) {
          const s = new THREE.Mesh(new THREE.CylinderGeometry(0.08 - i * 0.005, 0.04, 0.5 + i * 0.06, 8), mat);
          const a = (i / 6) * Math.PI - Math.PI * 0.5;
          s.position.set(Math.sin(a) * 0.3, 0.85 - i * 0.04, Math.cos(a) * 0.1 - 0.1);
          s.rotation.z = Math.sin(a) * 0.2; group.add(s);
        } break;
      }
      case 'short_textured': {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), mat);
        b.position.set(0, 1.22, 0); b.scale.set(1.02, 1.0, 1.0); group.add(b); break;
      }
      case 'wavy_long': {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), mat);
        m.position.set(0, 1.23, -0.02); m.scale.set(1.05, 1.05, 1); group.add(m);
        for (let i = 0; i < 8; i++) {
          const s = new THREE.Mesh(new THREE.CylinderGeometry(0.07 - i * 0.003, 0.03, 0.6 + i * 0.05, 8), mat);
          const a = (i / 8) * Math.PI * 1.4 - Math.PI * 0.7;
          s.position.set(Math.sin(a) * 0.32, 0.8 - i * 0.03, Math.cos(a) * 0.08 - 0.08);
          s.rotation.z = Math.sin(a) * 0.3; s.rotation.x = Math.sin(i * 0.5) * 0.1; group.add(s);
        } break;
      }
      case 'elegant_short': {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), mat);
        e.position.set(0, 1.24, -0.01); e.scale.set(1.03, 1.02, 1.01); group.add(e);
        const sw = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), mat);
        sw.position.set(0.2, 1.35, 0.2); group.add(sw); break;
      }
      case 'bold_curly': {
        const big = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 24), mat);
        big.position.set(0, 1.28, 0); big.scale.set(1.1, 1.1, 1.05); group.add(big);
        for (let i = 0; i < 12; i++) {
          const c = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.04, 12, 12), mat);
          const a = (i / 12) * Math.PI * 2, r = 0.35 + Math.random() * 0.1;
          c.position.set(Math.sin(a) * r, 1.25 + Math.random() * 0.2, Math.cos(a) * r * 0.8); group.add(c);
        } break;
      }
      case 'messy_bun': {
        const base = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), mat);
        base.position.set(0, 1.22, -0.02); group.add(base);
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), mat);
        bun.position.set(0, 1.55, -0.1); group.add(bun);
        for (let i = 0; i < 5; i++) {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.005, 0.15, 6), mat);
          w.position.set((Math.random() - 0.5) * 0.3, 1.1 + Math.random() * 0.1, 0.3 + Math.random() * 0.05);
          w.rotation.z = (Math.random() - 0.5) * 0.5; group.add(w);
        } break;
      }
      default: {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), mat);
        d.position.set(0, 1.22, -0.02); group.add(d);
      }
    }
  }

  addAccessories(group, config, accentColor) {
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3, metalness: 0.4 });
    if (config.accessories.includes('crystal_pendant')) {
      const p = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.8 }));
      p.position.set(0, 0.7, 0.22); group.add(p);
    }
    if (config.accessories.includes('mala_beads')) {
      for (let i = 0; i < 12; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), accentMat);
        const a = (i / 12) * Math.PI * 0.8 + Math.PI * 0.1;
        b.position.set(Math.sin(a) * 0.15, 0.7 - Math.cos(a) * 0.08, 0.2); group.add(b);
      }
    }
    if (config.accessories.includes('star_earrings')) {
      [-0.35, 0.35].forEach(x => {
        const e = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.1, metalness: 0.8 }));
        e.position.set(x, 1.1, 0.15); group.add(e);
      });
    }
    if (config.accessories.includes('reading_glasses')) {
      const gm = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.6 });
      [-0.13, 0.13].forEach(x => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 8, 16), gm); r.position.set(x, 1.2, 0.36); group.add(r); });
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 6), gm);
      br.position.set(0, 1.2, 0.38); br.rotation.z = Math.PI / 2; group.add(br);
    }
    if (config.accessories.includes('smart_watch')) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.8 }));
      w.position.set(-0.34, 0.2, 0.04); group.add(w);
    }
    if (config.accessories.includes('headband')) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.015, 8, 32, Math.PI), new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.3 }));
      h.position.set(0, 1.35, 0); h.rotation.x = -0.2; group.add(h);
    }
    if (config.accessories.includes('flower_crown')) {
      for (let i = 0; i < 7; i++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshStandardMaterial({ color: [0xFF69B4, 0xFFB347, 0xFF6B6B, 0xDDA0DD, 0xFFA07A][i % 5], roughness: 0.5 }));
        const a = (i / 7) * Math.PI + Math.PI * 0.15;
        f.position.set(Math.sin(a) * 0.38, 1.42, Math.cos(a) * 0.2); group.add(f);
      }
    }
  }

  addParticleAura(scene, config) {
    const auraColors = {
      warm_golden: 0xFFD700, deep_blue: 0x4169E1, iridescent: 0xDA70D6,
      silver_gold: 0xC0C0C0, vibrant_fire: 0xFF6347, warm_firelight: 0xFF8C00
    };
    const color = auraColors[config.aura] || 0x7EB09B;
    const count = 40;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 0.8;
      pos[i * 3] = Math.sin(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.3) * 2;
      pos[i * 3 + 2] = Math.cos(a) * r * 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.03, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.userData.isAura = true;
    scene.add(pts);
  }

  animate(id) {
    const data = this.scenes[id];
    if (!data) return;
    const tick = () => {
      if (!this.scenes[id]) return;
      data.time += 0.016;
      this.animationFrames[id] = requestAnimationFrame(tick);
      const { avatar, scene } = data;
      if (!avatar) return;

      if (avatar.group) avatar.group.position.y = -0.5 + Math.sin(data.time * 1.5) * 0.008;
      if (avatar.head) {
        avatar.head.rotation.y = Math.sin(data.time * 0.5) * 0.03;
        avatar.head.rotation.x = Math.sin(data.time * 0.3) * 0.015;
      }
      if (avatar.eyes) {
        const bc = data.time % 4;
        const bs = (bc > 3.85 && bc < 3.95) ? 0.1 : 0.75;
        avatar.eyes.forEach(e => { e.scale.y = bs; });
        avatar.pupils.forEach(p => { p.scale.y = bs; });
      }
      scene.children.forEach(child => {
        if (child.userData.isAura) {
          child.rotation.y += 0.003;
          const p = child.geometry.attributes.position.array;
          for (let i = 0; i < p.length; i += 3) p[i + 1] += Math.sin(data.time + i) * 0.0005;
          child.geometry.attributes.position.needsUpdate = true;
        }
      });
      data.renderer.render(scene, data.camera);
    };
    tick();
  }

  setExpression(id, expression) {
    const data = this.scenes[id];
    if (!data || !data.avatar) return;
    const { mouth, head } = data.avatar;
    if (!mouth) return;
    switch (expression) {
      case 'happy': mouth.scale.set(1.2, 1.2, 1); mouth.rotation.x = Math.PI; break;
      case 'compassionate': mouth.scale.set(0.9, 0.8, 1); break;
      case 'calm_reassuring': mouth.scale.set(1, 0.9, 1); break;
      case 'understanding': mouth.scale.set(0.95, 0.85, 1); if (head) head.rotation.x = 0.05; break;
      case 'encouraging': mouth.scale.set(1.1, 1.1, 1); break;
      default: mouth.scale.set(1, 1, 1);
    }
  }

  destroy(id) {
    if (this.animationFrames[id]) { cancelAnimationFrame(this.animationFrames[id]); delete this.animationFrames[id]; }
    if (this.scenes[id]) { this.scenes[id].renderer.dispose(); delete this.scenes[id]; }
  }

  destroyAll() { Object.keys(this.scenes).forEach(id => this.destroy(id)); }
}

window.AvatarRenderer = AvatarRenderer;
