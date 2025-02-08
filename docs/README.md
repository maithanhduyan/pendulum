# Documents


### Cài đặt và sử dụng cargo
1. Cài gói  `mdbook`
> cargo install mdbook

2. Tạo cấu trúc thư mục
```
├── book.toml
└── src
    ├── SUMMARY.md
    ├── introduction.md
    └── chapter_1.md
```
Giải thích:

- `book.toml`: Tệp cấu hình chính, chứa thông tin metadata của cuốn sách (tiêu đề, tác giả, ngôn ngữ, thư mục nguồn,…).
- `src/SUMMARY.md`: File định nghĩa mục lục của cuốn sách, liệt kê các chương và liên kết tới các file Markdown tương ứng.
Các file Markdown (ví dụ: chapter_1.md): Nơi bạn soạn thảo nội dung chi tiết của từng chương.

3. Build và Chạy chương trình

> mdbook build

> mdbook serve

- Option 1:
> mdbook serve --open

- Option 2:
> mdbook serve --port 5001 --open