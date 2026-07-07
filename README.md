# MAS Multiple Choice - Chapter 2 Practice

## How to run

```bash
npm install
npm run dev
```

## Files used by the app

- Data: `public/data/chap2.json`
- Manual images: `public/images/chap2/q{question_number}.png`
- Main app: `src/App.tsx`
- Question data mapper: `src/data/loadQuestions.ts`

## Main features

- Nạp 10 câu trong chapter 2 từ JSON
- Tự động gắn ảnh cho các câu có `manual_image_needed = true`
- Hỗ trợ:
  - `single_choice`
  - `text_answer`
  - `matching_matrix`
- Chấm điểm + lưu tiến độ (answers, `isSubmitted`, `score`, thời gian bắt đầu) trong `localStorage`
- Hỗ trợ xem lại đáp án đúng sau khi nộp

## Google Analytics 4

Tạo file `.env` và thêm biến sau để bật tracking:

```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Lưu ý:

- Dự án nhận diện GA4 ngay khi khởi động app.
- Restart `npm run dev` sau khi sửa `.env`.
- Kiểm tra DevTools:
  - Console có hiển thị `[GA4] ...` nếu thiếu/sai `VITE_GA_MEASUREMENT_ID`.
  - Network có request đến `www.googletagmanager.com/gtag/js`.
- Trong UI, nếu cấu hình GA chưa hợp lệ thì dòng **Google Analytics is not configured/invalid** sẽ báo ở phần tip trên cùng.
