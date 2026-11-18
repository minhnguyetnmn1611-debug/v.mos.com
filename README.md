# Website VIET.MOS COMPANY LIMITED (VMOS)

Website tĩnh giới thiệu doanh nghiệp và dịch vụ kỹ thuật tự động hóa:
- **Ngôn ngữ hỗ trợ**: Tiếng Việt (`vi`), Tiếng Anh (`en`), Tiếng Nhật (`ja`).
- **Giao diện**: Hỗ trợ chuyển đổi Theme Sáng (Light - mặc định) / Tối (Dark).
- **Trang chính**:
  - `index.html`: Trang chủ
  - `about.html`: Giới thiệu doanh nghiệp
  - `blog.html`: Tin tức & bài viết công nghệ
  - `contact.html`: Liên hệ tư vấn & bản đồ
  - `du-an.html`: Dự án triển khai tiêu biểu
  - `dich-vu-thiet-ke-co-khi.html`: Dịch vụ thiết kế cơ khí
  - `dich-vu-thiet-ke-dien.html`: Dịch vụ thiết kế điện & lập trình điều khiển
  - `dich-vu-thiet-ke-mo-phong.html`: Dịch vụ thiết kế mô phỏng 3D
  - `privacy.html`: Chính sách bảo mật
  - `terms.html`: Điều khoản sử dụng
  - `zalo-qr.html`: Cửa sổ quét mã Zalo kết nối

---

## 1. Khởi động môi trường phát triển cục bộ (Development)

Cách chính (mọi hệ điều hành) — chạy máy chủ dev bằng Python:
```bash
python server.py
```
Máy chủ sẽ tự động tìm cổng trống (từ 8000 trở đi) và phục vụ trang web tại `http://localhost:8000`. Mặc định chỉ nghe trên `127.0.0.1` (chỉ máy bạn truy cập được); muốn mở cho điện thoại cùng Wi-Fi, đặt biến môi trường `VMOS_HOST=0.0.0.0` trước khi chạy.

Trên Windows có thể bấm đúp `start-web.bat` để khởi động nhanh mà không cần mở terminal (file này tự chọn `py` hoặc `python` rồi chạy `server.py`).
Đây chỉ là lối tắt cho cách chính ở trên; chỉ cần dùng một trong hai, không chạy đồng thời.

> **LƯU Ý QUAN TRỌNG KHI TRIỂN KHAI PRODUCTION:**
> - File `server.py` **CHỈ DÙNG CHO MÔI TRƯỜNG DEVELOPMENT CỤC BỘ**.
> - Máy chủ này bật chế độ CORS mở toàn bộ (`Access-Control-Allow-Origin: *`) và vô hiệu hóa cache (`Cache-Control: no-cache, no-store, must-revalidate`) nhằm hỗ trợ dev và kiểm thử video streaming.
> - **Tuyệt đối không dùng `server.py` để chạy trên môi trường production công khai**. Khi triển khai chính thức, hãy sử dụng Web Server chuyên dụng như **Nginx**, **Apache**, **Caddy**, hoặc các dịch vụ Static Web Hosting (Cloudflare Pages, Vercel, Netlify, AWS S3/CloudFront) có cấu hình cache trình duyệt, nén Gzip/Brotli và bảo mật HTTPS đầy đủ.

---

## 2. Khuyến nghị tối ưu hóa hiệu năng Production

1. **Ảnh Base64 inline**: đã tách khỏi `index.html` và `vmos-blue-theme.css` (hiện không còn chuỗi `data:image` nào). Khi thêm ảnh mới, luôn dùng file riêng (WebP/AVIF).
2. **Gộp và Minify CSS/JS**:
   - Gộp và nén các file CSS (`style.css`, `vmos-layout.css`, `vmos-blue-theme.css`, `vmos-factory-theme.css`, `vmos-text-blue.css`, `vmos-white-theme.css`, `vmos-margins.css`; thêm `hero.css` và `intro-showcase.css` cho trang chủ, `group-gallery.css` và `philosophy-ceo.css` cho Về chúng tôi, `service-banner.css`, `service-layout.css` và `service-refine.css` cho 3 trang dịch vụ, `contact-split.css` cho Liên hệ, `page-banner.css` + `legal-pages.css` cho Tin tức / Chính sách bảo mật / Điều khoản) thành bundle duy nhất cho từng trang khi build production.
3. **Lazy Loading cho hình ảnh**:
   - Thêm thuộc tính `loading="lazy"` cho tất cả các thẻ `<img>` nằm ngoài màn hình đầu tiên (below the fold).