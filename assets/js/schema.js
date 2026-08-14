/* Single source of truth for editable content.
   admin builds its inputs from this file, pages read the same keys through
   data-c hooks. Adding a key here is the only edit needed on the admin side. */

const PAGES = [
  { slug: 'home', file: 'index.html', label: '메인' },
  { slug: 'profile', file: 'profile.html', label: '작가 프로필' },
  { slug: 'portfolio', file: 'portfolio.html', label: '포트폴리오' },
  { slug: 'commission', file: 'commission.html', label: '커미션 안내' },
  { slug: 'pricing', file: 'pricing.html', label: '가격 안내' },
  { slug: 'schedule', file: 'schedule.html', label: '작업 일정' },
  { slug: 'shop', file: 'shop.html', label: '개인작 판매' },
  { slug: 'faq', file: 'faq.html', label: '자주묻는질문 FAQ' }
];

const COLLECTIONS = {
  portfolio_items: {
    label: '포트폴리오 작업',
    where: '포트폴리오 페이지 카드 + 메인 Selected Works + 상단 메뉴 하위 목록',
    order: 'sort_order',
    fields: [
      { key: 'title', label: '작업명', type: 'text', help: '카드 제목. 상단 메뉴 하위 목록에도 같은 이름이 들어갑니다', width: 'half' },
      { key: 'meta', label: '영문 라벨', type: 'text', help: '제목 위 작은 글씨. 예: Illustration Based', width: 'half' },
      { key: 'description', label: '설명', type: 'textarea', help: '카드 본문과 확대 화면에 같이 쓰입니다. 2~3줄 권장' },
      { key: 'image_url', label: '이미지 주소', type: 'image', help: '포트폴리오 카드와 확대 화면에 쓰이는 작업 사진', spec: '권장 1200×900 (가로 4:3) · 세로로 긴 사진은 아래 “카드 표시 방식”을 전체 보기로', ratio: '4 / 3' },
      { key: 'tag', label: '분류', type: 'text', help: '아래 분류 목록의 영문 값과 같게. 예: sculpt / facial / nilo / styling', width: 'half' },
      { key: 'anchor', label: '앵커 아이디', type: 'text', help: '메뉴에서 이 카드로 바로 가는 주소. 영문 소문자·하이픈. 예: original-facial', width: 'half' },
      { key: 'fit', label: '카드 표시 방식', type: 'select', options: [['cover', '꽉 채우기 (잘림)'], ['contain', '전체 보기 (여백은 흐린 배경)']], help: '세로로 긴 사진은 전체 보기를 쓰면 잘리지 않습니다', width: 'half' },
      { key: 'featured', label: '메인에 노출', type: 'checkbox', help: '메인 Selected Works 줄에 표시. 앞에서부터 5개까지', width: 'half' },
      { key: 'focus_x', label: '초점 가로 %', type: 'number', help: '꽉 채우기일 때 보일 지점. 0=왼쪽 50=가운데 100=오른쪽', width: 'half' },
      { key: 'focus_y', label: '초점 세로 %', type: 'number', help: '0=위 50=가운데 100=아래. 얼굴이 잘리면 값을 줄이세요', width: 'half' },
      { key: 'sort_order', label: '순서', type: 'number', help: '작은 값이 먼저. 10 단위로 띄우면 나중에 끼워 넣기 쉽습니다', width: 'half' }
    ]
  },
  collab_artists: {
    label: '협업 작가',
    where: '작가 프로필 페이지 하단',
    order: 'sort_order',
    fields: [
      { key: 'name', label: '작가명', type: 'text', width: 'half', help: '카드 제목' },
      { key: 'link_url', label: '링크 주소', type: 'text', width: 'half', help: '아트머그 등 작가 페이지 주소' },
      { key: 'link_label', label: '링크 문구', type: 'text', width: 'half', help: '비우면 "아트머그 페이지"' },
      { key: 'sort_order', label: '순서', type: 'number', width: 'half', help: '작은 값이 먼저' },
      { key: 'description', label: '혜택 설명', type: 'textarea', help: '할인 조건을 한 문단으로' },
      { key: 'image_url', label: '이미지 주소', type: 'image', help: '협업 작가 카드 위쪽 이미지', spec: '권장 816×459 (가로 16:9) · 이 비율로 잘립니다', ratio: '16 / 9' }
    ]
  },
  price_packages: {
    label: '데뷔 패키지',
    where: '가격 안내 페이지 카드',
    order: 'sort_order',
    fields: [
      { key: 'title', label: '패키지명', type: 'text', width: 'half', help: '예: VSF 데뷔' },
      { key: 'type_label', label: '상단 라벨', type: 'text', width: 'half', help: '카드 맨 위 작은 글씨. 예: Standard' },
      { key: 'price_before', label: '기존 가격', type: 'text', width: 'half', help: '취소선으로 표시. 없으면 비워두세요. 예: 600,000원' },
      { key: 'price', label: '판매 가격', type: 'text', width: 'half', help: '예: 550,000원' },
      { key: 'tag', label: '분류', type: 'text', width: 'half', help: '아래 분류 목록의 영문 값. 예: standard / illustration' },
      { key: 'sort_order', label: '순서', type: 'number', width: 'half', help: '작은 값이 먼저' },
      { key: 'features', label: '포함 내용', type: 'textarea', help: '한 줄에 하나씩. 줄 수 제한 없음' }
    ]
  },
  price_options: {
    label: '추가 옵션',
    where: '가격 안내 페이지 표',
    order: 'sort_order',
    fields: [
      { key: 'group_label', label: '묶음 이름', type: 'text', width: 'half', help: '같은 이름끼리 표 안에서 소제목으로 묶입니다. 예: 닐로툰 / 마지카 클로즈2. 비우면 묶음 없이 맨 위에 나옵니다' },
      { key: 'name', label: '옵션명', type: 'text', width: 'half', help: '표 첫 칸' },
      { key: 'amount', label: '추가 금액', type: 'text', width: 'half', help: '예: +50,000원 / -3,000원 / 상담 후 안내' },
      { key: 'note', label: '안내', type: 'textarea', help: '표 마지막 칸 설명' },
      { key: 'sort_order', label: '순서', type: 'number', width: 'half', help: '작은 값이 먼저. 같은 묶음끼리 이어지도록 번호를 매기세요' }
    ]
  },
  commission_steps: {
    label: '진행 과정',
    where: '커미션 안내 페이지 번호 목록',
    order: 'sort_order',
    fields: [
      { key: 'title', label: '단계 이름', type: 'text', width: 'half', help: '번호는 순서대로 자동으로 붙습니다' },
      { key: 'sort_order', label: '순서', type: 'number', width: 'half', help: '작은 값이 먼저' }
    ]
  },
  commission_notices: {
    label: '신청 전 안내사항',
    where: '커미션 안내 페이지 번호 카드',
    order: 'sort_order',
    fields: [
      { key: 'title', label: '항목명', type: 'text', width: 'half', help: '카드 제목' },
      { key: 'sort_order', label: '순서', type: 'number', width: 'half', help: '번호는 순서대로 자동으로 붙습니다' },
      { key: 'content', label: '내용', type: 'textarea', help: '한 문단으로' }
    ]
  },
  inquiry_forms: {
    label: '문의서 양식',
    where: '커미션 안내 페이지 문의서 탭',
    order: 'sort_order',
    fields: [
      { key: 'tab_label', label: '탭 이름', type: 'text', width: 'half', help: '예: 기본 문의' },
      { key: 'form_title', label: '복사문 제목', type: 'text', width: 'half', help: '복사한 글 첫 줄에 [INAB 제목] 형태로 들어갑니다' },
      {
        key: 'fields', label: '질문 목록', type: 'textarea', rows: 10,
        help: '한 줄에 질문 하나. 형식 = 라벨 | 종류 | 도움말 | 선택지;선택지  ·  종류 = text(한 줄) / textarea(여러 줄) / select(고르기) / file(파일 선택)  ·  뒤 두 칸은 생략 가능  ·  예) 1. 안내사항 확인 | select | | 예;아니요;상담 필요'
      },
      { key: 'note', label: '하단 안내문', type: 'textarea', help: '양식 아래 회색 안내 문구' },
      { key: 'sort_order', label: '순서', type: 'number', width: 'half', help: '작은 값이 왼쪽 탭' }
    ]
  },
  faq_items: {
    label: 'FAQ',
    where: 'FAQ 페이지 목록',
    order: 'sort_order',
    fields: [
      { key: 'question', label: '질문', type: 'text', help: '접힌 상태에서 보이는 줄' },
      { key: 'answer', label: '답변', type: 'textarea', rows: 6, help: '줄바꿈 그대로 반영. 빈 줄로 문단을 나눌 수 있습니다' },
      { key: 'sort_order', label: '순서', type: 'number', width: 'half', help: '작은 값이 먼저' }
    ]
  },
  schedule_events: {
    label: '일정',
    where: '작업 일정 페이지 달력',
    order: 'event_date',
    asc: true,
    fields: [
      { key: 'event_date', label: '날짜', type: 'date', width: 'half', help: '형식 YYYY-MM-DD' },
      { key: 'calendar', label: '달력', type: 'select', width: 'half', options: [['package', '패키지 작업'], ['nilo', '닐로툰 & 뚜따']], help: '어느 탭의 달력에 표시할지' },
      { key: 'kind', label: '종류', type: 'select', width: 'half', options: [['holiday', '휴일'], ['closed', '마감'], ['waiting', '대기'], ['working', '진행'], ['done', '완료']], help: '색이 달라집니다. 범례와 같은 순서' },
      { key: 'label', label: '표시 문구', type: 'text', width: 'half', help: '칸에 들어갈 짧은 글. 예: 대기 1건 / 정기 휴일' }
    ]
  },
  shop_items: {
    label: '개인작 상품',
    where: '개인작 판매 페이지 (한 개도 없으면 준비 중 화면이 대신 나옵니다)',
    order: 'sort_order',
    fields: [
      { key: 'title', label: '상품명', type: 'text', width: 'half', help: '카드 제목' },
      { key: 'price', label: '가격', type: 'text', width: 'half', help: '예: 350,000원 / 상담 후 안내' },
      { key: 'status', label: '상태 배지', type: 'text', width: 'half', help: '이미지 위 배지. 예: 판매중 / 예약 / 완료. 비우면 배지 없음' },
      { key: 'sort_order', label: '순서', type: 'number', width: 'half', help: '작은 값이 먼저' },
      { key: 'description', label: '설명', type: 'textarea', help: '구성·수정 범위 등' },
      { key: 'image_url', label: '이미지 주소', type: 'image', help: '개인작 카드 사진', spec: '권장 900×1200 (세로 3:4) · 이 비율로 잘립니다', ratio: '3 / 4' },
      { key: 'link_url', label: '링크 주소', type: 'text', width: 'half', help: '구매·문의로 이동할 주소. 비우면 링크 없음' },
      { key: 'link_label', label: '링크 문구', type: 'text', width: 'half', help: '비우면 "자세히 보기"' }
    ]
  }
};

const CONTENT_TABS = [
  {
    id: 'common', label: '🔗 공통',
    cards: [
      {
        title: '사이트 기본', where: '전 페이지 상단·하단',
        fields: [
          { key: 'site_brand', label: '로고 글자', type: 'text', width: 'half', help: '헤더 왼쪽과 푸터에 쓰이는 이름' },
          { key: 'site_name', label: '사이트 이름', type: 'text', width: 'half', help: '브라우저 탭 제목 뒤에 붙습니다. 예: INAB' },
          { key: 'footer_copy', label: '푸터 문구', type: 'text', help: '연도는 자동으로 올해가 들어갑니다. {year} 라고 적은 자리에 표시' }
        ]
      },
      {
        title: '장식 이미지 · 탭 아이콘', where: '전 페이지에 공통으로 들어가는 나비 장식과 브라우저 탭 아이콘',
        fields: [
          { key: 'img_butterfly_small', label: '메인 첫 화면 나비', type: 'image', help: '메인 맨 위 제목 옆에 떠 있는 나비. 큰 것과 작은 것 두 마리에 같은 그림이 쓰입니다', spec: '배경이 투명한 PNG · WEBP 권장 · 권장 600×526 · 비율은 자유(원본 비율 유지)', ratio: '600 / 526', fallback: 'assets/images/butterfly-small.webp' },
          { key: 'img_butterfly_hero', label: '하위 페이지 상단 나비', type: 'image', help: '작가 프로필·포트폴리오 등 각 페이지 제목 오른쪽에 크게 들어가는 나비', spec: '배경이 투명한 PNG · WEBP 권장 · 권장 962×1040 (세로형) · 비율은 자유', ratio: '962 / 1040', fallback: 'assets/images/butterfly-hero.webp' },
          { key: 'img_butterfly_watermark', label: '연한 워터마크 나비', type: 'image', help: '메인 하단 Contact 칸과 개인작 준비 중 화면 구석에 옅게 깔리는 그림', spec: '배경이 투명한 PNG · WEBP 권장 · 권장 876×880 · 연한 색일수록 자연스럽습니다', ratio: '1 / 1', fallback: 'assets/images/butterfly-watermark.webp' },
          { key: 'img_favicon', label: '브라우저 탭 아이콘', type: 'image', help: '인터넷 창 탭과 즐겨찾기에 뜨는 작은 아이콘', spec: '정사각 32×32 이상 (64×64 권장) · PNG · SVG · 아주 작게 보이므로 단순한 그림이 좋습니다', ratio: '1 / 1', fallback: 'assets/images/favicon.svg' }
        ]
      },
      {
        title: '상단 메뉴 이름', where: '전 페이지 헤더 · 포트폴리오 하위 목록은 작업 목록에서 자동 생성',
        fields: PAGES.filter(p => p.slug !== 'home').map(p => (
          { key: 'nav_' + p.slug, label: p.label, type: 'text', width: 'half', help: '메뉴에 보일 이름' }
        ))
      },
      {
        title: '푸터 링크', where: '전 페이지 하단 오른쪽',
        fields: [
          { key: 'footer_l1_label', label: '1번 문구', type: 'text', width: 'half', help: '비우면 링크가 빠집니다' },
          { key: 'footer_l1_url', label: '1번 주소', type: 'text', width: 'half', help: '같은 사이트 안이면 파일명만. 예: commission.html#inquiry' },
          { key: 'footer_l2_label', label: '2번 문구', type: 'text', width: 'half', help: '비우면 링크가 빠집니다' },
          { key: 'footer_l2_url', label: '2번 주소', type: 'text', width: 'half', help: '같은 사이트 안이면 파일명만. 예: pricing.html' },
          { key: 'footer_l3_label', label: '3번 문구', type: 'text', width: 'half', help: '비우면 링크가 빠집니다' },
          { key: 'footer_l3_url', label: '3번 주소', type: 'text', width: 'half', help: '같은 사이트 안이면 파일명만. 예: faq.html' }
        ]
      },
      {
        title: '검색 정보 (SEO)', where: '검색 결과·공유 미리보기. 화면에는 안 보입니다',
        fields: [
          { key: 'seo_image', label: '공유 미리보기 이미지', type: 'image', help: '디스코드·X에 주소를 붙였을 때 뜨는 사진. 비우면 메인 첫 화면 사진이 쓰입니다', spec: '권장 1200×630 (가로 1.91:1) · JPG/PNG/WEBP', ratio: '1200 / 630', fallback: 'assets/images/hero.webp' }
        ].concat(PAGES.flatMap(p => ([
          { key: 'seo_' + p.slug + '_title', label: p.label + ' 탭 제목', type: 'text', width: 'half', help: '브라우저 탭에 보이는 글' },
          { key: 'seo_' + p.slug + '_desc', label: p.label + ' 설명', type: 'text', width: 'half', help: '검색 결과 아래 설명. 80자 안팎' }
        ])))
      }
    ]
  },
  {
    id: 'home', label: '🏠 메인',
    cards: [
      {
        title: '첫 화면', where: '메인 최상단',
        fields: [
          { key: 'home_hero_image', label: '배경 사진', type: 'image', help: '메인 첫 화면을 덮는 큰 사진. 오른쪽 절반에 인물이 오도록 찍힌 가로 사진이 잘 맞습니다', spec: '권장 1800×1013 (가로 16:9) · 최소 1200px · JPG/PNG/WEBP', ratio: '16 / 9', fallback: 'assets/images/hero.webp' },
          { key: 'home_hero_focus', label: '배경 초점', type: 'text', width: 'half', help: '가로% 세로% 두 값. 기본 "center 38%". 인물이 잘리면 세로%를 조절' },
          { key: 'home_eyebrow', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'home_title', label: '큰 제목', type: 'text', width: 'half', help: '가장 큰 글자' },
          { key: 'home_script', label: '필기체 장식', type: 'text', width: 'half', help: '제목 아래 겹치는 손글씨풍 글자. 비우면 안 나옵니다' },
          { key: 'home_headline', label: '한 줄 소개', type: 'text', help: '굵은 문장 한 줄' },
          { key: 'home_desc', label: '설명', type: 'textarea', help: '한 줄 소개 아래 문장' },
          { key: 'home_services', label: '작업 목록 줄', type: 'text', help: '가운뎃점(·)으로 구분한 영문 목록' },
          { key: 'home_btn1_label', label: '버튼1 문구', type: 'text', width: 'half', help: '왼쪽 진한 버튼. 비우면 버튼이 빠집니다' },
          { key: 'home_btn1_url', label: '버튼1 주소', type: 'text', width: 'half', help: '예: portfolio.html' },
          { key: 'home_btn2_label', label: '버튼2 문구', type: 'text', width: 'half', help: '비우면 버튼이 하나만 나옵니다' },
          { key: 'home_btn2_url', label: '버튼2 주소', type: 'text', width: 'half', help: '예: commission.html' }
        ]
      },
      {
        title: 'Selected Works 줄', where: '메인 중단 · 카드 내용은 포트폴리오 탭에서 "메인에 노출" 체크',
        fields: [
          { key: 'home_works_kicker', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'home_works_title', label: '제목', type: 'text', width: 'half', help: '줄 제목' },
          { key: 'home_works_link_label', label: '오른쪽 링크 문구', type: 'text', width: 'half', help: '포트폴리오 페이지로 가는 링크 문구' }
        ]
      },
      {
        title: '하단 3칸', where: '메인 맨 아래 보라색 띠',
        fields: [
          { key: 'home_flow_title', label: '1번 칸 제목', type: 'text', width: 'half', help: '영문 권장' },
          { key: 'home_flow', label: '1번 칸 단계', type: 'textarea', help: '한 줄에 하나씩. 번호는 자동. 4줄 권장' },
          { key: 'home_about_title', label: '2번 칸 제목', type: 'text', width: 'half', help: '영문 권장' },
          { key: 'home_about_sign', label: '2번 칸 서명', type: 'text', width: 'half', help: '오른쪽 아래 흐린 손글씨. 비우면 안 나옵니다' },
          { key: 'home_about_copy', label: '2번 칸 내용', type: 'textarea', help: '두세 줄 권장' },
          { key: 'home_contact_title', label: '3번 칸 제목', type: 'text', width: 'half', help: '영문 권장' },
          { key: 'home_contact_copy', label: '3번 칸 내용', type: 'textarea', help: '두세 줄 권장' },
          { key: 'home_contact_btn_label', label: '3번 칸 버튼 문구', type: 'text', width: 'half', help: '비우면 버튼이 빠집니다' },
          { key: 'home_contact_btn_url', label: '3번 칸 버튼 주소', type: 'text', width: 'half', help: '예: commission.html#inquiry' }
        ]
      }
    ]
  },
  {
    id: 'profile', label: '👤 작가 프로필',
    cards: [
      {
        title: '페이지 머리글', where: '작가 프로필 페이지 상단',
        fields: [
          { key: 'profile_kicker', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'profile_title', label: '큰 제목', type: 'text', width: 'half', help: '영문 권장' },
          { key: 'profile_lead', label: '설명', type: 'textarea', help: '제목 아래 한두 줄' }
        ]
      },
      {
        title: '작가 소개', where: '작가 프로필 페이지 본문',
        fields: [
          { key: 'profile_image', label: '프로필 사진', type: 'image', help: '작가 프로필 페이지 왼쪽 사진. 정사각형으로 잘립니다', spec: '권장 640×640 (정사각 1:1) · 최소 400px · JPG/PNG/WEBP', ratio: '1 / 1', fallback: 'assets/images/profile.webp' },
          { key: 'profile_image_focus', label: '사진 초점', type: 'text', width: 'half', help: '가로% 세로%. 기본 "50% 50%"' },
          { key: 'profile_eyebrow', label: '윗줄 라벨', type: 'text', width: 'half', help: '이름 위 작은 영문' },
          { key: 'profile_name', label: '이름', type: 'text', width: 'half', help: '큰 글씨' },
          { key: 'profile_korean', label: '한글 이름', type: 'text', width: 'half', help: '이름 아래 작은 글씨' },
          { key: 'profile_intro', label: '소개글', type: 'textarea', rows: 5, help: '줄바꿈 그대로 반영' },
          { key: 'profile_tags', label: '작업 환경 태그', type: 'textarea', help: '쉼표 또는 줄바꿈으로 구분. 예: NiloToon, Warudo, Meligo' }
        ]
      },
      {
        title: '협업 작가 머리글', where: '작가 프로필 페이지 하단 · 카드 내용은 아래 목록에서',
        fields: [
          { key: 'collab_kicker', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'collab_title', label: '제목', type: 'text', width: 'half', help: '구간 제목' },
          { key: 'collab_note', label: '오른쪽 안내', type: 'textarea', help: '제목 오른쪽에 들어가는 작은 글' }
        ]
      }
    ],
    collections: ['collab_artists']
  },
  {
    id: 'portfolio', label: '🖼 포트폴리오',
    cards: [
      {
        title: '페이지 머리글', where: '포트폴리오 페이지 상단',
        fields: [
          { key: 'portfolio_kicker', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'portfolio_title', label: '큰 제목', type: 'text', width: 'half', help: '큰 글자. 영문 권장' },
          { key: 'portfolio_lead', label: '설명', type: 'textarea', help: '제목 아래 한두 줄' }
        ]
      },
      {
        title: '분류 · 카드 모양', where: '포트폴리오 페이지 필터 버튼과 카드 크기',
        fields: [
          { key: 'portfolio_all_label', label: '전체 버튼 문구', type: 'text', width: 'half', help: '기본 "전체"' },
          { key: 'portfolio_ratio', label: '카드 사진 비율', type: 'select', width: 'half', options: [['4 / 3', '4:3 (기본)'], ['3 / 2', '3:2 가로형'], ['16 / 9', '16:9 넓은형'], ['1 / 1', '1:1 정사각'], ['3 / 4', '3:4 세로형']], help: '모든 카드가 이 비율로 통일됩니다. 사진 원본 비율이 달라도 상관없습니다' },
          { key: 'portfolio_cats', label: '분류 목록', type: 'textarea', help: '한 줄에 하나. 형식 = 영문값 | 버튼 이름 · 영문값은 작업의 "분류" 칸과 같아야 합니다. 예) facial | 페이셜' }
        ]
      }
    ],
    collections: ['portfolio_items']
  },
  {
    id: 'commission', label: '📝 커미션 안내',
    cards: [
      {
        title: '페이지 머리글', where: '커미션 안내 페이지 상단',
        fields: [
          { key: 'commission_kicker', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'commission_title', label: '큰 제목', type: 'text', width: 'half', help: '큰 글자. 영문 권장' },
          { key: 'commission_lead', label: '설명', type: 'textarea', help: '제목 아래 한두 줄' }
        ]
      },
      {
        title: '구간 머리글', where: '커미션 안내 페이지 각 구간 제목',
        fields: [
          { key: 'flow_kicker', label: '진행 과정 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'flow_title', label: '진행 과정 제목', type: 'text', width: 'half', help: '구간 제목' },
          { key: 'flow_note', label: '진행 과정 안내', type: 'textarea', help: '제목 오른쪽 작은 글' },
          { key: 'notice_kicker', label: '안내사항 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'notice_title', label: '안내사항 제목', type: 'text', width: 'half', help: '구간 제목' },
          { key: 'notice_note', label: '안내사항 안내', type: 'textarea', help: '제목 오른쪽 작은 글' },
          { key: 'inquiry_kicker', label: '문의서 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'inquiry_title', label: '문의서 제목', type: 'text', width: 'half', help: '구간 제목' },
          { key: 'inquiry_note', label: '문의서 안내', type: 'textarea', help: '제목 오른쪽 작은 글' },
          { key: 'inquiry_summary', label: '문의서 여는 버튼', type: 'text', width: 'half', help: '접혀 있는 상태에서 보이는 줄' }
        ]
      },
      {
        title: '문의 전송', where: '문의서 아래 전송 상자',
        fields: [
          { key: 'inquiry_send_on', label: '전송 상자 사용', type: 'select', width: 'half', options: [['on', '사용 (관리자 문의함으로 접수)'], ['off', '사용 안 함 (복사만)']], help: '사용하면 방문자가 보낸 내용이 관리자 📮 문의함에 쌓입니다' },
          { key: 'inquiry_send_head', label: '전송 상자 제목', type: 'text', width: 'half', help: '전송 상자 맨 위 줄' },
          { key: 'inquiry_send_help', label: '전송 상자 안내', type: 'textarea', help: '연락처를 왜 받는지 한두 줄' },
          { key: 'inquiry_send_btn', label: '전송 버튼 문구', type: 'text', width: 'half', help: '예: 문의 보내기' },
          { key: 'inquiry_contact_label', label: '연락처 칸 이름', type: 'text', width: 'half', help: '예: 연락받을 곳 (디스코드·X 등)' }
        ]
      }
    ],
    collections: ['commission_steps', 'commission_notices', 'inquiry_forms']
  },
  {
    id: 'pricing', label: '💰 가격 안내',
    cards: [
      {
        title: '페이지 머리글', where: '가격 안내 페이지 상단',
        fields: [
          { key: 'pricing_kicker', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'pricing_title', label: '큰 제목', type: 'text', width: 'half', help: '큰 글자. 영문 권장' },
          { key: 'pricing_lead', label: '설명', type: 'textarea', help: '제목 아래 한두 줄' }
        ]
      },
      {
        title: '구간 머리글 · 분류', where: '가격 안내 페이지 구간 제목과 필터 버튼',
        fields: [
          { key: 'price_kicker', label: '패키지 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'price_title', label: '패키지 제목', type: 'text', width: 'half', help: '구간 제목' },
          { key: 'price_note', label: '패키지 안내', type: 'textarea', help: '제목 오른쪽 작은 글. 견적 주의사항 등' },
          { key: 'price_all_label', label: '전체 버튼 문구', type: 'text', width: 'half', help: '기본 "전체"' },
          { key: 'price_cats', label: '분류 목록', type: 'textarea', help: '한 줄에 하나. 형식 = 영문값 | 버튼 이름 · 패키지의 "분류" 칸과 같아야 합니다' },
          { key: 'option_kicker', label: '추가 옵션 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'option_title', label: '추가 옵션 제목', type: 'text', width: 'half', help: '구간 제목' },
          { key: 'option_col1', label: '표 1열 제목', type: 'text', width: 'half', help: '기본 "옵션"' },
          { key: 'option_col2', label: '표 2열 제목', type: 'text', width: 'half', help: '기본 "추가 금액"' },
          { key: 'option_col3', label: '표 3열 제목', type: 'text', width: 'half', help: '기본 "안내"' }
        ]
      }
    ],
    collections: ['price_packages', 'price_options']
  },
  {
    id: 'schedule', label: '📅 작업 일정',
    cards: [
      {
        title: '페이지 머리글', where: '작업 일정 페이지 상단',
        fields: [
          { key: 'schedule_kicker', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'schedule_title', label: '큰 제목', type: 'text', width: 'half', help: '큰 글자. 영문 권장' },
          { key: 'schedule_lead', label: '설명', type: 'textarea', help: '제목 아래 한두 줄' }
        ]
      },
      {
        title: '요약 3칸', where: '달력 위 가로 3칸',
        fields: [
          { key: 'schedule_stat1_label', label: '1번 이름', type: 'text', width: 'half', help: '기본 "기준일"' },
          { key: 'schedule_stat1_value', label: '1번 값', type: 'text', width: 'half', help: '비우면 오늘 날짜가 자동으로 들어갑니다' },
          { key: 'schedule_stat2_label', label: '2번 이름', type: 'text', width: 'half', help: '칸 이름' },
          { key: 'schedule_stat2_value', label: '2번 값', type: 'text', width: 'half', help: '예: 08.10–09.16' },
          { key: 'schedule_stat3_label', label: '3번 이름', type: 'text', width: 'half', help: '칸 이름' },
          { key: 'schedule_stat3_value', label: '3번 값', type: 'text', width: 'half', help: '예: 08.10–08.27' }
        ]
      },
      {
        title: '달력', where: '작업 일정 페이지 달력 · 칸 내용은 아래 일정 목록에서',
        fields: [
          { key: 'schedule_year', label: '표시 연도', type: 'number', width: 'half', help: '예: 2026. 비우면 올해' },
          { key: 'schedule_month', label: '표시 월', type: 'number', width: 'half', help: '1~12. 비우면 이번 달' },
          { key: 'schedule_tab1', label: '1번 탭 이름', type: 'text', width: 'half', help: '일정의 달력 = 패키지 작업' },
          { key: 'schedule_tab2', label: '2번 탭 이름', type: 'text', width: 'half', help: '일정의 달력 = 닐로툰 & 뚜따' },
          { key: 'schedule_upcoming_title', label: '다음달 안내 제목', type: 'text', width: 'half', help: '비우면 그 줄이 통째로 숨겨집니다' },
          { key: 'schedule_upcoming', label: '다음달 안내 항목', type: 'textarea', help: '한 줄에 하나씩. 예: 09.02 대기 1건' },
          { key: 'schedule_note', label: '하단 안내문', type: 'textarea', help: '달력 아래 회색 글' }
        ]
      }
    ],
    collections: ['schedule_events']
  },
  {
    id: 'shop', label: '🛍 개인작 판매',
    cards: [
      {
        title: '페이지 머리글', where: '개인작 판매 페이지 상단',
        fields: [
          { key: 'shop_kicker', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'shop_title', label: '큰 제목', type: 'text', width: 'half', help: '큰 글자. 영문 권장' },
          { key: 'shop_lead', label: '설명', type: 'textarea', help: '제목 아래 한두 줄' }
        ]
      },
      {
        title: '준비 중 화면', where: '아래 상품 목록이 비었을 때만 나옵니다',
        fields: [
          { key: 'shop_empty_eyebrow', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문. 예: Coming Soon' },
          { key: 'shop_empty_title', label: '제목', type: 'text', width: 'half', help: '한 줄' },
          { key: 'shop_empty_copy', label: '내용', type: 'textarea', help: '판매 예정 안내 두세 줄' },
          { key: 'shop_empty_btn1_label', label: '버튼1 문구', type: 'text', width: 'half', help: '비우면 버튼이 빠집니다' },
          { key: 'shop_empty_btn1_url', label: '버튼1 주소', type: 'text', width: 'half', help: '예: portfolio.html' },
          { key: 'shop_empty_btn2_label', label: '버튼2 문구', type: 'text', width: 'half', help: '비우면 버튼이 빠집니다' },
          { key: 'shop_empty_btn2_url', label: '버튼2 주소', type: 'text', width: 'half', help: '예: faq.html' }
        ]
      }
    ],
    collections: ['shop_items']
  },
  {
    id: 'faq', label: '❓ FAQ',
    cards: [
      {
        title: '페이지 머리글', where: 'FAQ 페이지 상단',
        fields: [
          { key: 'faq_kicker', label: '윗줄 라벨', type: 'text', width: 'half', help: '제목 위 작은 영문' },
          { key: 'faq_title', label: '큰 제목', type: 'text', width: 'half', help: '큰 글자. 영문 권장' },
          { key: 'faq_lead', label: '설명', type: 'textarea', help: '제목 아래 한두 줄' },
          { key: 'faq_placeholder', label: '검색칸 안내문', type: 'text', help: '검색칸이 비었을 때 흐리게 보이는 글' }
        ]
      }
    ],
    collections: ['faq_items']
  }
];

const PALETTE = [
  { key: 'theme_violet', var: '--violet', label: '포인트 색', def: '#8d6dca', desc: '라벨·강조선·태그 테두리' },
  { key: 'theme_deep', var: '--deep', label: '진한 포인트', def: '#65469f', desc: '작은 영문 라벨·링크·버튼 배경' },
  { key: 'theme_action', var: '--action', label: '동작 색', def: '#7455ad', desc: '선택된 필터 버튼 등' },
  { key: 'theme_pale', var: '--pale', label: '연한 배경', def: '#eee8f7', desc: '하단 띠·이미지 자리 배경' },
  { key: 'theme_pale2', var: '--pale-2', label: '더 연한 배경', def: '#f7f2fb', desc: '중간중간 들어가는 구간 배경' },
  { key: 'theme_paper', var: '--paper', label: '기본 배경', def: '#fcfafc', desc: '페이지 전체 바탕' },
  { key: 'theme_line', var: '--line', label: '선 색', def: '#e6dfec', desc: '카드 테두리·구분선' },
  { key: 'theme_ink', var: '--ink', label: '제목 글자', def: '#24222a', desc: '제목과 굵은 글자' },
  { key: 'theme_body', var: '--body', label: '본문 글자', def: '#615b67', desc: '설명 문장' },
  { key: 'theme_footer', var: '--footer', label: '푸터 배경', def: '#272631', desc: '맨 아래 어두운 띠' }
];

const TYPE_SCALE = [
  { key: 'fs_display', var: '--fs-display', label: '큰 제목', def: 1, desc: '페이지 맨 위 큰 글자' },
  { key: 'fs_title', var: '--fs-title', label: '카드 제목', def: 1, desc: '카드 안 제목' },
  { key: 'fs_body', var: '--fs-body', label: '본문 전체', def: 1, desc: '사이트 전체 기준 크기' },
  { key: 'fs_label', var: '--fs-label', label: '작은 라벨', def: 1, desc: '영문 라벨·태그' }
];

const THEME_PRESETS = {
  '라벤더 (기본)': { theme_violet: '#8d6dca', theme_deep: '#65469f', theme_action: '#7455ad', theme_pale: '#eee8f7', theme_pale2: '#f7f2fb', theme_paper: '#fcfafc', theme_line: '#e6dfec', theme_ink: '#24222a', theme_body: '#615b67', theme_footer: '#272631' },
  '먹빛 그레이': { theme_violet: '#6f7286', theme_deep: '#3f4356', theme_action: '#4c5065', theme_pale: '#eceef3', theme_pale2: '#f5f6f9', theme_paper: '#fbfbfc', theme_line: '#e2e4ea', theme_ink: '#22232b', theme_body: '#5c5f6b', theme_footer: '#25262e' },
  '피치 로즈': { theme_violet: '#d38199', theme_deep: '#a8546f', theme_action: '#b95f7c', theme_pale: '#fbeaee', theme_pale2: '#fdf5f7', theme_paper: '#fffbfc', theme_line: '#f2dde3', theme_ink: '#2b2124', theme_body: '#6b5b60', theme_footer: '#2e2529' },
  '민트 세이지': { theme_violet: '#6ca894', theme_deep: '#3f7666', theme_action: '#4c8875', theme_pale: '#e6f2ed', theme_pale2: '#f3f9f6', theme_paper: '#fbfdfc', theme_line: '#dcebe5', theme_ink: '#1f2724', theme_body: '#556360', theme_footer: '#232c29' },
  '미드나잇 블루': { theme_violet: '#6d84c4', theme_deep: '#3d5296', theme_action: '#4a60a6', theme_pale: '#e8ecf8', theme_pale2: '#f3f6fc', theme_paper: '#fbfcff', theme_line: '#dde3f1', theme_ink: '#1f2331', theme_body: '#575d70', theme_footer: '#212636' }
};

if (typeof window !== 'undefined') {
  window.SITE_SCHEMA = { PAGES, COLLECTIONS, CONTENT_TABS, PALETTE, TYPE_SCALE, THEME_PRESETS };
}
if (typeof module !== 'undefined') {
  module.exports = { PAGES, COLLECTIONS, CONTENT_TABS, PALETTE, TYPE_SCALE, THEME_PRESETS };
}
