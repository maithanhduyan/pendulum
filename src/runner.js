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
        console.log(` Thế hệ game thứ ${this.neat.generation}`);

        // Reset số lượng game đã hoàn thành
        this.gamesFinished = 0;

        // Khởi tạo và bắt đầu vòng lặp cho từng game
        this.games.forEach(game => {
            // Bắt đầu vòng lặp game
            game.start();
        });

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
            console.log(`Kiểm tra xem tất cả game kết thúc hết chưa`);

            return
        }
        console.log(`OK. Tất cả game đều kết thúc.`);
        
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