-- INAB 사이트 — Supabase 설치 SQL
-- 실행 순서
--   1) Authentication > Users > Add user 로 관리자 계정을 먼저 만든다 (Auto Confirm User 켜기)
--   2) SQL Editor 에 이 파일 전체를 붙여넣고 Run
-- 순서를 바꾸면 쓰기 권한이 잠겨 본인도 관리자에서 저장할 수 없다.
--
-- 권한
--   읽기            : 누구나 (사이트 표시용)
--   등록/수정/삭제  : 로그인한 관리자만
--   inquiries       : 전송은 누구나, 열람과 삭제는 관리자만 (개인정보)
--
-- 여러 번 다시 실행해도 안전하다. 자료가 이미 있으면 예시 자료는 다시 넣지 않는다.

CREATE TABLE IF NOT EXISTS site_content (
  id         BIGINT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT,
  meta        TEXT,
  description TEXT,
  image_url   TEXT,
  tag         TEXT,
  anchor      TEXT,
  fit         TEXT DEFAULT 'cover',
  focus_x     INTEGER DEFAULT 50,
  focus_y     INTEGER DEFAULT 50,
  featured    BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collab_artists (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT,
  description TEXT,
  image_url   TEXT,
  link_url    TEXT,
  link_label  TEXT,
  sort_order  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS price_packages (
  id           BIGSERIAL PRIMARY KEY,
  type_label   TEXT,
  title        TEXT,
  price_before TEXT,
  price        TEXT,
  features     TEXT,
  tag          TEXT,
  sort_order   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS price_options (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT,
  amount     TEXT,
  note       TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commission_steps (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commission_notices (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT,
  content    TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inquiry_forms (
  id         BIGSERIAL PRIMARY KEY,
  tab_label  TEXT,
  form_title TEXT,
  fields     TEXT,
  note       TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faq_items (
  id         BIGSERIAL PRIMARY KEY,
  question   TEXT,
  answer     TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS schedule_events (
  id         BIGSERIAL PRIMARY KEY,
  calendar   TEXT DEFAULT 'package',
  event_date DATE,
  kind       TEXT DEFAULT 'waiting',
  label      TEXT
);

CREATE TABLE IF NOT EXISTS shop_items (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT,
  price       TEXT,
  status      TEXT,
  description TEXT,
  image_url   TEXT,
  link_url    TEXT,
  link_label  TEXT,
  sort_order  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inquiries (
  id         BIGSERIAL PRIMARY KEY,
  contact    TEXT,
  form_title TEXT,
  message    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 접근 권한 (RLS)
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_content_read"   ON site_content;
DROP POLICY IF EXISTS "site_content_insert" ON site_content;
DROP POLICY IF EXISTS "site_content_update" ON site_content;
DROP POLICY IF EXISTS "site_content_delete" ON site_content;
CREATE POLICY "site_content_read"   ON site_content FOR SELECT USING (true);
CREATE POLICY "site_content_insert" ON site_content FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "site_content_update" ON site_content FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "site_content_delete" ON site_content FOR DELETE TO authenticated USING (true);
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portfolio_items_read"   ON portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_insert" ON portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_update" ON portfolio_items;
DROP POLICY IF EXISTS "portfolio_items_delete" ON portfolio_items;
CREATE POLICY "portfolio_items_read"   ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "portfolio_items_insert" ON portfolio_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "portfolio_items_update" ON portfolio_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "portfolio_items_delete" ON portfolio_items FOR DELETE TO authenticated USING (true);
ALTER TABLE collab_artists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collab_artists_read"   ON collab_artists;
DROP POLICY IF EXISTS "collab_artists_insert" ON collab_artists;
DROP POLICY IF EXISTS "collab_artists_update" ON collab_artists;
DROP POLICY IF EXISTS "collab_artists_delete" ON collab_artists;
CREATE POLICY "collab_artists_read"   ON collab_artists FOR SELECT USING (true);
CREATE POLICY "collab_artists_insert" ON collab_artists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "collab_artists_update" ON collab_artists FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "collab_artists_delete" ON collab_artists FOR DELETE TO authenticated USING (true);
ALTER TABLE price_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_packages_read"   ON price_packages;
DROP POLICY IF EXISTS "price_packages_insert" ON price_packages;
DROP POLICY IF EXISTS "price_packages_update" ON price_packages;
DROP POLICY IF EXISTS "price_packages_delete" ON price_packages;
CREATE POLICY "price_packages_read"   ON price_packages FOR SELECT USING (true);
CREATE POLICY "price_packages_insert" ON price_packages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "price_packages_update" ON price_packages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "price_packages_delete" ON price_packages FOR DELETE TO authenticated USING (true);
ALTER TABLE price_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_options_read"   ON price_options;
DROP POLICY IF EXISTS "price_options_insert" ON price_options;
DROP POLICY IF EXISTS "price_options_update" ON price_options;
DROP POLICY IF EXISTS "price_options_delete" ON price_options;
CREATE POLICY "price_options_read"   ON price_options FOR SELECT USING (true);
CREATE POLICY "price_options_insert" ON price_options FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "price_options_update" ON price_options FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "price_options_delete" ON price_options FOR DELETE TO authenticated USING (true);
ALTER TABLE commission_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_steps_read"   ON commission_steps;
DROP POLICY IF EXISTS "commission_steps_insert" ON commission_steps;
DROP POLICY IF EXISTS "commission_steps_update" ON commission_steps;
DROP POLICY IF EXISTS "commission_steps_delete" ON commission_steps;
CREATE POLICY "commission_steps_read"   ON commission_steps FOR SELECT USING (true);
CREATE POLICY "commission_steps_insert" ON commission_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "commission_steps_update" ON commission_steps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "commission_steps_delete" ON commission_steps FOR DELETE TO authenticated USING (true);
ALTER TABLE commission_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_notices_read"   ON commission_notices;
DROP POLICY IF EXISTS "commission_notices_insert" ON commission_notices;
DROP POLICY IF EXISTS "commission_notices_update" ON commission_notices;
DROP POLICY IF EXISTS "commission_notices_delete" ON commission_notices;
CREATE POLICY "commission_notices_read"   ON commission_notices FOR SELECT USING (true);
CREATE POLICY "commission_notices_insert" ON commission_notices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "commission_notices_update" ON commission_notices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "commission_notices_delete" ON commission_notices FOR DELETE TO authenticated USING (true);
ALTER TABLE inquiry_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inquiry_forms_read"   ON inquiry_forms;
DROP POLICY IF EXISTS "inquiry_forms_insert" ON inquiry_forms;
DROP POLICY IF EXISTS "inquiry_forms_update" ON inquiry_forms;
DROP POLICY IF EXISTS "inquiry_forms_delete" ON inquiry_forms;
CREATE POLICY "inquiry_forms_read"   ON inquiry_forms FOR SELECT USING (true);
CREATE POLICY "inquiry_forms_insert" ON inquiry_forms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inquiry_forms_update" ON inquiry_forms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "inquiry_forms_delete" ON inquiry_forms FOR DELETE TO authenticated USING (true);
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faq_items_read"   ON faq_items;
DROP POLICY IF EXISTS "faq_items_insert" ON faq_items;
DROP POLICY IF EXISTS "faq_items_update" ON faq_items;
DROP POLICY IF EXISTS "faq_items_delete" ON faq_items;
CREATE POLICY "faq_items_read"   ON faq_items FOR SELECT USING (true);
CREATE POLICY "faq_items_insert" ON faq_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "faq_items_update" ON faq_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "faq_items_delete" ON faq_items FOR DELETE TO authenticated USING (true);
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedule_events_read"   ON schedule_events;
DROP POLICY IF EXISTS "schedule_events_insert" ON schedule_events;
DROP POLICY IF EXISTS "schedule_events_update" ON schedule_events;
DROP POLICY IF EXISTS "schedule_events_delete" ON schedule_events;
CREATE POLICY "schedule_events_read"   ON schedule_events FOR SELECT USING (true);
CREATE POLICY "schedule_events_insert" ON schedule_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "schedule_events_update" ON schedule_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "schedule_events_delete" ON schedule_events FOR DELETE TO authenticated USING (true);
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_items_read"   ON shop_items;
DROP POLICY IF EXISTS "shop_items_insert" ON shop_items;
DROP POLICY IF EXISTS "shop_items_update" ON shop_items;
DROP POLICY IF EXISTS "shop_items_delete" ON shop_items;
CREATE POLICY "shop_items_read"   ON shop_items FOR SELECT USING (true);
CREATE POLICY "shop_items_insert" ON shop_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shop_items_update" ON shop_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shop_items_delete" ON shop_items FOR DELETE TO authenticated USING (true);
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inquiries_read"   ON inquiries;
DROP POLICY IF EXISTS "inquiries_insert" ON inquiries;
DROP POLICY IF EXISTS "inquiries_delete" ON inquiries;
CREATE POLICY "inquiries_insert" ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "inquiries_read"   ON inquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY "inquiries_delete" ON inquiries FOR DELETE TO authenticated USING (true);


-- 화면 문구 (한 줄에 모두 저장)
INSERT INTO site_content (id, data) VALUES (1, '{"site_brand": "INAB", "site_name": "INAB Shop", "footer_copy": "© {year} INAB. Virtual Character Production Artist.", "nav_profile": "작가 프로필", "nav_portfolio": "포트폴리오", "nav_commission": "커미션 안내", "nav_pricing": "가격 안내", "nav_schedule": "작업 일정", "nav_shop": "개인작 판매", "nav_faq": "자주묻는질문 FAQ", "footer_l1_label": "커미션 문의서", "footer_l1_url": "commission.html#inquiry", "footer_l2_label": "가격 안내", "footer_l2_url": "pricing.html", "footer_l3_label": "FAQ", "footer_l3_url": "faq.html", "seo_image": "", "seo_home_title": "INAB Shop", "seo_home_desc": "INAB 이나비의 버추얼 캐릭터 제작 포트폴리오와 커미션 안내.", "seo_profile_title": "작가 프로필 | INAB Shop", "seo_profile_desc": "버추얼 캐릭터 제작자 INAB 이나비의 소개와 협업 작가 혜택.", "seo_portfolio_title": "포트폴리오 | INAB Shop", "seo_portfolio_desc": "INAB의 일러기반 성형, 페이셜, 닐로툰, 헤어와 Magica Cloth 2 작업 포트폴리오.", "seo_commission_title": "커미션 안내 | INAB Shop", "seo_commission_desc": "INAB 커미션 진행 과정, 신청 전 안내사항과 복사 가능한 문의서.", "seo_pricing_title": "가격 안내 | INAB Shop", "seo_pricing_desc": "INAB VSF, Warudo, Meligo, NiloToon 데뷔 패키지와 추가 옵션 가격.", "seo_schedule_title": "작업 일정 | INAB Shop", "seo_schedule_desc": "INAB 패키지 작업과 닐로툰·뚜따 작업 일정 캘린더.", "seo_shop_title": "개인작 판매 | INAB Shop", "seo_shop_desc": "INAB 오리지널 개인작 모델과 베이스 판매 안내.", "seo_faq_title": "자주묻는질문 FAQ | INAB Shop", "seo_faq_desc": "INAB 커미션, 페이셜, 닐로툰, Unity 파일과 개인작 관련 자주 묻는 질문.", "home_hero_image": "", "home_hero_focus": "center 38%", "home_eyebrow": "Virtual Character Production Artist", "home_title": "INAB", "home_script": "inabi", "home_headline": "표정과 움직임, 헤어의 결까지 설계합니다.", "home_desc": "버추얼 캐릭터의 인상과 감정을 세심하게 완성합니다.", "home_services": "ILLUSTRATION BASE · FACIAL · NILOTOON · HAIR COMBINATION · MAGICALCLOTH2", "home_btn1_label": "포트폴리오 보기", "home_btn1_url": "portfolio.html", "home_btn2_label": "커미션 안내", "home_btn2_url": "commission.html", "home_works_kicker": "Selected Works", "home_works_title": "작업의 결을 살펴보세요.", "home_works_link_label": "전체 포트폴리오", "home_flow_title": "Commission Flow", "home_flow": "문의·상담\n작업·컨펌\n세팅·검수\n완성본 전달", "home_about_title": "About INAB", "home_about_copy": "처음 시작하는 분도 편하게 이야기할 수 있도록, 상담부터 전달까지 차근차근 함께합니다.", "home_about_sign": "inabi", "home_contact_title": "Contact", "home_contact_copy": "작업 범위와 일정, 필요한 파일을 먼저 확인해 보세요.", "home_contact_btn_label": "문의서 작성하기", "home_contact_btn_url": "commission.html#inquiry", "profile_kicker": "About INAB", "profile_title": "Artist Profile", "profile_lead": "캐릭터의 인상과 움직임을 세심하게 설계하는 버추얼 캐릭터 제작자 INAB입니다.", "profile_image": "", "profile_image_focus": "50% 50%", "profile_eyebrow": "Virtual Character Production Artist", "profile_name": "INAB", "profile_korean": "이나비", "profile_intro": "언제나 최선을 다해 예쁜 아바타를 만들어드리겠습니다.\n당신만의 예쁘고 멋진 버추얼 아바타를 만들어 드려요. 처음이신 분도 편하게 문의해주세요!", "profile_tags": "NiloToon, Warudo, Warudo Pro, Meligo, VSF", "collab_kicker": "Collaboration Benefit", "collab_title": "협업 작가 혜택", "collab_note": "각 작가의 작업 조건과 할인 적용 가능 여부는 신청 전 상담에서 최종 확인해주세요.", "portfolio_kicker": "Selected Works", "portfolio_title": "Portfolio", "portfolio_lead": "실제 작업 이미지를 분야별로 모았습니다. 카드를 누르면 더 크게 확인할 수 있습니다.", "portfolio_all_label": "전체", "portfolio_ratio": "4 / 3", "portfolio_cats": "sculpt | 일러기반 성형\nfacial | 페이셜\nnilo | 닐로툰\nstyling | 헤어·세팅", "commission_kicker": "Process & Notice", "commission_title": "Commission", "commission_lead": "상담부터 최종 전달까지의 과정과 신청 전 꼭 확인할 내용을 정리했습니다.", "flow_kicker": "Commission Flow", "flow_title": "작업은 이렇게 진행됩니다.", "flow_note": "작업 범위에 따라 일부 단계가 합쳐지거나 순서가 조정될 수 있습니다.", "notice_kicker": "Before Request", "notice_title": "신청 전 안내사항", "notice_note": "유료 파츠 구매, 파일 이용 범위, 필요한 기기 조건을 신청 전에 확인해주세요.", "inquiry_kicker": "Inquiry Builder", "inquiry_title": "커미션 문의서", "inquiry_note": "작업 유형을 선택해 내용을 작성한 뒤 한 번에 복사할 수 있습니다.", "inquiry_summary": "문의서 열기", "inquiry_send_on": "on", "inquiry_send_head": "작성한 내용을 바로 보내기", "inquiry_send_help": "연락받을 곳을 적고 보내면 작가에게 바로 전달됩니다. 복사해서 다른 채널로 보내도 됩니다.", "inquiry_send_btn": "문의 보내기", "inquiry_contact_label": "연락받을 곳 (디스코드 · X 등)", "pricing_kicker": "Package Guide", "pricing_title": "Pricing", "pricing_lead": "작업 환경과 일러기반 성형 여부에 따른 패키지 가격을 한눈에 비교해 보세요.", "price_kicker": "Debut Package", "price_title": "데뷔 패키지", "price_note": "표시 가격은 원본 안내 기준입니다. 파츠 구매 비용과 추가 옵션은 별도이며 신청 전 최종 견적을 확인해주세요.", "price_all_label": "전체", "price_cats": "standard | 일반 패키지\nillustration | 일러기반", "option_kicker": "Options", "option_title": "추가 옵션", "option_col1": "옵션", "option_col2": "추가 금액", "option_col3": "안내", "schedule_kicker": "Work Calendar", "schedule_title": "Schedule", "schedule_lead": "개인 정보는 제외하고 현재 작업 수와 접수 마감 구간만 표시합니다.", "schedule_stat1_label": "기준일", "schedule_stat1_value": "", "schedule_stat2_label": "패키지 작업 접수 마감 구간", "schedule_stat2_value": "08.10–09.16", "schedule_stat3_label": "닐로툰 · 뚜따 접수 마감 구간", "schedule_stat3_value": "08.10–08.27", "schedule_year": "2026", "schedule_month": "8", "schedule_tab1": "패키지 작업", "schedule_tab2": "닐로툰 & 뚜따", "schedule_upcoming_title": "9월 이어지는 일정", "schedule_upcoming": "09.02 대기 1건\n09.07 대기 1건\n09.16까지 접수 마감", "schedule_note": "매주 일요일은 정기 휴일입니다. 실제 신청 가능일은 상담 시 최종 확인해주세요. 고객명과 작업명은 개인정보 보호를 위해 표시하지 않습니다.", "shop_kicker": "Original Model Shop", "shop_title": "Personal Works", "shop_lead": "INAB가 직접 제작한 개인작 판매 소식을 이곳에서 안내합니다.", "shop_empty_eyebrow": "Coming Soon", "shop_empty_title": "개인작을 준비 중입니다.", "shop_empty_copy": "현재 판매 중인 개인작은 없습니다. 완성된 모델 또는 베이스 판매가 시작되면 상품 구성과 수령 방식, 수정 가능 범위를 함께 안내할 예정입니다.", "shop_empty_btn1_label": "포트폴리오 보기", "shop_empty_btn1_url": "portfolio.html", "shop_empty_btn2_label": "개인작 FAQ", "shop_empty_btn2_url": "faq.html", "faq_kicker": "FAQ", "faq_title": "Frequently Asked Questions", "faq_lead": "자주 묻는 내용을 검색하고 펼쳐볼 수 있습니다.", "faq_placeholder": "궁금한 내용을 검색해보세요. 예: 페이셜, Unity, 닐로툰", "theme_violet": "#8d6dca", "theme_deep": "#65469f", "theme_action": "#7455ad", "theme_pale": "#eee8f7", "theme_pale2": "#f7f2fb", "theme_paper": "#fcfafc", "theme_line": "#e6dfec", "theme_ink": "#24222a", "theme_body": "#615b67", "theme_footer": "#272631", "fs_display": "1", "fs_title": "1", "fs_body": "1", "fs_label": "1"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- portfolio_items 예시 자료 (표가 비어 있을 때만)
INSERT INTO portfolio_items (title, meta, description, image_url, tag, anchor, fit, focus_x, focus_y, featured, sort_order)
SELECT * FROM (VALUES
  ('일러기반 성형', 'Illustration Based', '일러스트의 인상과 비율을 3D 헤드에 옮겨, 원화의 분위기를 살리는 커스텀 성형 작업입니다.', 'assets/images/work-illustration.webp', 'sculpt', 'sculpt', 'cover', 50, 44, TRUE, 10),
  ('페이셜', 'Facial', 'Face ID 기반 표정 추적을 위해 52종의 쉐이프키를 구성하고 자연스러운 감정 변화를 다듬습니다.', 'assets/images/work-facial.webp', 'facial', 'facial', 'cover', 50, 40, TRUE, 20),
  ('오리지널 모델 페이셜', 'Original Facial', '오리지널 모델의 고유한 인상을 유지하며 눈·입·볼의 움직임이 자연스럽게 이어지도록 설계합니다.', 'assets/images/work-original-facial.webp', 'facial', 'original-facial', 'cover', 50, 40, FALSE, 30),
  ('뽀잉눈 / 웃는눈', 'Expression', '캐릭터의 성격을 선명하게 보여주는 뽀잉눈과 웃는눈 표현을 페이셜 흐름에 맞춰 연결합니다.', 'assets/images/work-poying.webp', 'facial', 'poying', 'cover', 50, 40, FALSE, 40),
  ('멜리고 닐로툰', 'Meligo · NiloToon', '멜리고 환경에서 닐로툰의 빛과 색이 안정적으로 보이도록 셰이더와 재질을 세팅합니다.', 'assets/images/work-meligo.webp', 'nilo', 'meligo', 'cover', 50, 45, TRUE, 50),
  ('와루도 닐로툰', 'Warudo Pro · NiloToon', 'Warudo Pro 환경에 맞춰 닐로툰 컨버팅과 표현을 조정해 방송 화면의 완성도를 높입니다.', 'assets/images/work-warudo.webp', 'nilo', 'warudo', 'cover', 50, 45, FALSE, 60),
  ('헤어조합', 'Hair Combination', '여러 헤어 파츠를 한 디자인처럼 연결하고 실루엣과 앞·옆·뒤 균형을 세심하게 정리합니다.', 'assets/images/work-hair.webp', 'styling', 'hair', 'cover', 50, 38, TRUE, 70),
  ('마지카 클로즈2', 'Magica Cloth 2', '머리카락과 의상 파츠의 움직임을 Magica Cloth 2 환경에 맞게 자연스럽게 세팅합니다.', 'assets/images/work-magica.webp', 'styling', 'magica', 'contain', 50, 35, TRUE, 80),
  ('헤어 브릿지 · 그라데이션', 'Texture Styling', '캐릭터 팔레트에 맞춘 브릿지와 그라데이션으로 헤어의 포인트와 깊이를 더합니다.', 'assets/images/work-gradient.webp', 'styling', 'gradient', 'cover', 50, 42, FALSE, 90)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM portfolio_items);


-- collab_artists 예시 자료 (표가 비어 있을 때만)
INSERT INTO collab_artists (name, description, image_url, link_url, link_label, sort_order)
SELECT * FROM (VALUES
  ('WOOMA', '우마 작가님의 헤드 디자인(일러)과 안구 PSD로 일러기반 성형+페이셜 또는 일러 기반 패키지 신청 시 3만원 할인됩니다.', 'assets/images/collab-wooma.webp', 'https://artmug.kr/index.php?channel=view&uid=47269', '아트머그 페이지', 10),
  ('하요', '멜리고 닐로툰 컨버팅 신청 후 하요 작가님께 배경 세팅을 신청하면 5천원 할인됩니다.', 'assets/images/collab-hayo.webp', 'https://artmug.kr/index.php?channel=view&uid=56445', '아트머그 페이지', 20),
  ('은유', '은유 작가님의 헤드 디자인(일러)과 안구 PSD로 일러기반 성형+페이셜 또는 일러 기반 패키지 신청 시 3만원 할인됩니다.', 'assets/images/collab-eunyu.webp', 'https://artmug.kr/index.php?channel=view&uid=59292', '아트머그 페이지', 30)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM collab_artists);


-- price_packages 예시 자료 (표가 비어 있을 때만)
INSERT INTO price_packages (type_label, title, price_before, price, features, tag, sort_order)
SELECT * FROM (VALUES
  ('Standard', 'VSF 데뷔', '600,000원', '550,000원', '의상 1 · 헤어 1 · 악세사리 2
커스텀 오마카세 성형
페이셜 · 뽀잉눈
표정 효과 4종 · 복잡 텍스처 1종
피부톤 · Spring Bone', 'standard', 10),
  ('Standard', 'Warudo 데뷔', '650,000원', '600,000원', '의상 1 · 헤어 1 · 악세사리 2
커스텀 오마카세 성형
페이셜 · 뽀잉눈
표정 효과 4종 · 복잡 텍스처 1종
방송 장면 · 카메라 · 캘리브레이션', 'standard', 20),
  ('NiloToon', 'Meligo 닐로툰 데뷔', '750,000원', '700,000원', '의상 1 · 헤어 1
커스텀 오마카세 성형
페이셜 · 뽀잉눈
표정 효과 4종 · 복잡 텍스처 1종
NiloToon 셰이더 세팅', 'standard', 30),
  ('NiloToon', 'Warudo Pro(닐로툰) 데뷔', '800,000원', '750,000원', '의상 1 · 헤어 1
커스텀 오마카세 성형
페이셜 · 뽀잉눈
표정 효과 4종 · 복잡 텍스처 1종
NiloToon · Warudo Pro 세팅', 'standard', 40),
  ('Illustration Based', '일러기반 VSF', '700,000원', '650,000원', '일러기반 커스텀 성형
의상 1 · 헤어 1 · 악세사리 2
페이셜 · 뽀잉눈
표정 효과 4종 · 복잡 텍스처 1종
피부톤 · Spring Bone', 'illustration', 50),
  ('Illustration Based', '일러기반 Warudo', '750,000원', '700,000원', '일러기반 커스텀 성형
의상 1 · 헤어 1 · 악세사리 2
페이셜 · 뽀잉눈
표정 효과 4종 · 복잡 텍스처 1종
방송 장면 · 카메라 · 캘리브레이션', 'illustration', 60),
  ('Illustration · NiloToon', '일러기반 Meligo 닐로툰', '850,000원', '800,000원', '일러기반 커스텀 성형
의상 1 · 헤어 1
페이셜 · 뽀잉눈
표정 효과 4종 · 복잡 텍스처 1종
NiloToon 셰이더 세팅', 'illustration', 70),
  ('Illustration · NiloToon', '일러기반 Warudo Pro(닐로툰)', '900,000원', '850,000원', '일러기반 커스텀 성형
의상 1 · 헤어 1
페이셜 · 뽀잉눈
표정 효과 4종 · 복잡 텍스처 1종
NiloToon · Warudo Pro 세팅', 'illustration', 80)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM price_packages);


-- price_options 예시 자료 (표가 비어 있을 때만)
INSERT INTO price_options (name, amount, note, sort_order)
SELECT * FROM (VALUES
  ('Unity 파일', '+50,000원', '헤드·바디 FBX/VRM과 텍스처 기준. 유료 파츠·본 세팅 등은 제외됩니다.', 10),
  ('헤드 교체', '+30,000원', '헤드와 바디를 서로 다른 베이스로 구성할 때 적용됩니다.', 20),
  ('후기 이벤트', '-3,000원', '참여 조건은 신청 시 최신 안내를 확인해주세요.', 30),
  ('빠른 마감 · 비공개 · 추가 수정', '상담 후 안내', '작업 범위와 일정에 따라 가능 여부와 금액이 달라집니다.', 40)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM price_options);


-- commission_steps 예시 자료 (표가 비어 있을 때만)
INSERT INTO commission_steps (title, sort_order)
SELECT * FROM (VALUES
  ('문의 및 상담', 10),
  ('주문 및 입금', 20),
  ('성형 작업', 30),
  ('1차 컨펌', 40),
  ('페이셜 작업', 50),
  ('2차 컨펌', 60),
  ('파츠 구매 인증', 70),
  ('3차 컨펌', 80),
  ('완성본 전달', 90)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM commission_steps);


-- commission_notices 예시 자료 (표가 비어 있을 때만)
INSERT INTO commission_notices (title, content, sort_order)
SELECT * FROM (VALUES
  ('작업 기간', '기본 작업은 2주~한 달, 일러기반 작업은 2주~최대 한 달을 기준으로 합니다. 작업 범위와 일정에 따라 달라질 수 있습니다.', 10),
  ('원본 파일', '요청 시 FBX와 텍스처를 전달할 수 있습니다. 대머리·기본 속옷 상태의 헤드와 바디만 포함되며 유료 파츠는 포함되지 않습니다.', 20),
  ('Booth 파츠', 'Booth 기반 커미션으로 신청자와 작가 모두 유료 아바타·파츠를 보유해야 합니다. 작가가 보유하지 않은 상품은 신청자가 구매합니다.', 30),
  ('라이선스 확인', '재배포, 상업 이용, 2차 가공 가능 여부 등 각 상품의 이용 약관은 신청자가 직접 확인해 주세요.', 40),
  ('Unity 패키지', 'FBX/VRM, 추가한 경우의 눈동자 애니메이션, 텍스처만 포함합니다. 본·그림자·NiloToon·Magica·Booth 파츠는 제외됩니다.', 50),
  ('상업 이용', '방송·수익화 등 상업 이용에 필요한 권한 확인과 허가는 신청자 책임입니다.', 60),
  ('파일 보관', '작업 파일은 전달 후 최대 한 달 보관합니다. 보관 기간이 지난 뒤에는 재전달이 어려울 수 있습니다.', 70),
  ('파일 공유', 'Unity 패키지는 본인의 의상 추가 용도로만 사용할 수 있습니다. 사전 허락 없이 다른 작가나 제3자에게 전달할 수 없습니다.', 80),
  ('포트폴리오', '완성 작업은 포트폴리오로 공개될 수 있습니다. 비공개가 필요하다면 신청 단계에서 별도로 선택해 주세요.', 90),
  ('기기·계정 조건', '페이셜은 Face ID 지원 아이폰·아이패드가 필요합니다. VRChat 업로드는 New User 등급 이상이어야 하며 VRChat 페이셜은 진행하지 않습니다.', 100),
  ('멜리고 안내', 'Unity 파일을 받더라도 멜리고 웃는눈 작동용 애니메이션 파일은 포함되지 않습니다. 웃는눈 전환 쉐이프키만 포함됩니다.', 110),
  ('약관 변경', '안내와 조건은 작업 환경에 따라 변경될 수 있으니 신청 직전 최신 내용을 다시 확인해 주세요.', 120)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM commission_notices);


-- inquiry_forms 예시 자료 (표가 비어 있을 때만)
INSERT INTO inquiry_forms (tab_label, form_title, fields, note, sort_order)
SELECT * FROM (VALUES
  ('기본 문의', '기본 문의', '0. 작업 일정 확인 | select | | 예;아니요;상담 필요
1. 안내사항 확인 | select | | 예;아니요;상담 필요
2. 포트폴리오 공개 여부 | text | 공개 / 일정 기간 비공개 / 완전 비공개
3. 신청 작업 | text | 예: 멜리고 닐로툰 데뷔 패키지
4. 방송 정보 | textarea | 활동명, 플랫폼, 데뷔 예정일 등
5. Booth 아바타·파츠 링크 | textarea | 구매 예정 상품까지 모두 적어주세요.
5-1. 색상·첨부 이미지 설명 | textarea | 첨부할 파일명과 적용 위치를 함께 적어주세요.
5-2. 참고 이미지 선택 | file | 선택한 이미지는 이 페이지에서 전송되지 않으며, 복사문에는 파일명만 들어갑니다. 실제 문의 시 파일을 별도로 첨부해주세요.
6. 레퍼런스·아바타 설명 | textarea
7. 페이셜 요청 | textarea | 원하는 표정, 효과, 참고 영상 등을 적어주세요.
8. Unity 파일 필요 여부 (+50,000원) | select | | 예;아니요;상담 필요
9. Unity 파일 사용 목적 | text
10. 후기 이벤트 참여 여부 (-3,000원) | select | | 예;아니요;상담 필요
11. 기타 요청 | textarea', '이 페이지는 문의 내용을 정리하고 복사하는 도구입니다. 복사한 내용을 현재 사용 중인 문의 채널에 붙여넣어 주세요.', 10),
  ('뚜따만 문의', '뚜따만 문의', '기존 신청·작업 이력 | textarea
신청 작업 | text
포트폴리오 공개 여부 | text
베이스·파츠 링크 | textarea
색상·첨부 이미지 설명 | textarea
참고 이미지 선택 | file | 선택한 이미지는 이 페이지에서 전송되지 않으며, 복사문에는 파일명만 들어갑니다. 실제 문의 시 파일을 별도로 첨부해주세요.
파츠 구매 인증 상태 | text
기타 요청 | textarea', '이 페이지는 문의 내용을 정리하고 복사하는 도구입니다. 복사한 내용을 현재 사용 중인 문의 채널에 붙여넣어 주세요.', 20),
  ('닐로툰 컨버팅', '닐로툰 컨버팅 문의', '신청 작업 | text
포트폴리오 공개 여부 | text
방송 정보·보유 파일 | textarea
베이스·파츠 링크 | textarea
물리 세팅 방식 | text | Magica Cloth 2 / Spring Bone
파츠 구매 인증 상태 | text
색상·첨부 이미지 설명 | textarea
참고 이미지 선택 | file | 선택한 이미지는 이 페이지에서 전송되지 않으며, 복사문에는 파일명만 들어갑니다. 실제 문의 시 파일을 별도로 첨부해주세요.
후기 이벤트 참여 여부 | select | | 예;아니요;상담 필요
희망 마감 | text | 기본 2주 기준
기타 요청 | textarea', '이 페이지는 문의 내용을 정리하고 복사하는 도구입니다. 복사한 내용을 현재 사용 중인 문의 채널에 붙여넣어 주세요.', 30)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM inquiry_forms);


-- faq_items 예시 자료 (표가 비어 있을 때만)
INSERT INTO faq_items (question, answer, sort_order)
SELECT * FROM (VALUES
  ('유니티 패키지 파일에 동봉되는 파일이 뭔가요?', 'FBX / VRM(헤드, 바디만 있는 버전) / 눈동자 일렁거림 애니메이션 파일(추가 시에만) / 텍스처가 포함됩니다.

본 세팅, 그림자, 파츠(옷, 헤어, 악세사리 등)는 포함되지 않습니다. 즉, 대머리와 기본 속옷 상태의 아바타 파일만 있습니다.

멜리고는 웃는눈으로 전환되는 쉐이프키는 있지만, 멜리고 안에서 웃는눈을 작동하게 하는 애니메이션 파일은 포함되지 않습니다.', 10),
  ('페이셜이 뭔가요?', 'Face ID가 있는 아이폰 또는 아이패드로 얼굴을 추적해 다양한 표정을 직접 지을 수 있게 하는 작업입니다. 블렌더에서 총 52가지 쉐이프키를 추가합니다.', 20),
  ('표정 효과란 무엇인가요?', '페이셜 옵션의 별 눈, 하얀 눈, 얼굴 그림자, 홍조, 눈물 등을 말합니다. 기존 베이스에 있는 효과만 연동할 수 있으며, 얼굴 악세사리도 자연스럽게 움직이려면 함께 추가해야 합니다.', 30),
  ('닐로툰이 뭔가요?', 'NiloToon은 URP 환경에서 사용하는 셰이더입니다. 닐로 블룸과 포스트 프로세싱을 활용해 화면을 더 풍부하게 표현할 수 있습니다. Meligo(무료) 또는 Warudo Pro(유료)에서 사용할 수 있으며, 처음이라면 한국어 환경인 Meligo를 많이 추천드립니다.', 40),
  ('눈동자 일렁거림이나 귀·꼬리 애니메이션만 신청 가능한가요?', '눈동자 일렁거림만 별도로 추가하는 작업은 완성 파일 구조와 Unity 패키지가 필요해 받지 않고 있습니다. 눈을 감을 때 귀가 내려가거나 크게 뜰 때 귀가 쫑긋하는 페이셜 연동, 꼬리가 살랑거리는 애니메이션은 작업 가능합니다.', 50),
  ('3D 버추얼이 처음인데 신청 가능한가요?', '당연히 가능합니다! 상담을 통해 차근차근 도와드리고 있습니다. 3D 버추얼이 처음이라면 필요한 구성이 포함된 패키지를 추천드립니다.', 60),
  ('베이스를 고르는 기준이 뭔가요?', '대부분 얼굴 인상을 기준으로 선택합니다. 얼굴 A와 바디 B 조합도 헤드 교체로 가능하지만 아바타 두 개의 구매 비용이 필요합니다. 전용 의상 수가 적은 베이스라면 바디를 다른 베이스로 선택했을 때 이후 의상 비용을 줄일 수 있으니 장단점을 함께 고려해주세요.', 70),
  ('헤드와 바디를 각각 다른 베이스로 할 수 있나요?', '가능합니다. 기타 옵션에서 헤드 교체 옵션을 추가해주세요. 추가 금액 30,000원이 발생합니다.', 80),
  ('사용하던 파츠가 Booth에 없으면 어떻게 하나요?', '비슷한 다른 파츠를 Booth에서 찾거나, 판매가 종료된 파츠의 제작자에게 직접 연락해 사용 허락을 받아오셔야 합니다.', 90),
  ('눈동자 하이라이트나 머리 모양을 변경할 수 있나요?', '가능합니다. 다만 추가·수정 범위에 따라 가능 여부와 추가 금액이 달라지므로 상담에서 레퍼런스를 함께 보여주세요.', 100),
  ('작가 개인작 구매란 무엇인가요?', '작가가 개인적으로 만든 작업물을 구매하는 옵션입니다. 완성 모델은 VSF 파일 또는 VRC 업로드 형태로 받을 수 있고, 추가 수정은 별도 금액으로 가능합니다.

베이스만 구매 가능한 경우에는 의상 1개, 헤어 1개, 악세사리 2개를 더해 완성 작업물로 받을 수 있습니다. 성형과 페이셜 작업을 건너뛰므로 취향에 맞는 아바타가 있다면 더 빠르게 받을 수 있습니다.', 110)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM faq_items);


-- schedule_events 예시 자료 (표가 비어 있을 때만)
INSERT INTO schedule_events (calendar, event_date, kind, label)
SELECT * FROM (VALUES
  ('package', '2026-08-02'::date, 'holiday', '정기 휴일'),
  ('package', '2026-08-03'::date, 'holiday', '휴가'),
  ('package', '2026-08-04'::date, 'holiday', '휴가'),
  ('package', '2026-08-05'::date, 'holiday', '휴가'),
  ('package', '2026-08-06'::date, 'holiday', '휴가'),
  ('package', '2026-08-07'::date, 'holiday', '휴가'),
  ('package', '2026-08-08'::date, 'holiday', '휴가'),
  ('package', '2026-08-09'::date, 'holiday', '휴가 · 정기 휴일'),
  ('package', '2026-08-10'::date, 'closed', '접수 마감 시작'),
  ('package', '2026-08-10'::date, 'working', '진행 1건'),
  ('package', '2026-08-16'::date, 'holiday', '정기 휴일'),
  ('package', '2026-08-17'::date, 'waiting', '대기 1건'),
  ('package', '2026-08-23'::date, 'holiday', '정기 휴일'),
  ('package', '2026-08-23'::date, 'waiting', '대기 1건'),
  ('package', '2026-08-30'::date, 'holiday', '정기 휴일'),
  ('nilo', '2026-08-02'::date, 'holiday', '정기 휴일'),
  ('nilo', '2026-08-03'::date, 'holiday', '휴가'),
  ('nilo', '2026-08-04'::date, 'holiday', '휴가'),
  ('nilo', '2026-08-05'::date, 'holiday', '휴가'),
  ('nilo', '2026-08-06'::date, 'holiday', '휴가'),
  ('nilo', '2026-08-07'::date, 'holiday', '휴가'),
  ('nilo', '2026-08-08'::date, 'holiday', '휴가'),
  ('nilo', '2026-08-09'::date, 'holiday', '휴가 · 정기 휴일'),
  ('nilo', '2026-08-10'::date, 'closed', '접수 마감 시작'),
  ('nilo', '2026-08-10'::date, 'working', '진행 2건'),
  ('nilo', '2026-08-11'::date, 'working', '진행 3건'),
  ('nilo', '2026-08-12'::date, 'waiting', '대기 1건'),
  ('nilo', '2026-08-13'::date, 'waiting', '대기 1건'),
  ('nilo', '2026-08-14'::date, 'waiting', '대기 2건'),
  ('nilo', '2026-08-15'::date, 'waiting', '대기 1건'),
  ('nilo', '2026-08-16'::date, 'holiday', '정기 휴일'),
  ('nilo', '2026-08-17'::date, 'waiting', '대기 3건'),
  ('nilo', '2026-08-20'::date, 'waiting', '대기 1건'),
  ('nilo', '2026-08-23'::date, 'holiday', '정기 휴일'),
  ('nilo', '2026-08-24'::date, 'waiting', '대기 1건'),
  ('nilo', '2026-08-30'::date, 'holiday', '정기 휴일')
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM schedule_events);
