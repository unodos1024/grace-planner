# Grace Planner: API Specification & Database Design

본 문서는 .NET Web API와 Oracle Cloud ATP 환경을 전제로 한 데이터 구조와 API 명세입니다.

## 1. Database Schema (Oracle Cloud ATP)

### [User] - 사용자 (단일 사용자 전제)
- `USER_ID` (NUMBER, PK)
- `NAME` (VARCHAR2)
- `JOIN_DATE` (DATE)

### [DailyTask] - 일일 과제 수행 기록
- `TASK_ID` (NUMBER, PK)
- `USER_ID` (NUMBER, FK)
- `TASK_DATE` (DATE)
- `TASK_TYPE` (VARCHAR2) - 'QT', 'PRAYER', 'BIBLE_90', 'STUDY', 'VERSE'
- `COMPLETED` (CHAR(1)) - 'Y', 'N'
- `DURATION` (NUMBER) - 기도 시간(분)
- `MEMO` (VARCHAR2) - 간단한 메모

### [BibleReading90] - 90일 통독 추적
- `DAY_INDEX` (NUMBER, PK) - 1~90
- `PERIOD_TYPE` (NUMBER) - 1: 하반기, 2: 하반기
- `COMPLETED_DATE` (DATE)

### [SermonNote] - 설교 요약
- `NOTE_ID` (NUMBER, PK)
- `WORSHIP_TYPE` (VARCHAR2) - 'SUNDAY', 'WEDNESDAY'
- `TITLE` (VARCHAR2)
- `CONTENT` (CLOB)
- `CREATED_DATE` (DATE)

---

## 2. API Endpoints (.NET Web API)

### [Home]
- `GET /api/home/today`: 오늘 날짜 기준 현황 및 과제 리스트 조회
- `GET /api/home/weekly-summary`: 이번 주 주간 통계 조회

### [Tasks]
- `POST /api/task/toggle`: 특정 과제 완료/미완료 상태 전환
- `POST /api/prayer/log`: 기도 시간 기록 저장
  - Request Body: `{ minutes: 20, date: "2026-02-08" }`

### [Bible]
- `GET /api/bible/90/status`: 90일 통독 전체 진행 현황
- `POST /api/bible/90/check/{dayIndex}`: 특정 날짜 읽음 체크

### [Verse]
- `GET /api/verse/week/{week}`: 주차별 암송 구절 리스트 (Seed JSON 활용 가능)
- `PATCH /api/verse/status`: 암기 상태 업데이트 (읽음/암기중/완료)

### [Recording]
- `POST /api/sermon/save`: 설교 요약 저장
- `POST /api/book/review`: 독후감 저장

---

## 3. 구현 시 고려사항
1.  **날짜 형식**: 모든 통신은 ISO 8601 형식을 사용합니다.
2.  **보안**: 초기 버전은 단일 사용자이나, 향후 JWT 인증 확장이 가능하도록 API 구조를 설계합니다.
3.  **데이터 무결성**: Oracle DB의 Triggers 또는 .NET의 Transactions를 사용하여 데이터 일관성을 유지합니다.
