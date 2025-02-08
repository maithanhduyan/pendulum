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
  document.getElementById('games_container').appendChild(container)

  /**
   * Tạo neat
   */
  let neat;
  const savedBestGenome = loadBestGenome();
  if (savedBestGenome) {
    // Nếu có genome đã lưu, khởi tạo Neat với genome này
    neat = new Neat(6, 2, null, {
      popsize: GAMES, // Số lượng quần thể/dân số
      elitism: 5, // Giới tinh hoa
      mutationRate: 0.8, // Tỷ lệ đột biến
      mutationAmount: 5  // Tăng cường đột biến
    });
    neat.population[0] = savedBestGenome;
  } else {
    // Khởi tạo Neat bình thường nếu không có genome lưu trữ
    neat = new Neat(6, 2, null, {
      popsize: GAMES,
      elitism: 5,
      mutationRate: 0.8,
      mutationAmount: 5
    });
  }

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
      if (max > highestScore) {

        // Ghi điểm cao nhất
        highestScore = max

        // Lấy genome tốt nhất và lưu vào localStorage
        const bestGenome = neat.getFittest();
        localStorage.setItem('bestGenome', JSON.stringify(bestGenome.toJSON()));
        // console.log('Đã lưu genome tốt nhất vào localStorage');
      }

      console.log(`Thế hệ ${generation} đã kết thúc.\nĐiểm số cao nhất: ${highestScore}`);
      // Sau đó bắt đầu thế hệ mới:
      runner.startGeneration();
    }
  })

  function loadBestGenome() {
    const savedGenome = localStorage.getItem('bestGenome');
    if (savedGenome) {
      const genomeData = JSON.parse(savedGenome);
      const genome = neataptic.Network.fromJSON(genomeData);
      return genome;
    }
    return null;
  }

  /**
 * Khởi tạo một thế hệ đầu tiên 
 **/
  runner.startGeneration()
});