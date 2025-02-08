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

        // Tạo thế hệ mới
        for (let i = 0; i < this.neat.elitism; i++) {
            newGeneration.push(this.neat.population[i])
        }

        // Kế thừa genome từ thế hệ tinh hoa 
        for (let i = 0; i < this.neat.popsize - this.neat.elitism; i++) {
            newGeneration.push(this.neat.getOffspring())
        }

        // Thế hệ kế thừa tinh hoa từ thế hệ cũ
        this.neat.population = newGeneration

        // Đột biến 
        this.neat.mutate()

        // Tối ưu genome
        // for (let i = 0; i < this.neat.popsize; i++) {
        //     this.neat.population[i] = this.evaluateGenome(this.neat.population[i])
        // }

        this.neat.generation++
        this.startGeneration()
    }
}