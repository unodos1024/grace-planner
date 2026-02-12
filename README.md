# Grace Planner

영적 성장을 위한 개인 신앙 관리 웹 애플리케이션

## 📋 프로젝트 구조

```
grace-planner/
├── GracePlanner.Api/     # .NET 8 Web API (백엔드)
├── css/                  # 스타일시트
├── js/                   # JavaScript 파일
├── pages/                # HTML 페이지
├── assets/               # 이미지 등 정적 자산
├── data/                 # 데이터 파일
└── index.html            # 메인 페이지
```

## 🚀 로컬 실행

### 프론트엔드
```bash
npm install
npm start
```

### 백엔드 (.NET API)
```bash
cd GracePlanner.Api
dotnet restore
dotnet run
```

## 🌐 배포

- **프론트엔드**: Vercel
- **백엔드**: Azure App Service / Railway / Render

## 📝 주요 기능

- 📖 QT (Quiet Time) 관리
- 🙏 기도 시간 기록
- 📚 성경 통독 90일 체크
- ✍️ 설교 노트
- 📖 독서 기록
- 📅 일정 관리

## 🛠 기술 스택

### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- SPA (Single Page Application)

### Backend
- .NET 8 Web API
- Entity Framework Core
- Oracle Database

## 📄 라이선스

Private Project
