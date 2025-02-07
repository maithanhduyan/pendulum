# Cấu trúc Dự án như sau:

```
├── LICENSE
├── favicon.ico
├── index.html
└── src
    ├── constants.js
    ├── game.js
    ├── main.js
    ├── pendulum.js
    ├── runner.js
    └── style.css
```

# Danh sách Các Tệp Dự án:

## ../index.html

```
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="src/style.css">
</head>

<body>
    <div id="games_container"></div>

  <script src="lib/neataptic.min.js"></script>
  <script src="src/constants.js"></script>
  <script src="src/pendulum.js"></script>
  <script src="src/game.js"></script>
  <script src="src/runner.js"></script>
  <script src="src/main.js"></script>
</body>

</html>
```

 ## ../src\constants.js

```
/**
 * Các thông số cài đặt cho game
 */

/**
 * Số lượng game
 * Là số lượng mỗi thế hệ tạo ra 50 game để đào tạo
 **/
const GAMES = 50

/**
 * Gia tốc trọng lực (m/s²)
 */
const GRAVITY = 9.81

/**
 * Hệ số ma sát không khí (s⁻¹)
 */
const DAMPING = 0.5;

/**
 * Tần số tối đa (Hz)
 */
const MAX_FREQUENCY = 12.5 

/**
 * Biên độ dao động (mét).
 * Amplitude of oscillation
 */
const MAX_AMPLITUDE = 0.5 
```

 ## ../src\game.js

```
/**
 * Trò chơi theo dõi hoạt động của con lắc.
 * Hiển thị thông số của con lắc
 */

class Game {

    constructor({ screen, score, onGameOver, brain }) {

        this.canvas = document.getElementById(screen.id);
        this.ctx = this.canvas.getContext('2d');
        this.pendulum = new Pendulum({ canvas: this.canvas, ctx: this.ctx, score: 0 })
        this.status = 'IDLE'
        this.onGameOver = onGameOver
        this.score = score
        this.centerScreen = { X: this.canvas.width / 2 - 150, Y: this.canvas.height / 2 }

        // Khởi tạo thời gian frame trước (đơn vị ms)
        this.lastTime = null;

        /**
         * Bộ gene
         */
        this.brain = brain;

        this.lastRevolution = 0;
    }

    /**
     * Cập nhật trạng thái game
     * @param {number} deltaTime - Thời gian trôi qua từ frame trước (giây)
     * Status: IDLE, RUNNING, GAME_OVER
     */
    updateGameStatus(deltaTime) {
        this.pendulum.update(deltaTime)

        // RPM
        const rpmDisplay = Math.round(Math.abs(this.pendulum.thetaDot) / (2 * Math.PI) * 60);

        // Thu thập dữ liệu đầu vào
        const inputs = [
            this.pendulum.theta, //
            this.pendulum.thetaDot,
            this.pendulum.A,
            this.pendulum.F,
            Math.cos(this.pendulum.omega * this.pendulum.time),
            Math.sin(this.pendulum.omega * this.pendulum.time)
        ];

        // Kích hoạt mạng neural
        const outputs = this.brain.activate(inputs);

        // Tính toán điều khiển
        const a = outputs[0] * MAX_AMPLITUDE // Biên độ từ 0 đến 2
        const freq = outputs[1] * MAX_FREQUENCY // Tần số từ 0.1 đến 5.1 Hz

        // Điều kiện game over. Ngăn ngừa A.I điều khiển sai để giảm thiểu thiệt hại.
        if (a < 0.01 || a > MAX_AMPLITUDE || this.score < -10 || freq > MAX_FREQUENCY || rpmDisplay == 0) {
            this.status = 'GAME_OVER';
        }

        // Điều khiển con lắc
        this.pendulum.control({
            A: a,      // Biên độ
            F: freq // Tần số
        });

        // Tính FPS từ deltaTime (nếu deltaTime != 0)
        const fps = Math.round(1 / deltaTime);


        // Hiển thị thông tin Score và FPS lên canvas
        this.ctx.font = "20px Arial";
        this.ctx.fillStyle = "#000";
        this.ctx.fillText(`Score: ${Math.floor(this.score)}`, 10, 30);
        this.ctx.fillText(`FPS: ${fps}`, 10, 60);
        this.ctx.fillText(`A: ${a}`, 10, 90);
        this.ctx.fillText(`Freq: ${freq}`, 10, 120);
        this.ctx.fillText(`RPM: ${rpmDisplay}`, 10, 150);


        // Hiển thị góc lệch (đổi từ radian sang độ)
        let angleInDegrees = Math.round(this.pendulum.theta * (180 / Math.PI));
        this.ctx.fillText(`Angle: ${Math.round(angleInDegrees / 360)} °`, 10, 180);

        // --- Ghi điểm theo quy tắc ---
        // Tính RPM mục tiêu
        const targetRPM = 700;
        // Tính điểm dựa trên khoảng cách đến RPM mục tiêu
        const rpmDifference = Math.abs(rpmDisplay - targetRPM);
        // Điểm tỷ lệ nghịch với khoảng cách (tối đa khi đạt mục tiêu)
        this.score += (1 - rpmDifference / targetRPM) * deltaTime;

        // --- Thưởng thêm nếu đạt hoặc vượt mục tiêu ---
        if (rpmDisplay == 100) {
            this.score += 10;
        }
        if (rpmDisplay == 200) {
            this.score += 10;
        }
        if (rpmDisplay == 300) {
            this.score += 10;
        }
        if (rpmDisplay == 400) {
            this.score += 10;
        }
        if (rpmDisplay == 500) {
            this.score += 10;
        }
        if (rpmDisplay == 600) {
            this.score += 10;
        }
        if (rpmDisplay >= targetRPM) {
            this.score += 10;
        }

        // --- Phạt nhẹ nếu RPM quá thấp ---
        // Số vòng/ phút không như kỳ vọng
        if (rpmDisplay < 400) {
            this.score -= deltaTime * 10;
        }

        // Biên độ cao quá không ổn định
        if (a > 0.4) {
            this.score -= deltaTime * 10;
        }

        // --- Kiểm tra điều kiện kết thúc game ---
        if (this.status == 'GAME_OVER') {
            this.ctx.font = "50px Arial";
            this.ctx.fillStyle = "#800";
            this.ctx.fillText(`GAME OVER`, this.centerScreen.X, this.centerScreen.Y);

            this.brain.score = this.score;
            if (this.onGameOver) {
                this.onGameOver();
            }
        }
    }

    /**
     * Bắt đầu game
     */
    start() {
        // Đổi trạng thái game sang RUNNING
        this.status = 'RUNNING';

        // Lưu lại thời điểm bắt đầu (ms)
        this.lastTime = performance.now();

        // Định nghĩa hàm loop chạy cho mỗi frame
        const gameLoop = (currentTime) => {
            // Nếu game không còn trạng thái RUNNING, thoát vòng lặp
            if (this.status !== 'RUNNING') return;

            // Tính toán delta time (s)
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;

            // Cập nhật trạng thái game
            this.updateGameStatus(deltaTime);

            // Yêu cầu vẽ lại frame tiếp theo
            requestAnimationFrame(gameLoop);
        };

        // Bắt đầu vòng lặp game
        requestAnimationFrame(gameLoop);
    }
}
```

 ## ../src\main.js

```
// Khởi tạo A.I
const Neat = neataptic.Neat
const Config = neataptic.Config
Config.warnings = false


// Chờ DOM được tải xong (nếu script không được đặt ở cuối body thì cần dùng DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {

  // Tạo một container để chứa các canvas
  const container = document.createElement('div');
  container.id = 'canvasContainer';

  // Áp dụng CSS cho container để hiển thị theo dạng lưới: 10 cột
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(10, auto)';
  container.style.gap = '2px'; // khoảng cách giữa các canvas (tuỳ chọn)

  /**
 * Tất cả màn hình Games
 */
  let screens = []

  /**
   * Lưu trữ điểm  số cao nhất
   */
  let highestScore = 0

  // Số hàng: 5, số cột: 10 (tổng cộng 50 canvas)
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 10; col++) {
      // Tạo một canvas mới
      const canvas = document.createElement('canvas');

      // Thiết lập kích thước cho canvas (có thể điều chỉnh theo nhu cầu)
      canvas.width = 500;  // ví dụ: 500 pixel
      canvas.height = 500; // ví dụ: 500 pixel
      canvas.id = `canvas_${row}_${col}`

      // Thêm một viền cho canvas để dễ quan sát
      canvas.style.border = '1px solid #000';

      // Thêm canvas vào container
      container.appendChild(canvas);

      // Thêm vào danh sách màn hình cần quản lý
      screens.push(canvas)

    }
  }

  // Thêm container vào body của trang web
  // document.body.appendChild(container);
  document.getElementById('games_container').appendChild(container)

  /**
   * Tạo neat
   */
  const neat = new Neat(6, 2, null, {
    popsize: GAMES, // Dân số
    elitism: 5, // Giới tinh hoa
    mutationRate: 0.8,      // Tăng tỷ lệ đột biến
    mutationAmount: 5       // Tăng cường độ đột biến
  })

  // Khởi tạo score cho genome
  neat.population.forEach(genome => genome.score = 0);

  /**
 * Tạo một luồng runner để chạy game
 */
  const runner = new Runner({
    neat,
    screens,
    games: GAMES,
    gamsize: GAMES,
    score: game => game.score, // mỗi game có thuộc tính điểm: score
    onEndGeneration: ({ generation, max, avg, min }) => {
      // Xử lý các công việc cần làm sau khi kết thúc thế hệ,
      // ví dụ: cập nhật UI, lưu trữ dữ liệu, thực hiện đột biến...
      // Sau đó bắt đầu thế hệ mới:
      if (max > highestScore) {
        highestScore = max
      }
      console.log(`Thế hệ ${generation} đã kết thúc.\n Điểm số cao nhất: ${highestScore}`);
      runner.startGeneration();
    }
  })

  /**
 * Khởi tạo một thế hệ đầu tiên 
 **/
  runner.startGeneration()
});
```

 ## ../src\pendulum.js

```
/**
 * Pendulum
 * Con lắc
 */

class Pendulum {
    constructor({ score, canvas, ctx }) {

        this.ctx = ctx

        this.canvas = canvas

        this.scoreModifiers = score

        // --- Thông số hiển thị ---
        this.centerX = canvas.width / 2; // Vị trí theo trục x của điểm treo khi không dao động
        this.scale = 200;       // Tỉ lệ chuyển đổi từ mét sang pixel (1 m = 200 pixel)
        this.pivotY = canvas.width / 2;      // Vị trí theo trục y của điểm treo (pixel)

        /**
         * Chiều dài thanh cứng (m)
         */
        this.length = 0.5

        /**
         * Thời gian tích lũy
         */
        this.time = 0;

        /**
         * Khối lượng quả lắc (Kg)
         */
        this.mass = 2

        /**
         * Biên độ dao động ngang của điểm treo (m)
         */
        this.A = 0

        /**
         * Tần số dao động của điểm treo (Hz)
         */
        this.F = 0

        /**
         * Tần số góc của điểm treo (rad/s)
         */
        this.omega = 2 * Math.PI * this.F;

        // --- Biến trạng thái của con lắc ---
        /**
         * Góc lệch ban đầu (rad)
         */
        this.theta = 0;

        /**
         * Vận tốc góc ban đầu (rad/s)
         */
        this.thetaDot = 0;

    }

    /**
     * Đặt lại thông số ban đầu cho con lắc
     */
    reset() {
        this.theta = 0;
        this.thetaDot = 0;
        this.time = 0;
        this.A = 0;
        this.F = 0;
        this.omega = 0;
    }

    draw(t) {

        // Xóa canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Tính vị trí của điểm treo (pivot):
        // x_p(t) = centerX + A*cos(omega*t) (đổi từ m sang pixel)
        const pivotX = this.centerX + this.A * Math.cos(this.omega * t) * this.scale;

        // Tọa độ quả lắc (bob):
        // x = pivotX + L*sin(theta)*scale
        // y = pivotY + L*cos(theta)*scale
        const bobX = pivotX + this.length * Math.sin(this.theta) * this.scale;
        const bobY = this.pivotY + this.length * Math.cos(this.theta) * this.scale;

        // Vẽ thanh cứng nối giữa điểm treo và quả lắc
        this.ctx.beginPath();
        this.ctx.moveTo(pivotX, this.pivotY);
        this.ctx.lineTo(bobX, bobY);
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = "#000";
        this.ctx.stroke();

        // Vẽ quả lắc (với bán kính 12 pixel)
        this.ctx.beginPath();
        this.ctx.arc(bobX, bobY, 12, 0, 2 * Math.PI);
        this.ctx.fillStyle = "#e74c3c";
        this.ctx.fill();
        this.ctx.stroke();

        // Vẽ điểm treo (với bán kính 6 pixel)
        this.ctx.beginPath();
        this.ctx.arc(pivotX, this.pivotY, 6, 0, 2 * Math.PI);
        this.ctx.fillStyle = "#2ecc71";
        this.ctx.fill();
        this.ctx.stroke();
    }

    /**
     * Cập nhật vật lý
     */
    update(deltaTime) {
        this.time += deltaTime; // Cập nhật thời gian

        // Tính toán vật lý
        const thetaDotDot = (-GRAVITY * Math.sin(this.theta) / this.length)
            + (this.A * this.omega ** 2 * Math.cos(this.omega * this.time) * Math.cos(this.theta) / this.length)
            - DAMPING * this.thetaDot;
        this.thetaDot += thetaDotDot * deltaTime;
        this.theta += this.thetaDot * deltaTime;

        this.draw(this.time); // Truyền thời gian chính xác

    }

    /**
     * Điều khiển con lắc qua lại theo phương ngang
     * Theo tần số và biên độ
     * Nhận lệnh từ A.I
     */
    control({ A, F }) {
        // Điều khiển 
        this.A = A
        this.F = F
        this.omega = 2 * Math.PI * this.F;
    }

}
```

 ## ../src\runner.js

```
class Runner {
    constructor({ neat, screens, games, score, onEndGeneration }) {

        this.neat = neat

        /**
         * Danh sách màn hình canvas
         */
        this.screens = screens

        /**
         * Danh sách các game
         */
        this.games = []

        this.gameCount = games;  // Số lượng game cần chạy

        /**
         * Số lượng game đã hoàn thành
         */
        this.gamesFinished = 0

        /**
         * Kết thúc thế hệ games
         */
        this.onEndGeneration = onEndGeneration

        // --- Khởi tạo tất cả các game ---
        for (let i = 0; i < this.gameCount; i++) {
            const genome = neat.population[i];
            // Đặt game vào danh sách quản lý
            this.games.push(
                // Tạo game mới
                new Game(
                    {
                        screen: this.screens[i],
                        score: 0,
                        genome: genome,
                        onGameOver: () => this.endGeneration()
                    })
            )
        }

    }

    /**
     * Bắt đầu tất cả các game
     */
    startGeneration() {
        // console.log(` Thế hệ game thứ ${this.neat.generation}`);
        
        this.gamesFinished = 0

        // Khởi tạo và bắt đầu vòng lặp cho từng game
        for (let i = 0; i < this.games.length; i++) {
            this.games[i].brain = this.neat.population[i]
            this.games[i].brain.score = 0
            this.games[i].start()
        }

    }


    /**
     * Kiểm tra kết thúc game
     * Xử lý khi một game kết thúc
     * Thống kê game nào có điểm cao nhất (giới tinh hoa) đem vào thế hệ kế tiếp.
     * Đột biến gene giữa thế hệ tinh hoa cũ và thế hệ mới
     * Bắt đầu chu kỳ của thế hệ mới
     */
    endGeneration() {

        // Kiểm tra xem tất cả game kết thúc hết chưa
        if (this.gamesFinished + 1 < this.games.length) {
            this.gamesFinished++
            return
        }

        this.neat.sort()

        this.onEndGeneration({
            generation: this.neat.generation,
            max: this.neat.getFittest().score,
            avg: Math.round(this.neat.getAverage()),
            min: this.neat.population[this.neat.popsize - 1].score
        })

        const newGeneration = []

        for (let i = 0; i < this.neat.elitism; i++) {
            newGeneration.push(this.neat.population[i])
        }
        for (let i = 0; i < this.neat.popsize - this.neat.elitism; i++) {
            newGeneration.push(this.neat.getOffspring())
        }

        this.neat.population = newGeneration
        this.neat.mutate()
        this.neat.generation++
        this.startGeneration()
    }
}
```

 