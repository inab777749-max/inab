-- 이미 supabase.sql 을 Run 한 뒤에 추가된 기능을 적용할 때 쓴다.
-- 처음 설치하는 경우에는 필요 없다 (supabase.sql 에 모두 들어 있다).
-- Supabase > SQL Editor 에 붙여넣고 Run. 여러 번 실행해도 안전하다.

-- 1) 추가 옵션 묶음(소제목) 기능
ALTER TABLE price_options ADD COLUMN IF NOT EXISTS group_label TEXT;

-- 2) 한 항목에 사진 여러 장 (한 줄에 하나씩 저장)
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS images TEXT;
ALTER TABLE shop_items      ADD COLUMN IF NOT EXISTS images TEXT;
UPDATE portfolio_items SET images = image_url WHERE (images IS NULL OR images = '') AND image_url <> '';
UPDATE shop_items      SET images = image_url WHERE (images IS NULL OR images = '') AND image_url <> '';

-- 3) 사진 업로드 저장소 (관리자의 "사진 올리기" 버튼)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "site_images_read"   ON storage.objects;
DROP POLICY IF EXISTS "site_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "site_images_update" ON storage.objects;
DROP POLICY IF EXISTS "site_images_delete" ON storage.objects;
CREATE POLICY "site_images_read"   ON storage.objects FOR SELECT USING (bucket_id = 'site-images');
CREATE POLICY "site_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-images');
CREATE POLICY "site_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'site-images') WITH CHECK (bucket_id = 'site-images');
CREATE POLICY "site_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-images');

-- 4) 탭 제목을 INAB Shop 으로
UPDATE site_content
SET data = data || '{
  "site_name": "INAB Shop",
  "seo_home_title": "INAB Shop",
  "seo_profile_title": "작가 프로필 | INAB Shop",
  "seo_portfolio_title": "포트폴리오 | INAB Shop",
  "seo_commission_title": "커미션 안내 | INAB Shop",
  "seo_pricing_title": "가격 안내 | INAB Shop",
  "seo_schedule_title": "작업 일정 | INAB Shop",
  "seo_shop_title": "개인작 판매 | INAB Shop",
  "seo_faq_title": "자주묻는질문 FAQ | INAB Shop"
}'::jsonb,
updated_at = NOW()
WHERE id = 1;
