# Báo cáo dọn CSS - VMOS

## Kết quả

| | Trước | Sau |
|---|---|---|
| Tổng CSS (14 file) | 410 KB | 217 KB (-47%) |
| Số `!important` | 1.472 | 807 |
| Khai báo phông Inter | 3 lần (1 base64 + 2 file) | 1 lần, dùng file `fonts/` |

Phông Inter (58 KB) giờ nằm ở `fonts/*.woff2` thay vì nhúng base64 trong CSS, nên được cache riêng và không chặn render.

| File | Trước | Sau |
|---|---|---|
| `style.css` | 184.2 KB | 98.0 KB |
| `vmos-layout.css` | 34.3 KB | 23.4 KB |
| `vmos-blue-theme.css` | 102.9 KB | 26.3 KB |
| `vmos-factory-theme.css` | 20.0 KB | 4.5 KB |
| `vmos-text-blue.css` | 20.1 KB | 17.9 KB |
| `philosophy-ceo.css` | 4.6 KB | 4.0 KB |
| `legal-pages.css` | 3.2 KB | 2.3 KB |
| `hero.css` | 8.2 KB | 7.7 KB |
| các file còn lại | không đổi | không đổi |

## Đã làm gì

1. **Xóa selector chết.** 652 rule và 42 selector lẻ trong danh sách có class/id không xuất hiện ở bất kỳ file HTML hoặc JS nào (kể cả `i18n.js`). JS không tạo class bằng cách nối chuỗi nên không có rủi ro class sinh động. Các class JS bật/tắt (`active`, `open`, `scrolled`, `visible`...) đều được giữ.
2. **Xóa rule trùng lặp giữa `vmos-blue-theme.css`, `vmos-factory-theme.css`, `vmos-text-blue.css`.** Ba file này chứa nhiều rule giống hệt nhau. Chỉ xóa khi chứng minh được thứ tự cascade không đổi: (a) bản trùng sau còn được nạp ở mọi trang có bản trước, hoặc (b) giữa hai bản không có rule nào đụng cùng nhóm thuộc tính. 57 trường hợp không chứng minh được nên được giữ lại.
3. **Xóa `@keyframes` không dùng (4) và các `@media`/`@supports` rỗng (32).**
4. **Phông Inter:** tách base64 trong `vmos-blue-theme.css` thành `fonts/inter-latin-wght-normal.woff2` và `fonts/inter-vietnamese-wght-normal.woff2`, xóa hai khối `@font-face` trùng trong `factory` và `text-blue`.
5. **`service-layout.css`:** rút gọn `.sl-container` (bản đầu bị `vmos-margins.css` ghi đè hoàn toàn bằng `!important`).
6. **11 file HTML:** thống nhất `?v=` của mọi link CSS thành `20261113`. Trước đó `terms.html` dùng `rx31/17` còn các trang khác `rx30/16`, khiến trình duyệt tải hai bản.

## Cách kiểm chứng

Chụp 66 ảnh toàn trang (11 trang x 2 theme x 3 độ rộng 1440/820/390) và 21 ảnh trạng thái tương tác (đổi ngôn ngữ EN/JA, bật tối, mở sidebar mobile/tablet, hover nút/thẻ/menu, focus ô nhập, cuộn) cho bản gốc và bản mới, rồi so từng pixel.
- Toàn trang: 62/66 giống hệt. 4 ảnh còn lại lệch tối đa 1 pixel hoặc ~185 pixel ở một ô nhỏ; cùng mức nhiễu khi chụp bản gốc hai lần.
- Tương tác: 20/21 giống hệt; ảnh còn lại lệch 1 pixel.

Hạn chế của kiểm tra: không bao phủ trạng thái hover của trang dịch vụ, ảnh thật (thư mục `images/` không có trong bản upload), video hero, và trình duyệt khác Chromium.

## Cần bạn xác nhận khi triển khai

- **Thư mục `fonts/` phải có trên server.** Trước đây 3 trang dịch vụ dùng phông base64 và không cần thư mục này; giờ cả 11 trang đều cần. Hai file đã được tạo sẵn từ đúng dữ liệu base64 cũ, bạn chỉ cần copy cùng cấp với CSS.
- **Bản gốc vẫn còn.** Nếu có gì lệch, thay lại file cũ là quay về được.

## Cố ý chưa làm (vì rủi ro hoặc cần bạn quyết định)

- **`service-layout.css` giữ nguyên các khối chưa dùng** (`.sl-benefits`, `.sl-cards`, `.sl-trial`, `.sl-more`, `.sl-toc`, `.sl-btn`...). Đây là thư viện khối mẫu, hiện các trang dịch vụ chưa dùng nhưng bạn có thể thêm sau. Muốn xóa, bỏ `service-layout.css` khỏi `PROTECT` trong `tools/clean-css.py` rồi chạy lại.
- **`@layer` và bỏ `!important`:** còn 807 `!important`. Trong `@layer`, `!important` đảo ngược thứ tự ưu tiên giữa các lớp, nên chuyển một lần sẽ phá giao diện. Cần làm từng file, kiểm bằng bộ chụp ảnh ở `tools/`.
- **Chuỗi `:root:root:root...` (philosophy-ceo, service-banner) và selector `html[data-theme="dark"|"light"]` lặp trong `hero.css`:** giảm độ ưu tiên có thể làm thua các rule `!important` ở file khác. Nên xử lý cùng bước `@layer`.
- **Nút `.isc-btn` và `.sl-btn` gần giống nhau:** gộp cần sửa HTML.
- **`--brand-rgb`** vẫn cần song song với `--brand`; đổi sang `color-mix()` thì trình duyệt cũ mất lớp phủ banner.

## Phát hiện khác (ngoài CSS)

- `zalo-qr.html` không nạp `vmos-margins.css` (các trang khác đều nạp). Có thể cố ý vì là cửa sổ popup.
- `index.html` và `zalo-qr.html` còn dùng `.dot-pattern`, nhưng `vmos-white-theme.css` ẩn nó bằng `display:none` ở theme Sáng. Nếu không cần, nên xóa khỏi HTML.
- `script.js` có code cho `.portfolio-tabs .tab-btn`, `.team-slider-*`, `.service-accordion-*`, nhưng không trang nào còn các phần tử này.
- Số `?v=` của JS cũng lệch nhau (`i18n.js` v=14 ở `about.html`, v=12 ở trang khác).

## Chạy lại công cụ

```bash
python3 tools/clean-css.py <thư-mục-nguồn> <thư-mục-đầu-ra>
python3 tools/shoot.py <thư-mục-site> <thư-mục-ảnh>   # chụp 66 ảnh
python3 tools/diff.py <ảnh-cũ> <ảnh-mới>               # so pixel
```
Cần `playwright` và `tinycss2` (`pip install tinycss2 playwright`).
