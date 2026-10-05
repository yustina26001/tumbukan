// Matikan p5 friendly errors untuk performa optimal
p5.disableFriendlyErrors = true;

// Variabel Utama Simulasi
let ball1, ball2;
let isRunning = true;
let simTime = 0;
let timeScale = 1.0;
let eCoeff = 1.0;
let particles = [];

// Elemen Antarmuka (p5.DOM)
let sliderM1, sliderV1, sliderM2, sliderV2, sliderE;
let btnPlay, btnReset, btnE1, btnE05, btnE0, btnTransfer;
let infoDiv;

// Skala Simulasi: 1 Meter = 60 Piksel
const METER_PX = 60;

class Ball2D {
  constructor(m, v, colorRGB, label, isLeft) {
    this.m = m;
    this.v = v;
    this.vInitial = v;
    this.colorRGB = colorRGB;
    this.label = label;
    this.isLeft = isLeft;
    this.updateRadius();
    this.resetPosition();
  }

  updateRadius() {
    // Radius proporsional terhadap akar pangkat 3 massa
    this.rPx = (0.22 + 0.12 * Math.cbrt(this.m)) * METER_PX;
  }

  resetPosition() {
    this.v = this.vInitial;
    this.y = height / 2 - 10;
    if (this.isLeft) {
      this.x = width * 0.25;
    } else {
      this.x = width * 0.75;
    }
  }

  update(dt) {
    // x = x0 + v * dt
    this.x += (this.v * METER_PX) * dt;
  }

  draw() {
    push();
    
    // Lingkaran Benda
    stroke(255);
    strokeWeight(2);
    fill(this.colorRGB[0], this.colorRGB[1], this.colorRGB[2]);
    ellipse(this.x, this.y, this.rPx * 2, this.rPx * 2);

    // Label Teks Benda
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textFont('sans-serif');
    textSize(12);
    textStyle(BOLD);
    text(this.label, this.x, this.y - 5);
    textSize(10);
    textStyle(NORMAL);
    text(this.m.toFixed(1) + " kg", this.x, this.y + 10);

    pop();

    // Gambar Panah Vektor Kecepatan
    this.drawVelocityVector();
  }

  drawVelocityVector() {
    if (Math.abs(this.v) < 0.05) return;

    push();
    let arrowLen = this.v * 18;
    let startX = this.x;
    let startY = this.y - this.rPx - 15;
    let endX = startX + arrowLen;

    stroke(245, 158, 11); // Warna Amber
    strokeWeight(2.5);
    line(startX, startY, endX, startY);

    // Kepala Panah
    let dir = Math.sign(this.v);
    fill(245, 158, 11);
    noStroke();
    triangle(
      endX, startY,
      endX - dir * 6, startY - 4,
      endX - dir * 6, startY + 4
    );

    // Teks Nilai Kecepatan
    textAlign(CENTER);
    textSize(11);
    textStyle(BOLD);
    fill(245, 158, 11);
    let vText = (this.v > 0 ? "+" : "") + this.v.toFixed(2) + " m/s";
    text(vText, startX + arrowLen / 2, startY - 8);

    pop();
  }

  getEk() {
    return 0.5 * this.m * this.v * this.v;
  }

  getP() {
    return this.m * this.v;
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-4, 4);
    this.vy = random(-4, 4);
    this.life = 255;
    this.colorRGB = random() > 0.5 ? [56, 189, 248] : [236, 72, 153];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 12;
  }

  draw() {
    if (this.life <= 0) return;
    push();
    noStroke();
    fill(this.colorRGB[0], this.colorRGB[1], this.colorRGB[2], this.life);
    ellipse(this.x, this.y, 6, 6);
    pop();
  }
}

function setup() {
  let cnv = createCanvas(750, 280);
  cnv.parent(createDiv().id('canvas-holder'));

  // Inisialisasi Objek Benda
  ball1 = new Ball2D(2.0, 4.0, [6, 182, 212], 'm1', true);
  ball2 = new Ball2D(1.0, -3.0, [236, 72, 153], 'm2', false);

  // Buat Antarmuka Kontrol DOM
  createControlsGUI();
  
  // Sinkronkan data awal
  recalculatePhysics();
}

function draw() {
  background(11, 15, 25); // Slate Dark

  // Gambar Skala Meter (Penggaris) & Lantai
  drawMeterGrid();

  let dt = (1 / 60) * timeScale;

  if (isRunning) {
    simTime += dt;

    // Update Posisi Fisika
    ball1.update(dt);
    ball2.update(dt);

    // Pantulan Dinding Arena
    handleWallCollision(ball1);
    handleWallCollision(ball2);

    // Deteksi & Penyelesaian Tumbukan Antar Benda
    checkBallCollision();

    // Update Partikel Efek
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
  }

  // Render Partikel
  for (let p of particles) {
    p.draw();
  }

  // Render Bola
  ball1.draw();
  ball2.draw();

  // Update Tampilan Informasi Pembuktian Rumus
  updateTelemetryUI();
}

function drawMeterGrid() {
  let floorY = height / 2 + 40;
  
  // Garis Lantai
  stroke(51, 65, 85);
  strokeWeight(2);
  line(20, floorY, width - 20, floorY);

  // Garis Strip Penggaris
  stroke(30, 41, 59);
  strokeWeight(1);
  fill(100, 116, 139);
  textAlign(CENTER);
  textSize(9);

  let meter = 0;
  for (let x = 30; x < width - 20; x += METER_PX) {
    line(x, floorY, x, floorY + 6);
    noStroke();
    text(meter + "m", x, floorY + 18);
    stroke(30, 41, 59);
    meter++;
  }
}

function checkBallCollision() {
  let distVal = Math.abs(ball2.x - ball1.x);
  let minDist = ball1.rPx + ball2.rPx;

  if (distVal <= minDist) {
    let relVel = ball1.v - ball2.v;
    if (relVel > 0) {
      // Proses Tumbukan
      resolveCollision();

      // Ledakan Partikel Visual
      let impactX = (ball1.x + ball2.x) / 2;
      let impactY = ball1.y;
      for (let i = 0; i < 15; i++) {
        particles.push(new Particle(impactX, impactY));
      }
    }
  }
}

function resolveCollision() {
  let m1 = ball1.m;
  let m2 = ball2.m;
  let v1 = ball1.v;
  let v2 = ball2.v;

  // Rumus Utama Fisika Tumbukan 1D dengan Restitusi (e)
  let v1_prime = ((m1 - eCoeff * m2) * v1 + m2 * (1 + eCoeff) * v2) / (m1 + m2);
  let v2_prime = (m1 * (1 + eCoeff) * v1 + (m2 - eCoeff * m1) * v2) / (m1 + m2);

  ball1.v = v1_prime;
  ball2.v = v2_prime;

  // Koreksi Overlap
  let overlap = (ball1.rPx + ball2.rPx) - Math.abs(ball2.x - ball1.x);
  if (overlap > 0) {
    ball1.x -= overlap / 2;
    ball2.x += overlap / 2;
  }
}

function handleWallCollision(b) {
  if (b.x - b.rPx < 20) {
    b.x = 20 + b.rPx;
    b.v = -b.v * eCoeff;
  } else if (b.x + b.rPx > width - 20) {
    b.x = width - 20 - b.rPx;
    b.v = -b.v * eCoeff;
  }
}

function createControlsGUI() {
  let container = createDiv();
  container.style('font-family', 'Inter, system-ui, sans-serif');
  container.style('color', '#e2e8f0');
  container.style('max-width', '750px');
  container.style('margin-top', '12px');

  // Tombol Presets SMA
  let presetDiv = createDiv('<b>📌 PRESET MATERI FISIKA SMA:</b> ');
  presetDiv.style('margin-bottom', '10px');
  presetDiv.style('font-size', '12px');

  btnE1 = createButton('1. Lenting Sempurna (e=1.0)').parent(presetDiv);
  btnE1.mousePressed(() => applyPreset(1.0, 2.0, 4.0, 1.0, -3.0));

  btnE05 = createButton('2. Lenting Sebagian (e=0.5)').parent(presetDiv);
  btnE05.mousePressed(() => applyPreset(0.5, 2.0, 4.0, 1.0, -3.0));

  btnE0 = createButton('3. Tidak Lenting (e=0.0)').parent(presetDiv);
  btnE0.mousePressed(() => applyPreset(0.0, 3.0, 5.0, 2.0, -2.0));

  btnTransfer = createButton('4. Transfer Momentum').parent(presetDiv);
  btnTransfer.mousePressed(() => applyPreset(1.0, 2.0, 5.0, 2.0, 0.0));

  // Tombol Transport (Play/Pause/Reset)
  let transportDiv = createDiv();
  transportDiv.style('margin-bottom', '12px');
  btnPlay = createButton('Pause').parent(transportDiv);
  btnPlay.mousePressed(togglePlay);
  btnReset = createButton('Reset Posisi').parent(transportDiv);
  btnReset.mousePressed(resetSimulation);

  // Grid Controls Sliders
  let grid = createDiv();
  grid.style('display', 'grid');
  grid.style('grid-template-columns', '1fr 1fr');
  grid.style('gap', '10px');
  grid.style('background', '#0f172a');
  grid.style('padding', '12px');
  grid.style('border-radius', '8px');
  grid.style('border', '1px solid #1e293b');

  // Slider Restitusi
  let eBox = createDiv('<b>Koefisien Restitusi (e): </b>').parent(grid);
  eBox.style('grid-column', 'span 2');
  sliderE = createSlider(0, 1, 1.0, 0.05).parent(eBox);

  // Kolom Benda 1
  let col1 = createDiv('<b style="color:#38bdf8">Benda 1 (Cyan)</b><br/>').parent(grid);
  col1.child(createSpan('Massa m1 (kg): '));
  sliderM1 = createSlider(0.5, 10, 2.0, 0.5);
  col1.child(sliderM1);
  col1.child(createDiv('Kecepatan v1 (m/s):'));
  sliderV1 = createSlider(-10, 10, 4.0, 0.5);
  col1.child(sliderV1);

  // Kolom Benda 2
  let col2 = createDiv('<b style="color:#ec4899">Benda 2 (Pink)</b><br/>').parent(grid);
  col2.child(createSpan('Massa m2 (kg): '));
  sliderM2 = createSlider(0.5, 10, 1.0, 0.5);
  col2.child(sliderM2);
  col2.child(createDiv('Kecepatan v2 (m/s):'));
  sliderV2 = createSlider(-10, 10, -3.0, 0.5);
  col2.child(sliderV2);

  // Panel Telemetri Rumus
  infoDiv = createDiv();
  infoDiv.style('margin-top', '12px');
  infoDiv.style('background', '#1e293b');
  infoDiv.style('padding', '12px');
  infoDiv.style('border-radius', '8px');
  infoDiv.style('font-family', 'monospace');
  infoDiv.style('font-size', '12px');

  // Event Listeners Sliders
  let sliders = [sliderM1, sliderV1, sliderM2, sliderV2, sliderE];
  for (let s of sliders) {
    s.input(recalculatePhysics);
  }
}

function updateTelemetryUI() {
  if (!infoDiv) return;

  let m1 = ball1.m, m2 = ball2.m;
  let v1 = ball1.vInitial, v2 = ball2.vInitial;

  // Kecepatan Akhir Teoretis
  let v1_prime = ((m1 - eCoeff * m2) * v1 + m2 * (1 + eCoeff) * v2) / (m1 + m2);
  let v2_prime = (m1 * (1 + eCoeff) * v1 + (m2 - eCoeff * m1) * v2) / (m1 + m2);

  let p_before = m1 * v1 + m2 * v2;
  let p_after = m1 * v1_prime + m2 * v2_prime;

  let ek_before = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  let ek_after = 0.5 * m1 * v1_prime * v1_prime + 0.5 * m2 * v2_prime * v2_prime;
  let ek_loss = Math.max(0, ek_before - ek_after);

  infoDiv.html(`
    <b style="color:#f59e0b">📐 PEMBUKTIAN RUMUS FISIKA TUMBUKAN:</b><br/>
    • Restitusi (e) = <b>${eCoeff.toFixed(2)}</b><br/>
    <hr style="border-color:#334155; margin:6px 0;"/>
    <b>1. Hukum Kekekalan Momentum:</b><br/>
    &nbsp;&nbsp;P_awal  = (${m1.toFixed(1)})(${v1 >= 0 ? '+' : ''}${v1.toFixed(1)}) + (${m2.toFixed(1)})(${v2 >= 0 ? '+' : ''}${v2.toFixed(1)}) = <b>${p_before.toFixed(2)} kg·m/s</b><br/>
    &nbsp;&nbsp;P_akhir = (${m1.toFixed(1)})(${v1_prime >= 0 ? '+' : ''}${v1_prime.toFixed(2)}) + (${m2.toFixed(1)})(${v2_prime >= 0 ? '+' : ''}${v2_prime.toFixed(2)}) = <b>${p_after.toFixed(2)} kg·m/s</b> <span style="color:#34d399">(KEKAL)</span><br/>
    <hr style="border-color:#334155; margin:6px 0;"/>
    <b>2. Kecepatan Akhir Hasil Tumbukan:</b><br/>
    &nbsp;&nbsp;v1' (Benda 1) = <b style="color:#38bdf8">${v1_prime >= 0 ? '+' : ''}${v1_prime.toFixed(2)} m/s</b><br/>
    &nbsp;&nbsp;v2' (Benda 2) = <b style="color:#ec4899">${v2_prime >= 0 ? '+' : ''}${v2_prime.toFixed(2)} m/s</b><br/>
    <hr style="border-color:#334155; margin:6px 0;"/>
    <b>3. Energi Kinetik (Ek):</b><br/>
    &nbsp;&nbsp;Ek_awal = ${ek_before.toFixed(2)} J | Ek_akhir = ${ek_after.toFixed(2)} J<br/>
    &nbsp;&nbsp;Energi Hilang (Deformasi) = <span style="color:${ek_loss > 0.05 ? '#f43f5e' : '#34d399'}">${ek_loss.toFixed(2)} Joule</span>
  `);
}

function recalculatePhysics() {
  eCoeff = sliderE ? sliderE.value() : 1.0;
  let m1 = sliderM1 ? sliderM1.value() : 2.0;
  let v1 = sliderV1 ? sliderV1.value() : 4.0;
  let m2 = sliderM2 ? sliderM2.value() : 1.0;
  let v2 = sliderV2 ? sliderV2.value() : -3.0;

  ball1.m = m1;
  ball1.vInitial = v1;
  ball1.updateRadius();

  ball2.m = m2;
  ball2.vInitial = v2;
  ball2.updateRadius();

  resetSimulation();
}

function applyPreset(e, m1, v1, m2, v2) {
  if (sliderE) sliderE.value(e);
  if (sliderM1) sliderM1.value(m1);
  if (sliderV1) sliderV1.value(v1);
  if (sliderM2) sliderM2.value(m2);
  if (sliderV2) sliderV2.value(v2);

  recalculatePhysics();
}

function resetSimulation() {
  simTime = 0;
  ball1.resetPosition();
  ball2.resetPosition();
}

function togglePlay() {
  isRunning = !isRunning;
  if (btnPlay) btnPlay.html(isRunning ? "Pause" : "Play");
}
