/**
 * Trò chơi theo dõi hoạt động của con lắc.
 * Hiển thị thông số của con lắc
 */

class Game {

    constructor({ screen, score, onGameOver, genome }) {

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
        this.genome = genome;

        this.lastRevolution = 0;
    }

    /**
     * Cập nhật trạng thái game
     * @param {number} deltaTime - Thời gian trôi qua từ frame trước (giây)
     * Status: IDLE, RUNNING, GAME_OVER
     */
    updateGameStatus(deltaTime) {
        this.pendulum.update(deltaTime)

        // Thu thập dữ liệu đầu vào
        const inputs = [
            this.pendulum.theta,
            this.pendulum.thetaDot,
            this.pendulum.A,
            this.pendulum.F,
            Math.cos(this.pendulum.omega * this.pendulum.time),
            Math.sin(this.pendulum.omega * this.pendulum.time)
        ];

        // Kích hoạt mạng neural
        const outputs = this.genome.activate(inputs);

        // Điều khiển con lắc
        this.pendulum.control({
            A: outputs[0], // Biên độ 
            F: outputs[1] * 2 + 0.1 // Tần số
        });

        // Tính FPS từ deltaTime (nếu deltaTime != 0)
        const fps = Math.round(1 / deltaTime);

        // RPM
        let rpmDisplay = Math.round(Math.abs(this.pendulum.thetaDot) / (2 * Math.PI) * 60);
        // Hiển thị thông tin Score và FPS lên canvas
        this.ctx.font = "20px Arial";
        this.ctx.fillStyle = "#000";
        this.ctx.fillText(`Score: ${Math.floor(this.score)}`, 10, 30);
        this.ctx.fillText(`FPS: ${fps}`, 10, 60);
        this.ctx.fillText(`A: ${outputs[0]}`, 10, 90);
        this.ctx.fillText(`Freq: ${outputs[1]}`, 10, 120);
        this.ctx.fillText(`RPM: ${rpmDisplay}`, 10, 150);


        // Hiển thị góc lệch (đổi từ radian sang độ)
        let angleInDegrees = Math.round(this.pendulum.theta * (180 / Math.PI));
        this.ctx.fillText(`Angle: ${angleInDegrees} °`, 10, 180);

        // --- Ghi điểm theo quy tắc ---
        // điểm dựa trên thời gian tồn tại
        // Dựa vào số vòng quay
        if (angleInDegrees > 360 && rpmDisplay > 100) {
            this.score += deltaTime * 1
        } else {

            this.score -= deltaTime * 1;
        }

        // Nếu có điều kiện kết thúc game, cập nhật trạng thái và gọi onGameOver nếu cần
        // Kiểm tra điều kiện kết thúc game:
        if (this.score < -10) {
            this.status = 'GAME_OVER';
            this.ctx.font = "50px Arial";
            this.ctx.fillStyle = "#800";
            this.ctx.fillText(`GAME OVER`, this.centerScreen.X, this.centerScreen.Y);
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