import { heroEffects } from '../../config/heroEffects'

/**
 * Raw WebGL Museum Lighting & Impasto Shader Renderer (No Libraries)
 *
 * Implements 6 independently switchable effects:
 * 1. SPOTLIGHT: Blinn-Phong, height & normal gradient from luminance, gold leaf specular boost, Lissajous idle drift.
 * 2. PARALLAX: UV offset up to 14px scaled by depth, baseline scale 1.05, 55 foreground gold specks at 2x parallax.
 * 3. DUST: Fine-pointer pigment trail (handled via overlay or canvas pass).
 * 4. LOUPE: 170px magnifying lens with brass ring & crosshairs.
 * 5. MOOD: Local hour colour temperature shift (<= 6% temp shift, <= 3% lum shift).
 * 6. TILT: Permission-less DeviceOrientation for Android / idle drift fallback.
 */

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  v_uv.y = 1.0 - v_uv.y; // Match texture image coordinate space
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER_SRC = `
precision highp float;

varying vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_pointer_offset;
uniform vec2 u_light_pos;
uniform float u_exposure;
uniform vec3 u_light_color;
uniform float u_time;

uniform float u_enable_spotlight;
uniform float u_enable_parallax;
uniform float u_enable_mood;

// Pseudo-random helper for foreground specks
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 base_uv = v_uv;

  // 1. BASELINE SCALE & PARALLAX
  vec2 uv = (base_uv - 0.5) / 1.05 + 0.5;

  if (u_enable_parallax > 0.5) {
    vec4 init_col = texture2D(u_texture, uv);
    float depth = dot(init_col.rgb, vec3(0.299, 0.587, 0.114));
    vec2 max_offset = 14.0 / u_resolution;
    vec2 uv_parallax = -u_pointer_offset * max_offset * depth;
    uv += uv_parallax;
  }

  vec4 albedo = texture2D(u_texture, uv);
  float lum = dot(albedo.rgb, vec3(0.299, 0.587, 0.114));

  vec3 final_color = albedo.rgb;

  // 2. SPOTLIGHT (Blinn-Phong + Normal Gradient from Height + Gold Flake Boost)
  if (u_enable_spotlight > 0.5) {
    vec2 duv = 2.5 / u_resolution;
    float hL = dot(texture2D(u_texture, uv - vec2(duv.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float hR = dot(texture2D(u_texture, uv + vec2(duv.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float hD = dot(texture2D(u_texture, uv - vec2(0.0, duv.y)).rgb, vec3(0.299, 0.587, 0.114));
    float hU = dot(texture2D(u_texture, uv + vec2(0.0, duv.y)).rgb, vec3(0.299, 0.587, 0.114));

    vec3 normal = normalize(vec3((hL - hR) * 3.5, (hD - hU) * 3.5, 1.0));

    // Aspect-ratio corrected light coordinates
    float aspect = u_resolution.x / u_resolution.y;
    vec2 delta = (u_light_pos - uv) * vec2(aspect, 1.0);
    float dist = length(delta);

    vec3 L = normalize(vec3(delta, 0.38));
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 H = normalize(L + V);

    // Quadratic falloff with smooth outer boundary
    float atten = 1.0 / (1.0 + 2.2 * dist * dist);
    float spot = smoothstep(1.15, 0.0, dist) * atten;

    float NdotL = max(0.0, dot(normal, L));
    float NdotH = max(0.0, dot(normal, H));
    float spec = pow(NdotH, 22.0);

    // Selective 24k Gold Leaf Glint Boost (bright warm pixels)
    float warmth = max(0.0, albedo.r - albedo.b);
    float gold_flake = smoothstep(0.35, 0.8, albedo.r) * smoothstep(0.08, 0.32, warmth);

    // Champagne tinted specular
    vec3 champagne = vec3(0.894, 0.769, 0.561);
    vec3 spec_color = champagne * (1.0 + gold_flake * 3.2);

    vec3 light_col = (u_enable_mood > 0.5) ? u_light_color : vec3(1.0, 0.98, 0.94);

    vec3 ambient = albedo.rgb * 0.42;
    vec3 diffuse = albedo.rgb * light_col * NdotL * spot * 1.35;
    vec3 specular = spec_color * spec * spot * (0.35 + gold_flake * 2.2);

    final_color = ambient + diffuse + specular;
  }

  // 3. FOREGROUND GOLD SPECKS (Drifting slowly, moving at 2x parallax)
  if (u_enable_parallax > 0.5) {
    vec2 speck_offset = -u_pointer_offset * (28.0 / u_resolution);
    vec2 speck_uv = base_uv + speck_offset;

    // Grid of 55 tiny potential specks
    vec2 grid_uv = speck_uv * vec2(28.0, 18.0);
    vec2 cell = floor(grid_uv);
    vec2 cell_fract = fract(grid_uv);

    float rnd = hash(cell);
    if (rnd > 0.88) { // ~50 to 60 specks active
      float speed = 0.2 + rnd * 0.3;
      vec2 pos = vec2(
        0.5 + 0.35 * sin(u_time * speed + rnd * 6.28),
        0.5 + 0.35 * cos(u_time * speed * 0.8 + rnd * 6.28)
      );
      float d = length(cell_fract - pos);
      float speck_radius = 0.06;
      if (d < speck_radius) {
        float glow = (1.0 - d / speck_radius);
        float shimmer = 0.7 + 0.3 * sin(u_time * 2.5 + rnd * 6.28);
        vec3 speck_color = vec3(0.92, 0.80, 0.55) * glow * shimmer;
        final_color += speck_color * 0.65;
      }
    }
  }

  // 4. EXPOSURE / INTRO SWEEP
  final_color *= u_exposure;

  gl_FragColor = vec4(final_color, 1.0);
}
`

export class WebGLHeroRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.options = options
    this.gl = null
    this.program = null
    this.texture = null
    this.textureLoaded = false

    // Frame metrics for auto-degrade guard
    this.frameTimes = []
    this.lastFrameTime = performance.now()
    this.degradeTimer = 0
    this.degradeStage = 0 // 0: dust, 1: loupe, 2: parallax, 3: mood, 4: tilt

    // Dynamic active flags copy (starts with heroEffects defaults)
    this.activeEffects = { ...heroEffects }

    // DPR Cap: 1.5 on desktop, 1.0 on phones
    this.isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent))
    this.dpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.0 : 1.5)

    // Motion & Orientation states
    this.time = 0
    this.exposure = 0.35
    this.targetExposure = 1.0

    // Light position & smoothed inertia
    this.pointerX = 0.58
    this.pointerY = 0.44
    this.lightX = 0.58
    this.lightY = 0.44
    this.targetLightX = 0.58
    this.targetLightY = 0.44

    // Parallax offset
    this.parallaxX = 0
    this.parallaxY = 0
    this.targetParallaxX = 0
    this.targetParallaxY = 0

    // Idle timer
    this.lastPointerTime = performance.now()
    this.isTouch = false

    // Mood (Local hour calculation)
    this.moodColor = this.calculateMoodColor()

    // Uniform locations
    this.uniforms = {}

    this.initWebGL()
    this.loadTexture()
  }

  calculateMoodColor() {
    const hour = new Date().getHours()
    const isDaytime = hour >= 7 && hour < 17
    // Narrow shift: <= 6% color temp shift, average luminance change <= 3%
    if (isDaytime) {
      return [0.98, 0.995, 1.025] // Slightly cooler daylight
    } else {
      return [1.025, 0.99, 0.97] // Slightly warmer evening / night
    }
  }

  initWebGL() {
    try {
      this.gl = this.canvas.getContext('webgl', {
        alpha: false,
        depth: false,
        stencil: false,
        antialias: false,
        powerPreference: 'high-performance',
      })
    } catch {
      this.gl = null
    }

    if (!this.gl) return

    const gl = this.gl

    // Compile Shaders
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, VERTEX_SHADER_SRC)
    gl.compileShader(vs)

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, FRAGMENT_SHADER_SRC)
    gl.compileShader(fs)

    this.program = gl.createProgram()
    gl.attachShader(this.program, vs)
    gl.attachShader(this.program, fs)
    gl.linkProgram(this.program)

    gl.useProgram(this.program)

    // Setup Fullscreen Quad
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    )

    const posAttr = gl.getAttribLocation(this.program, 'a_position')
    gl.enableVertexAttribArray(posAttr)
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0)

    // Lookup Uniforms
    const uNames = [
      'u_texture',
      'u_resolution',
      'u_pointer_offset',
      'u_light_pos',
      'u_exposure',
      'u_light_color',
      'u_time',
      'u_enable_spotlight',
      'u_enable_parallax',
      'u_enable_mood',
    ]
    uNames.forEach((name) => {
      this.uniforms[name] = gl.getUniformLocation(this.program, name)
    })
  }

  loadTexture() {
    if (!this.gl) return
    const gl = this.gl

    this.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.texture)

    // Temporary 1x1 dark fallback while image loads
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([21, 20, 16, 255])
    )

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      this.textureLoaded = true
    }
    img.src = '/hero-impasto.jpg'
  }

  resize(w, h) {
    if (!this.gl) return
    const pW = Math.round(w * this.dpr)
    const pH = Math.round(h * this.dpr)

    if (this.canvas.width !== pW || this.canvas.height !== pH) {
      this.canvas.width = pW
      this.canvas.height = pH
      this.gl.viewport(0, 0, pW, pH)
    }
  }

  setPointer(normX, normY) {
    this.lastPointerTime = performance.now()
    this.targetLightX = normX
    this.targetLightY = normY
    this.targetParallaxX = (normX - 0.5) * 2.0
    this.targetParallaxY = (normY - 0.5) * 2.0
  }

  setTouch() {
    this.isTouch = true
  }

  setTilt(tiltX, tiltY) {
    if (!this.activeEffects.tilt) return
    this.lastPointerTime = performance.now()
    this.targetLightX = 0.5 + tiltX * 0.35
    this.targetLightY = 0.45 + tiltY * 0.30
    this.targetParallaxX = tiltX * 1.5
    this.targetParallaxY = tiltY * 1.5
  }

  /**
   * Auto-degrade monitor: measures rolling 2s avg frame time.
   * If > 22ms, disables effects one by one: dust -> loupe -> parallax -> mood -> tilt.
   */
  checkAutoDegrade(dtMs) {
    this.frameTimes.push(dtMs)
    this.degradeTimer += dtMs

    if (this.degradeTimer >= 2000) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      this.frameTimes = []
      this.degradeTimer = 0

      if (avg > 22) {
        if (this.degradeStage === 0 && this.activeEffects.dust) {
          this.activeEffects.dust = false
          this.degradeStage++
        } else if (this.degradeStage === 1 && this.activeEffects.loupe) {
          this.activeEffects.loupe = false
          this.degradeStage++
        } else if (this.degradeStage === 2 && this.activeEffects.parallax) {
          this.activeEffects.parallax = false
          this.degradeStage++
        } else if (this.degradeStage === 3 && this.activeEffects.mood) {
          this.activeEffects.mood = false
          this.degradeStage++
        } else if (this.degradeStage === 4 && this.activeEffects.tilt) {
          this.activeEffects.tilt = false
          this.degradeStage++
        }
      }
    }
  }

  render(dt = 0.016) {
    if (!this.gl || !this.program) return

    const now = performance.now()
    const dtMs = now - this.lastFrameTime
    this.lastFrameTime = now
    this.checkAutoDegrade(dtMs)

    this.time += dt

    // 1. Exposure ramp (0.35 -> 1.0 over ~2.0s)
    if (this.exposure < this.targetExposure) {
      this.exposure = Math.min(this.targetExposure, this.exposure + dt * 0.35)
    }

    // 2. Idle drift: Lissajous curve (~14s cycle) after 2s without pointer or always on touch
    const idleTime = now - this.lastPointerTime
    if (this.isTouch || idleTime > 2000) {
      const lissX = 0.52 + 0.22 * Math.sin((this.time * 2.0 * Math.PI) / 14.0)
      const lissY = 0.44 + 0.16 * Math.sin((this.time * 4.0 * Math.PI) / 14.0 + Math.PI * 0.5)
      this.targetLightX = lissX
      this.targetLightY = lissY
      this.targetParallaxX = (lissX - 0.5) * 1.4
      this.targetParallaxY = (lissY - 0.45) * 1.4
    }

    // 3. Eased inertia for light and parallax
    const easeLight = Math.min(1.0, dt * 4.5)
    this.lightX += (this.targetLightX - this.lightX) * easeLight
    this.lightY += (this.targetLightY - this.lightY) * easeLight

    const easeParallax = Math.min(1.0, dt * 3.5)
    this.parallaxX += (this.targetParallaxX - this.parallaxX) * easeParallax
    this.parallaxY += (this.targetParallaxY - this.parallaxY) * easeParallax

    const gl = this.gl
    gl.useProgram(this.program)

    // Set Uniforms
    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height)
    gl.uniform2f(this.uniforms.u_pointer_offset, this.parallaxX, this.parallaxY)
    gl.uniform2f(this.uniforms.u_light_pos, this.lightX, this.lightY)
    gl.uniform1f(this.uniforms.u_exposure, this.exposure)
    gl.uniform3f(
      this.uniforms.u_light_color,
      this.moodColor[0],
      this.moodColor[1],
      this.moodColor[2]
    )
    gl.uniform1f(this.uniforms.u_time, this.time)

    // Effect Flags
    gl.uniform1f(this.uniforms.u_enable_spotlight, this.activeEffects.spotlight ? 1.0 : 0.0)
    gl.uniform1f(this.uniforms.u_enable_parallax, this.activeEffects.parallax ? 1.0 : 0.0)
    gl.uniform1f(this.uniforms.u_enable_mood, this.activeEffects.mood ? 1.0 : 0.0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.uniform1i(this.uniforms.u_texture, 0)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  destroy() {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program)
    }
  }
}
