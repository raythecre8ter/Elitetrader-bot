class AvatarRenderer {
  constructor() {
    this.scenes = {};
    this.animationFrames = {};
    this.threeAvailable = typeof THREE !== 'undefined';
    this.portraitsAvailable = typeof AvatarPortraits !== 'undefined';
    this.clock = this.threeAvailable ? new THREE.Clock() : { getDelta: () => 0.016 };
  }

  createAvatar(canvasOrContainer, config, options = {}) {
    const id = options.id || 'avatar-' + Date.now();
    const width = options.width || 280;
    const height = options.height || 320;
    const companionId = config.companionId || config.name || '';

    // Prefer SVG portraits when available
    if (this.portraitsAvailable && companionId) {
      const svgHtml = AvatarPortraits.getPortraitSVG(companionId);
      if (svgHtml) {
        return this._renderSVGPortrait(canvasOrContainer, svgHtml, id, width, height, companionId);
      }
    }

    // Fallback: try THREE.js rendering
    if (!this.threeAvailable) return id;

    let canvas;
    if (canvasOrContainer instanceof HTMLCanvasElement) {
      canvas = canvasOrContainer;
    } else {
      canvas = document.createElement('canvas');
      canvasOrContainer.innerHTML = '';
      canvasOrContainer.appendChild(canvas);
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
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

  _renderSVGPortrait(canvasOrContainer, svgHtml, id, width, height, companionId) {
    let container;
    if (canvasOrContainer instanceof HTMLCanvasElement) {
      container = canvasOrContainer.parentElement || canvasOrContainer;
      // Hide the canvas so the SVG shows instead
      canvasOrContainer.style.display = 'none';
    } else {
      container = canvasOrContainer;
    }

    // Create a wrapper div for the SVG portrait
    const wrapper = document.createElement('div');
    wrapper.className = 'avatar-portrait-container';
    wrapper.setAttribute('data-avatar-id', id);
    wrapper.style.cssText = 'width:' + width + 'px;height:' + height + 'px;display:flex;align-items:center;justify-content:center;overflow:hidden;';
    wrapper.innerHTML = svgHtml;

    // Clear container and insert the SVG
    container.innerHTML = '';
    container.appendChild(wrapper);

    // Track for destroy
    this.scenes[id] = { isSVG: true, container: container, wrapper: wrapper, companionId: companionId };
    return id;
  }

  setupLighting(scene, config) {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);

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
      warm_golden: 0xFFD700,
      deep_blue: 0x4169E1,
      iridescent: 0xDA70D6,
      silver_gold: 0xC0C0C0,
      vibrant_fire: 0xFF6347,
      warm_firelight: 0xFF8C00
    };

    const auraColor = auraColors[config.aura] || 0x7EB09B;
    const auraLight = new THREE.PointLight(auraColor, 0.4, 5);
    auraLight.position.set(0, 0, 1.5);
    scene.add(auraLight);
  }

  buildAvatar(scene, config) {
    const group = new THREE.Group();

    const skinColor = new THREE.Color(config.skinTone || '#D4A574');
    const hairColor = new THREE.Color(config.hairColor === '#SILVER' ? '#C0C0C0' : (config.hairColor || '#2C1810'));
    const outfitColor = new THREE.Color(config.outfitColor || '#E8DDD3');
    const accentColor = new THREE.Color(config.accentColor || '#7EB09B');

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.6,
      metalness: 0.05
    });

    // Head
    const headGeom = new THREE.SphereGeometry(0.38, 32, 32);
    headGeom.scale(1, 1.12, 1);
    const head = new THREE.Mesh(headGeom, skinMaterial);
    head.position.y = 1.15;
    head.castShadow = true;
    group.add(head);

    // Eyes
    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 });
    const eyeColor = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.eyeColor || '#4A7C59'),
      roughness: 0.2,
      metalness: 0.1
    });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });

    [-0.13, 0.13].forEach(x => {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), eyeWhite);
      white.position.set(x, 1.2, 0.32);
      white.scale.set(1, 0.75, 0.5);
      group.add(white);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), eyeColor);
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
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 12),
      skinMaterial
    );
    nose.position.set(0, 1.12, 0.38);
    nose.scale.set(0.8, 1.2, 0.8);
    group.add(nose);

    // Mouth
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0xCC7777, roughness: 0.4 });
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI),
      mouthMat
    );
    mouth.position.set(0, 1.02, 0.34);
    mouth.rotation.x = Math.PI;
    mouth.rotation.z = Math.PI;
    group.add(mouth);

    // Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.15, 16),
      skinMaterial
    );
    neck.position.y = 0.8;
    group.add(neck);

    // Torso
    const torsoMat = new THREE.MeshStandardMaterial({
      color: outfitColor,
      roughness: 0.7,
      metalness: 0.05
    });

    const torsoGeom = new THREE.CylinderGeometry(0.25, 0.22, 0.65, 16);
    const torso = new THREE.Mesh(torsoGeom, torsoMat);
    torso.position.y = 0.42;
    torso.castShadow = true;
    group.add(torso);

    // Shoulders
    const shoulderGeom = new THREE.SphereGeometry(0.11, 16, 16);
    [-0.3, 0.3].forEach(x => {
      const shoulder = new THREE.Mesh(shoulderGeom, torsoMat);
      shoulder.position.set(x, 0.68, 0);
      group.add(shoulder);
    });

    // Arms
    const armGeom = new THREE.CylinderGeometry(0.06, 0.055, 0.45, 12);
    [-0.32, 0.32].forEach((x, i) => {
      const arm = new THREE.Mesh(armGeom, torsoMat);
      arm.position.set(x, 0.4, 0.02);
      arm.rotation.z = x > 0 ? -0.15 : 0.15;
      group.add(arm);

      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 12, 12),
        skinMaterial
      );
      hand.position.set(x * 1.05, 0.16, 0.02);
      group.add(hand);
    });

    // Hair
    this.addHair(group, config, hairColor);

    // Accessories
    if (config.accessories) {
      this.addAccessories(group, config, accentColor);
    }

    group.position.y = -0.5;
    scene.add(group);

    return {
      group,
      head,
      mouth,
      eyes: group.children.filter(c => c.material === eyeColor),
      pupils: group.children.filter(c => c.material === pupilMat)
    };
  }

  addHair(group, config, hairColor) {
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.8,
      metalness: 0.05
    });

    switch (config.hairStyle) {
      case 'flowing': {
        const mainHair = new THREE.Mesh(new THREE.SphereGeometry(0.41, 24, 24), hairMat);
        mainHair.position.set(0, 1.22, -0.02);
        mainHair.scale.set(1, 1.05, 1);
        group.add(mainHair);

        for (let i = 0; i < 6; i++) {
          const strand = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08 - i * 0.005, 0.04, 0.5 + i * 0.06, 8),
            hairMat
          );
          const angle = (i / 6) * Math.PI - Math.PI * 0.5;
          strand.position.set(Math.sin(angle) * 0.3, 0.85 - i * 0.04, Math.cos(angle) * 0.1 - 0.1);
          strand.rotation.z = Math.sin(angle) * 0.2;
          group.add(strand);
        }
        break;
      }
      case 'short_textured': {
        const buzz = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), hairMat);
        buzz.position.set(0, 1.22, 0);
        buzz.scale.set(1.02, 1.0, 1.0);
        group.add(buzz);
        break;
      }
      case 'wavy_long': {
        const mainHair = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), hairMat);
        mainHair.position.set(0, 1.23, -0.02);
        mainHair.scale.set(1.05, 1.05, 1);
        group.add(mainHair);

        for (let i = 0; i < 8; i++) {
          const strand = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07 - i * 0.003, 0.03, 0.6 + i * 0.05, 8),
            hairMat
          );
          const angle = (i / 8) * Math.PI * 1.4 - Math.PI * 0.7;
          strand.position.set(Math.sin(angle) * 0.32, 0.8 - i * 0.03, Math.cos(angle) * 0.08 - 0.08);
          strand.rotation.z = Math.sin(angle) * 0.3;
          strand.rotation.x = Math.sin(i * 0.5) * 0.1;
          group.add(strand);
        }
        break;
      }
      case 'elegant_short': {
        const elegantHair = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), hairMat);
        elegantHair.position.set(0, 1.24, -0.01);
        elegantHair.scale.set(1.03, 1.02, 1.01);
        group.add(elegantHair);

        const sideSwoop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), hairMat);
        sideSwoop.position.set(0.2, 1.35, 0.2);
        group.add(sideSwoop);
        break;
      }
      case 'bold_curly': {
        const bigHair = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 24), hairMat);
        bigHair.position.set(0, 1.28, 0);
        bigHair.scale.set(1.1, 1.1, 1.05);
        group.add(bigHair);

        for (let i = 0; i < 12; i++) {
          const curl = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random() * 0.04, 12, 12), hairMat);
          const angle = (i / 12) * Math.PI * 2;
          const radius = 0.35 + Math.random() * 0.1;
          curl.position.set(
            Math.sin(angle) * radius,
            1.25 + Math.random() * 0.2,
            Math.cos(angle) * radius * 0.8
          );
          group.add(curl);
        }
        break;
      }
      case 'messy_bun': {
        const baseHair = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), hairMat);
        baseHair.position.set(0, 1.22, -0.02);
        group.add(baseHair);

        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), hairMat);
        bun.position.set(0, 1.55, -0.1);
        group.add(bun);

        for (let i = 0; i < 5; i++) {
          const wisp = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.005, 0.15, 6), hairMat);
          wisp.position.set(
            (Math.random() - 0.5) * 0.3,
            1.1 + Math.random() * 0.1,
            0.3 + Math.random() * 0.05
          );
          wisp.rotation.z = (Math.random() - 0.5) * 0.5;
          group.add(wisp);
        }
        break;
      }
      default: {
        const defaultHair = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 24), hairMat);
        defaultHair.position.set(0, 1.22, -0.02);
        group.add(defaultHair);
      }
    }
  }

  addAccessories(group, config, accentColor) {
    const accentMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.3,
      metalness: 0.4
    });

    if (config.accessories.includes('crystal_pendant')) {
      const pendant = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.04),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.8 })
      );
      pendant.position.set(0, 0.7, 0.22);
      group.add(pendant);
    }

    if (config.accessories.includes('mala_beads')) {
      for (let i = 0; i < 12; i++) {
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), accentMat);
        const angle = (i / 12) * Math.PI * 0.8 + Math.PI * 0.1;
        bead.position.set(Math.sin(angle) * 0.15, 0.7 - Math.cos(angle) * 0.08, 0.2);
        group.add(bead);
      }
    }

    if (config.accessories.includes('star_earrings')) {
      [-0.35, 0.35].forEach(x => {
        const earring = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.025),
          new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.1, metalness: 0.8 })
        );
        earring.position.set(x, 1.1, 0.15);
        group.add(earring);
      });
    }

    if (config.accessories.includes('reading_glasses')) {
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.6 });
      [-0.13, 0.13].forEach(x => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 8, 16), glassMat);
        rim.position.set(x, 1.2, 0.36);
        group.add(rim);
      });
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 6), glassMat);
      bridge.position.set(0, 1.2, 0.38);
      bridge.rotation.z = Math.PI / 2;
      group.add(bridge);
    }

    if (config.accessories.includes('smart_watch')) {
      const watch = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.06, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.8 })
      );
      watch.position.set(-0.34, 0.2, 0.04);
      group.add(watch);
    }

    if (config.accessories.includes('headband')) {
      const headband = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.015, 8, 32, Math.PI),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.3 })
      );
      headband.position.set(0, 1.35, 0);
      headband.rotation.x = -0.2;
      group.add(headband);
    }

    if (config.accessories.includes('flower_crown')) {
      for (let i = 0; i < 7; i++) {
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.025, 8, 8),
          new THREE.MeshStandardMaterial({
            color: [0xFF69B4, 0xFFB347, 0xFF6B6B, 0xDDA0DD, 0xFFA07A][i % 5],
            roughness: 0.5
          })
        );
        const angle = (i / 7) * Math.PI + Math.PI * 0.15;
        flower.position.set(Math.sin(angle) * 0.38, 1.42, Math.cos(angle) * 0.2);
        group.add(flower);
      }
    }
  }

  addParticleAura(scene, config) {
    const auraColors = {
      warm_golden: 0xFFD700,
      deep_blue: 0x4169E1,
      iridescent: 0xDA70D6,
      silver_gold: 0xC0C0C0,
      vibrant_fire: 0xFF6347,
      warm_firelight: 0xFF8C00
    };

    const color = auraColors[config.aura] || 0x7EB09B;
    const particleCount = 40;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.6 + Math.random() * 0.8;
      positions[i * 3] = Math.sin(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.3) * 2;
      positions[i * 3 + 2] = Math.cos(angle) * radius * 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.isAura = true;
    scene.add(particles);
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

      // Breathing animation
      if (avatar.group) {
        avatar.group.position.y = -0.5 + Math.sin(data.time * 1.5) * 0.008;
      }

      // Subtle head movement
      if (avatar.head) {
        avatar.head.rotation.y = Math.sin(data.time * 0.5) * 0.03;
        avatar.head.rotation.x = Math.sin(data.time * 0.3) * 0.015;
      }

      // Blink animation
      if (avatar.eyes) {
        const blinkCycle = data.time % 4;
        const blinkScale = blinkCycle > 3.85 && blinkCycle < 3.95 ? 0.1 : 0.75;
        avatar.eyes.forEach(eye => {
          eye.scale.y = blinkScale;
        });
        avatar.pupils.forEach(pupil => {
          pupil.scale.y = blinkScale;
        });
      }

      // Aura particles float
      scene.children.forEach(child => {
        if (child.userData.isAura) {
          child.rotation.y += 0.003;
          const positions = child.geometry.attributes.position.array;
          for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += Math.sin(data.time + i) * 0.0005;
          }
          child.geometry.attributes.position.needsUpdate = true;
        }
      });

      data.renderer.render(scene, data.camera);
    };

    tick();
  }

  // Map internal expression names to AvatarPortraits expression set
  _mapExpression(expression) {
    const map = {
      'happy': 'happy',
      'joy': 'happy',
      'surprised': 'surprised',
      'sad': 'sad',
      'melancholy': 'sad',
      'angry': 'angry',
      'frustrated': 'angry',
      'calm': 'calm',
      'neutral': 'calm',
      'default': 'calm',
      'worried': 'worried',
      'anxious': 'worried',
      'concerned': 'worried'
    };
    return map[expression] || 'calm';
  }

  setExpression(id, expression) {
    const data = this.scenes[id];
    if (!data) return;

    // SVG portraits delegate to AvatarPortraits for expression changes
    if (data.isSVG) {
      if (typeof AvatarPortraits !== 'undefined' && AvatarPortraits.setExpression) {
        AvatarPortraits.setExpression(data.companionId, this._mapExpression(expression));
      }
      return;
    }

    if (!data.avatar) return;

    // Expressions modify mouth and eyebrow positions
    const { mouth, head } = data.avatar;
    if (!mouth) return;

    switch (expression) {
      case 'happy':
        mouth.scale.set(1.2, 1.2, 1);
        mouth.rotation.x = Math.PI;
        break;
      case 'compassionate':
        mouth.scale.set(0.9, 0.8, 1);
        break;
      case 'calm_reassuring':
        mouth.scale.set(1, 0.9, 1);
        break;
      case 'understanding':
        mouth.scale.set(0.95, 0.85, 1);
        if (head) head.rotation.x = 0.05;
        break;
      case 'encouraging':
        mouth.scale.set(1.1, 1.1, 1);
        break;
      default:
        mouth.scale.set(1, 1, 1);
    }
  }

  destroy(id) {
    if (this.animationFrames[id]) {
      cancelAnimationFrame(this.animationFrames[id]);
      delete this.animationFrames[id];
    }
    if (this.scenes[id]) {
      if (this.scenes[id].isSVG) {
        // SVG portrait cleanup
        if (this.scenes[id].wrapper && this.scenes[id].wrapper.parentElement) {
          this.scenes[id].wrapper.remove();
        }
      } else if (this.scenes[id].renderer) {
        this.scenes[id].renderer.dispose();
      }
      delete this.scenes[id];
    }
  }

  destroyAll() {
    Object.keys(this.scenes).forEach(id => this.destroy(id));
  }
}

window.AvatarRenderer = AvatarRenderer;
