(() => {
  'use strict';
  const figure = document.querySelector('.skills-figure');
  const canvas = figure.querySelector('.skills-canvas');
  const toggle = figure.querySelector('.sphere-toggle');
  const help = figure.querySelector('#skills-help');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) {
    help.textContent = '当前浏览器暂不支持三维显示';
    return;
  }

  // Art-directed word clusters repeat around the sphere to keep every angle full.
  // Positions and type sizes are in degrees of the spherical texture.
  const layout = [
    { text: '技能关键词', x: 0, y: 5, size: 15.5, color: '#06275d', weight: 800 },
    { text: '3dmax', x: 0, y: 67, size: 8, tilt: -3 },
    { text: 'JavaScript', x: -3, y: 51, size: 10, tilt: -3 },
    { text: 'Linux', x: -48, y: 48, size: 5.2, tilt: -8 },
    { text: 'Figma', x: 44, y: 50, size: 7, tilt: 7 },
    { text: 'Java', x: -46, y: 35, size: 7, tilt: -6 },
    { text: 'PhotoShop', x: 0, y: 35, size: 11 },
    { text: 'UI 设计', x: 45, y: 35, size: 7, tilt: 5 },
    { text: 'Git', x: -51, y: 23, size: 6, tilt: -5 },
    { text: '图像处理', x: -23, y: 21, size: 6.2 },
    { text: '三维建模', x: 24, y: 21, size: 7.2, tilt: 2 },
    { text: 'Java', x: 0, y: 22, size: 4.7, tilt: -7 },
    { text: 'Linux', x: 54, y: 23, size: 5.8, tilt: 7 },
    { text: 'Git', x: 60, y: 4, size: 9.5, tilt: -6 },
    { text: 'MySQL', x: -42, y: -10, size: 6.8, tilt: -5 },
    { text: 'Git', x: -18, y: -9, size: 5.1, tilt: 7 },
    { text: '版式设计', x: 8, y: -10, size: 7.2 },
    { text: 'Figma', x: 47, y: -10, size: 6.2, tilt: -5 },
    { text: 'Illustrator', x: -37, y: -24, size: 7.5, italic: true, tilt: 3 },
    { text: 'C 语言', x: 4, y: -25, size: 13.4, weight: 800, color: '#00b1bf' },
    { text: 'UI 设计', x: 51, y: -24, size: 6.4, tilt: 3 },
    { text: '数据结构', x: -36, y: -38, size: 7.5, tilt: 4 },
    { text: '物料输出', x: 9, y: -39, size: 7.5 },
    { text: 'LOGO 设计', x: 44, y: -36, size: 7, italic: true, tilt: -4 },
    { text: '平面设计', x: -30, y: -53, size: 8, tilt: 5 },
    { text: 'blender', x: 5, y: -54, size: 7.5 },
    { text: 'CAD 识图', x: 42, y: -54, size: 7, tilt: -6 },
    { text: 'Rhino', x: -43, y: -65, size: 7 },
    { text: '视频剪辑', x: 2, y: -68, size: 7 },
    { text: 'V-Ray', x: 47, y: -65, size: 6, italic: true },
  ];
  const words = new Map([...figure.querySelectorAll('.word')].map(word =>
    [word.textContent, getComputedStyle(word).fill]));
  let program, rotationLocation, indexCount;
  let yaw = 0, pitch = 0, velocityX = 0, velocityY = 0;
  let playing = !reduced.matches, visible = true, lost = false;
  let frame = 0, previousTime = 0, pointer = null;

  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(result));
    }
    return result;
  }

  function createTexture() {
    const textureCanvas = document.createElement('canvas');
    const width = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE));
    textureCanvas.width = width;
    textureCanvas.height = width / 2;
    const ctx = textureCanvas.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const longitude of [-120, 0, 120]) {
      for (const label of layout) {
        const x = (.5 + (longitude + label.x) / 360) * width;
        const y = (.5 - label.y / 180) * textureCanvas.height;
        const size = label.size / 360 * width;
        ctx.font = `${label.italic ? 'italic ' : ''}${label.weight || 700} ${size}px Arial, "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = label.color || words.get(label.text);
        // Wrapped copies preserve letters crossing the longitude seam.
        for (const shift of [-width, 0, width]) {
          ctx.save();
          ctx.translate(x + shift, y);
          ctx.rotate((label.tilt || 0) * Math.PI / 180);
          ctx.fillText(label.text, 0, 0);
          ctx.restore();
        }
      }
    }
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');
    if (anisotropy) gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,
      Math.min(8, gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  }

  function initialize() {
    const vertex = shader(gl.VERTEX_SHADER, `
      attribute vec3 aPosition;
      attribute vec2 aUV;
      uniform mat3 uRotation;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUV;
      void main() {
        vec3 p = uRotation * aPosition;
        float distance = 3.4 - p.z;
        gl_Position = vec4(p.xy * 2.8, distance * 1.002 - .2002, distance);
        vNormal = p;
        vPosition = p;
        vUV = aUV;
      }
    `);
    const fragment = shader(gl.FRAGMENT_SHADER, `
      precision mediump float;
      uniform sampler2D uTexture;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUV;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 view = normalize(vec3(0., 0., 3.4) - vPosition);
        vec4 ink = texture2D(uTexture, vUV);
        float edge = pow(1. - max(dot(normal, view), 0.), 1.8);
        float tint = .70 * edge + .035 * (1. - normal.y);
        vec3 porcelain = mix(vec3(.965, .985, 1.), vec3(.73, .83, .94), tint);
        vec3 color = porcelain * (1. - ink.a) + ink.rgb;
        gl_FragColor = vec4(color, 1.);
      }
    `);
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.useProgram(program);
    rotationLocation = gl.getUniformLocation(program, 'uRotation');
    gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);

    const vertices = [], indices = [];
    const rows = 64, columns = 128;
    for (let row = 0; row <= rows; row++) {
      const v = row / rows;
      const latitude = (v - .5) * Math.PI;
      for (let column = 0; column <= columns; column++) {
        const u = column / columns;
        const longitude = (u - .5) * 2 * Math.PI;
        vertices.push(
          Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude),
          Math.cos(latitude) * Math.cos(longitude), u, v
        );
        if (row < rows && column < columns) {
          const a = row * (columns + 1) + column, b = a + columns + 1;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    const uv = gl.getAttribLocation(program, 'aUV');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    indexCount = indices.length;
    createTexture();
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    lost = false;
    figure.classList.add('has-3d');
    figure.querySelector('.skills-sphere').setAttribute('aria-hidden', 'true');
    canvas.removeAttribute('aria-hidden');
    toggle.hidden = false;
    updateToggle();
    resize();
  }

  function draw() {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
    gl.uniformMatrix3fv(rotationLocation, false, new Float32Array([
      cy, sx * sy, -cx * sy,
      0, cx, sx,
      sy, -sx * cy, cx * cy,
    ]));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  }

  function tick(time) {
    frame = 0;
    if (lost || !visible || document.hidden) { previousTime = 0; return; }
    const dt = previousTime ? Math.min((time - previousTime) / 1000, .05) : 0;
    previousTime = time;
    if (!pointer) {
      if (playing) yaw += dt * .075;
      if (!reduced.matches) {
        yaw += velocityX * dt;
        pitch = Math.max(-1.2, Math.min(1.2, pitch + velocityY * dt));
        velocityX *= Math.exp(-5 * dt);
        velocityY *= Math.exp(-5 * dt);
      }
    }
    draw();
    if (!pointer && (playing || Math.abs(velocityX) + Math.abs(velocityY) > .002)) schedule();
    else previousTime = 0;
  }
  function schedule() { if (program && !frame && !lost) frame = requestAnimationFrame(tick); }
  function resize() {
    if (lost || !program) return;
    const size = Math.round(canvas.getBoundingClientRect().width * Math.min(devicePixelRatio || 1, 2));
    if (!size) return;
    if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size;
    gl.viewport(0, 0, size, size);
    schedule();
  }
  function updateToggle() {
    toggle.textContent = playing ? '暂停旋转' : '自动旋转';
    toggle.setAttribute('aria-label', playing ? '暂停技能球自动旋转' : '开启技能球自动旋转');
  }
  toggle.addEventListener('click', () => {
    playing = !playing;
    velocityX = velocityY = 0;
    updateToggle();
    schedule();
  });
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
    velocityX = velocityY = 0;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const scale = 5.4 / canvas.getBoundingClientRect().width;
    const dx = (event.clientX - pointer.x) * scale, dy = (event.clientY - pointer.y) * scale;
    const dt = Math.max(.008, (event.timeStamp - pointer.time) / 1000);
    yaw += dx;
    pitch = Math.max(-1.2, Math.min(1.2, pitch + dy));
    velocityX = playing && !reduced.matches ? Math.max(-2, Math.min(2, dx / dt)) : 0;
    velocityY = playing && !reduced.matches ? Math.max(-2, Math.min(2, dy / dt)) : 0;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
    schedule();
  });
  function endDrag(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = null;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    schedule();
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    playing = false;
    velocityX = velocityY = 0;
    if (event.key === 'ArrowLeft') yaw -= .16;
    if (event.key === 'ArrowRight') yaw += .16;
    if (event.key === 'ArrowUp') pitch -= .16;
    if (event.key === 'ArrowDown') pitch += .16;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
    updateToggle();
    schedule();
  });
  reduced.addEventListener('change', () => {
    playing = !reduced.matches;
    velocityX = velocityY = 0;
    updateToggle();
    schedule();
  });
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    previousTime = 0;
    if (visible) schedule();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => { previousTime = 0; schedule(); });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lost = true;
    pointer = null;
    figure.classList.remove('has-3d');
    canvas.classList.remove('is-dragging');
    canvas.setAttribute('aria-hidden', 'true');
    figure.querySelector('.skills-sphere').removeAttribute('aria-hidden');
    toggle.hidden = true;
    help.textContent = '三维显示恢复中';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    help.textContent = '拖动旋转 · 方向键也可控制';
    initialize();
  });
  document.fonts.ready.then(initialize).catch(error => {
    console.error('Skill sphere:', error);
    help.textContent = '当前浏览器暂不支持三维显示';
  });
})();
