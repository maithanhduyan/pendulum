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