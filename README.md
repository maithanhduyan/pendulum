# Pendulum
[![Documentation Status](https://github.com/maithanhduyan/pendulum/actions/workflows/mdbook.yml/badge.svg)](https://github.com/maithanhduyan/pendulum/actions)
# Simple pendulum

```javascript

// Lấy đối tượng canvas và context 2D
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// --- Các tham số vật lý (đơn vị SI) ---
const g = 9.81;          // Gia tốc trọng lực (m/s²)
const L = 0.5;           // Chiều dài thanh cứng (m)
let A = 0.3;             // Biên độ dao động ngang của điểm treo (m)
let f = 0.8;             // Tần số dao động của điểm treo (Hz)
let omega = 2 * Math.PI * f; // Tần số góc của điểm treo (rad/s)
const mass = 2;          // Khối lượng quả lắc (kg)
const damping = 0.5;     // Hệ số ma sát không khí (s⁻¹)

// --- Thông số hiển thị ---
const scale = 300;       // Tỉ lệ chuyển đổi từ mét sang pixel (1 m = 300 pixel)
const pivotY = 180;      // Vị trí theo trục y của điểm treo (pixel)
const centerX = canvas.width / 2; // Vị trí theo trục x của điểm treo khi không dao động

// --- Biến trạng thái của con lắc ---
let theta = 0;           // Góc lệch ban đầu (rad)
let thetaDot = 0;        // Vận tốc góc ban đầu (rad/s)

// --- Biến thời gian ---
let lastTime = null;     // Thời điểm frame trước (ms)

// --- Hàm cập nhật trạng thái của con lắc ---
// dt: bước thời gian (s), t: thời gian hiện tại (s)
function update(dt, t) {
  // Tính gia tốc của điểm treo (pivot) theo phương ngang:
  // x_p(t) = centerX + A*cos(omega*t) (đơn vị m)
  // => gia tốc: x_p''(t) = -A*omega²*cos(omega*t)
  const pivotAcc = -A * Math.pow(omega, 2) * Math.cos(omega * t);

  // Phương trình chuyển động của con lắc:
  // theta'' = - (g/L)*sin(theta) + (A*omega²*cos(omega*t)/L)*cos(theta) - damping*thetaDot
  const thetaDoubleDot = - (g / L) * Math.sin(theta)
    + (A * Math.pow(omega, 2) * Math.cos(omega * t) / L) * Math.cos(theta)
    - damping * thetaDot;

  // Cập nhật theo phương pháp Euler
  thetaDot += thetaDoubleDot * dt;
  theta += thetaDot * dt;
}

// --- Hàm vẽ con lắc ---
function draw(t) {
  // Xóa canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Tính vị trí của điểm treo (pivot):
  // x_p(t) = centerX + A*cos(omega*t) (đổi từ m sang pixel)
  const pivotX = centerX + A * Math.cos(omega * t) * scale;

  // Tọa độ quả lắc (bob):
  // x = pivotX + L*sin(theta)*scale
  // y = pivotY + L*cos(theta)*scale
  const bobX = pivotX + L * Math.sin(theta) * scale;
  const bobY = pivotY + L * Math.cos(theta) * scale;

  // Vẽ thanh cứng nối giữa điểm treo và quả lắc
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#333";
  ctx.stroke();

  // Vẽ quả lắc (với bán kính 12 pixel)
  ctx.beginPath();
  ctx.arc(bobX, bobY, 12, 0, 2 * Math.PI);
  ctx.fillStyle = "#e74c3c";
  ctx.fill();
  ctx.stroke();

  // Vẽ điểm treo (với bán kính 6 pixel)
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 6, 0, 2 * Math.PI);
  ctx.fillStyle = "#2ecc71";
  ctx.fill();
  ctx.stroke();
}

// --- Hàm animation ---
function animate(timestamp) {
  if (!lastTime) lastTime = timestamp;
  // Tính bước thời gian dt (đổi từ ms sang s)
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Cập nhật trạng thái con lắc với thời gian hiện tại (t tính bằng giây)
  update(dt, timestamp / 1000);

  // Vẽ con lắc tại thời điểm hiện tại
  draw(timestamp / 1000);

  // Hiển thị góc lệch (đổi từ radian sang độ)
  const angleInDegrees = theta * (180 / Math.PI);
  document.getElementById('angleDisplay').textContent = angleInDegrees.toFixed(2);

  // Tính và hiển thị vị trí điểm treo lệch so với vị trí ban đầu (đơn vị: mét)
  // Vị trí ban đầu của điểm treo theo trục x là centerX, nên độ lệch theo hệ quy chiếu mét là:
  // deltaX = A*cos(omega*t)
  const pivotOffset = A * Math.cos(omega * (timestamp / 1000));
  document.getElementById('pivotDisplay').textContent = pivotOffset.toFixed(2);

  // Tính tốc độ quay của quả lắc quanh điểm treo (đơn vị: RPM)
  // thetaDot tính bằng rad/s, nên RPM = thetaDot * (60 / (2*Math.PI))
  const rpm = thetaDot * (60 / (2 * Math.PI));
  document.getElementById('rpmDisplay').textContent = rpm.toFixed(2);

  // Yêu cầu frame kế tiếp
  requestAnimationFrame(animate);
}

// --- Thiết lập các bộ điều khiển ---
const amplitudeControl = document.getElementById('amplitude');
const frequencyControl = document.getElementById('frequency');
const amplitudeValueSpan = document.getElementById('amplitudeValue');
const frequencyValueSpan = document.getElementById('frequencyValue');

// Lắng nghe sự thay đổi của biên độ
amplitudeControl.addEventListener('input', function () {
  A = parseFloat(this.value);
  amplitudeValueSpan.textContent = A.toFixed(2);
});

// Lắng nghe sự thay đổi của tần số và cập nhật omega
frequencyControl.addEventListener('input', function () {
  f = parseFloat(this.value);
  frequencyValueSpan.textContent = f.toFixed(2);
  omega = 2 * Math.PI * f;
});

// Bắt đầu animation
requestAnimationFrame(animate);

```

Đảm bảo mỗi game chỉ sử dụng duy nhất 1 canvas từ mảng screens

Genome phải được gán chính xác theo index giữa population và games

Hệ thống vật lý cần xử lý chính xác các đơn vị (radian vs độ)

Điểm số cần phản ánh chính xác hiệu suất cân bằng của con lắc

Sử dụng Web Worker để xử lý song song nếu số lượng game lớn