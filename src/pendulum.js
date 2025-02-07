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