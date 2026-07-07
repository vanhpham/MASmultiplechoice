# MAS Multiple Choice Trainer

Ứng dụng luyện tập trắc nghiệm theo chương, hỗ trợ nhiều chế độ học với bộ dữ liệu trong `public/data/` (chap1..chap11).

## Mục tiêu

Làm giao diện luyện tập kiểu web cho câu hỏi dạng:

- `single_choice`
- `text_answer`
- `matching_matrix`

Cho phép làm bài theo chương, theo dõi tiến độ, luyện sai, và duyệt ngẫu nhiên toàn bộ tất cả chương.

## Công nghệ

- React 18 + TypeScript
- Vite
- CSS thuần
- LocalStorage để lưu tiến độ theo chế độ
- React Strict Mode

## Yêu cầu

- Node.js 18+ (khuyến nghị 20)
- npm

## Cài đặt

```bash
npm install
```

## Chạy local

```bash
npm run dev
```

Mở trình duyệt:

- `http://localhost:5173`

## Build và Preview

```bash
npm run build
npm run preview
```

## Docker

### Dockerfile

- Multi-stage build bằng `node:20-alpine`.
- Build bản static `dist` rồi serve bằng `serve -s`.
- Expose cổng `4173`.

### docker-compose

```bash
docker compose up --build -d
```

Truy cập:

- `http://localhost:6173`

## Cấu trúc dự án

```bash
src/
  App.tsx                 # Orchestrator toàn bộ flow và state
  components/             # Các component UI
    ManualImage.tsx
    MatchingQuestion.tsx
    QuestionCard.tsx
    ResultPanel.tsx
  data/
    loadQuestions.ts       # Load + chuẩn hóa dữ liệu JSON theo chương
  lib/
    analytics.ts           # Google Analytics 4
    normalize.ts           # Chuẩn hóa chuỗi (không phân biệt hoa/thường, bỏ dấu cơ bản)
    storage.ts             # Lưu tiến độ localStorage theo chế độ/chương
  types/
    question.ts            # Kiểu dữ liệu Raw/Normalized cho các loại câu
  i18n/
    en.ts                  # Chuỗi hiển thị UI
  styles.css
  main.tsx
public/
  data/                    # chap1.json ... chap11.json
  images/                  # Ảnh minh họa theo chương q1..qN
  favicon.svg
```

## Dữ liệu đầu vào

### Vị trí

- Dữ liệu: `public/data/chap1.json` đến `public/data/chap11.json`
- Ảnh: `public/images/{chapter}/q{question_number}.png`

### Định dạng JSON

- `chapter`: tên chương (string)
- `question_number`: số thứ tự câu
- `question`: nội dung đề
- `type`: một trong `single_choice | text_answer | matching_matrix`
- `options`: mảng lựa chọn (cho `single_choice`)
- `columns`: nhãn cột (cho `matching_matrix`)
- `answer`: đáp án đúng
- `manual_image_needed`: true/false
- `note` (không bắt buộc)

Ứng dụng tự động chuẩn hóa:

- `id = slugify(chapter)-q{question_number}`
- `image = /images/{chapter}/q{question_number}.png` nếu `manual_image_needed = true`, ngược lại `null`
- Hỗ trợ nhiều biến thể cấu trúc `matching answer` từ JSON và ánh xạ về chuẩn nội bộ `{ number, component }`

## Chế độ học

### Exam

- Hiển thị toàn bộ câu của chương đang chọn.
- Nộp một lần để chấm tổng điểm.
- Lưu trạng thái bản thi (`isSubmitted`, `score`, `answers`) vào localStorage.

### Practice

- Chấm ngay khi thao tác:
  - `single_choice`, `matching_matrix`: chấm liền khi chọn/điền.
  - `text_answer`: nhập xong nhấn `Check`.
- Hữu ích để ôn nhanh và chỉnh đáp án ngay tại chỗ.

### Wrong questions

- Chỉ hiển thị các câu sai từ lần làm gần nhất theo `mode` trước đó.
- Nhận dữ liệu sai từ phiên trước của cùng chương.

### Review all

- Duyệt toàn bộ câu từ chap1..chap11 theo hàng đợi ngẫu nhiên.
- Mỗi câu được hiện tối thiểu 1 lần.
- Nếu trả lời sai lần đầu: câu đó sẽ bị đưa lại hàng đợi đúng 1 lần nữa để ôn lại.
- Sau khi đáp án sai đã được lặp đủ một lần thì không lặp tiếp.
- Lưu progress riêng cho chế độ này trong localStorage.

## Cơ chế chấm đáp án

- `single_choice`: so khớp chính xác theo normalized text (không phân biệt hoa/thường, bỏ khoảng trắng dư).
- `text_answer`: áp dụng normalize trước khi so sánh.
- `matching_matrix`: so khớp từng cặp `{ number -> component }`.

## Trạng thái lưu trữ localStorage

- `mas-mc-<chapter>-progress`
- `mas-mc-chap2-progress` (legacy compatibility)
- `mas-mc-all-chapters-review-progress` cho chế độ `Review all`

Dữ liệu lưu gồm:

- `answers`
- `isSubmitted`
- `score`
- `startedAt`, `lastRunAt`
- `wrongQuestionIds`
- `textSubmittedQuestionIds`
- `attempts`, `doneQuestionIds`, `currentQuestionId`, `reviewQueue` cho chế độ review toàn bộ

## Google Analytics 4 (tùy chọn)

Đặt biến môi trường khi cần theo dõi hành vi:

```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Sau đó:

```bash
npm run dev
```

Nếu thiếu biến môi trường, module analytics sẽ fallback an toàn (không phát event) để app vẫn chạy bình thường.

## Các script có sẵn

- `npm run dev` chạy server phát triển
- `npm run build` build production
- `npm run preview` preview bản build

## Biến môi trường

- `.env`
  - `VITE_GA_MEASUREMENT_ID`
- `.env` được gitignore, thêm file này vào thư mục gốc khi cần.

## Kiểm tra nhanh

- Chạy app: giao diện hiển thị danh sách câu.
- Đổi mode:
  - Exam / Practice / Wrong questions / Review all.
- Với `Practice` và `Review all`, kiểm tra text answer có nút `Check`.
- Với `matching_matrix`, kiểm tra dropdown điền tương ứng.
- Dùng `Clear answers` để xóa tiến độ hiện tại.
- Đổi câu `Select chapter` để test chap khác.

## Ghi chú

- Ảnh chỉ phục vụ hiển thị thị giác, nếu thiếu thì vẫn render bình thường với placeholder.
- Khi build Docker, hệ thống sẽ bỏ qua `node_modules` trong host và cài đúng theo `package-lock.json`.

## Góp ý phát triển tiếp

- Thêm chế độ luyện theo mốc thời gian (time attack)
- Tùy biến giao diện theme
- Tăng tối ưu hiệu năng khi mở rộng số lượng câu
