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
