-- 이미 supabase.sql 을 Run 한 뒤 탭 제목만 바꿀 때 쓴다.
-- (처음 설치하는 경우에는 필요 없다. supabase.sql 에 이미 반영되어 있다.)
-- Supabase > SQL Editor 에 붙여넣고 Run.

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
