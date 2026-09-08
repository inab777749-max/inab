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

-- 3) 공지 게시판
CREATE TABLE IF NOT EXISTS notice_posts (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT,
  body        TEXT,
  images      TEXT,
  date_label  TEXT,
  link_url    TEXT,
  link_label  TEXT,
  pinned      BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notice_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notice_posts_read"   ON notice_posts;
DROP POLICY IF EXISTS "notice_posts_insert" ON notice_posts;
DROP POLICY IF EXISTS "notice_posts_update" ON notice_posts;
DROP POLICY IF EXISTS "notice_posts_delete" ON notice_posts;
CREATE POLICY "notice_posts_read"   ON notice_posts FOR SELECT USING (true);
CREATE POLICY "notice_posts_insert" ON notice_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notice_posts_update" ON notice_posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notice_posts_delete" ON notice_posts FOR DELETE TO authenticated USING (true);

-- 4) 공지 메뉴 이름과 페이지 문구
UPDATE site_content SET data = data || '{
  "nav_notice": "공지사항",
  "notice_kicker2": "Notice",
  "notice_title2": "공지사항",
  "notice_lead2": "휴가 일정, 접수 안내, 문의 작성법을 이곳에 정리합니다.",
  "notice_empty": "등록된 공지가 없습니다.",
  "seo_notice_title": "공지사항 | INAB Shop",
  "seo_notice_desc": "INAB 공지사항 — 휴가 일정, 접수 안내, 문의 작성법."
}'::jsonb WHERE id = 1;

-- 5) 사진 업로드 저장소 (관리자의 "사진 올리기" 버튼)
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

-- 6) 탭 제목을 INAB Shop 으로
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
