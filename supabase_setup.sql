-- ===================================================
-- HONGNGOCFORM - SUPABASE SETUP (1-CLICK SQL)
-- Copy toàn bộ nội dung file này dán vào Supabase SQL Editor và bấm Run
-- ===================================================

-- 1. Bảng lưu trữ biểu mẫu (Forms)
CREATE TABLE IF NOT EXISTS public.forms (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    response_count INTEGER DEFAULT 0,
    created_at BIGINT,
    updated_at BIGINT
);

-- 2. Bảng lưu trữ phản hồi (Responses)
CREATE TABLE IF NOT EXISTS public.responses (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at BIGINT
);

-- 3. Tạo index để tăng tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON public.responses(form_id);

-- 4. Bật Row Level Security (RLS) & Cho phép người dùng công khai truy cập (Không cần đăng nhập)
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Policy cho bảng forms (Đọc, Thêm, Sửa, Xóa công khai)
CREATE POLICY "Public forms read" ON public.forms FOR SELECT USING (true);
CREATE POLICY "Public forms insert" ON public.forms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public forms update" ON public.forms FOR UPDATE USING (true);
CREATE POLICY "Public forms delete" ON public.forms FOR DELETE USING (true);

-- Policy cho bảng responses (Đọc, Thêm, Xóa công khai)
CREATE POLICY "Public responses read" ON public.responses FOR SELECT USING (true);
CREATE POLICY "Public responses insert" ON public.responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public responses delete" ON public.responses FOR DELETE USING (true);

-- 5. Tạo Storage Bucket lưu tệp/ảnh minh chứng (Dung lượng 1GB miễn phí)
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Policy cho Storage Bucket (Cho phép tải lên và xem tệp công khai)
CREATE POLICY "Public storage upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'form-uploads');

CREATE POLICY "Public storage read" ON storage.objects
FOR SELECT USING (bucket_id = 'form-uploads');

CREATE POLICY "Public storage delete" ON storage.objects
FOR DELETE USING (bucket_id = 'form-uploads');
