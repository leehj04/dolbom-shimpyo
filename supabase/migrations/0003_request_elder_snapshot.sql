-- 신청 시점의 어르신 기본정보(이름·성별·생년월일)를 스냅샷으로 저장.
-- 요양보호사는 elders 테이블에 접근하지 않고도 care_requests만으로 신청 내용을 확인할 수 있다.
-- (상세 돌봄카드는 매칭 확정 후 elder_care_cards + care_card_access_logs로 별도 열람)
alter table care_requests add column if not exists elder_snapshot jsonb;
