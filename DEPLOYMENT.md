# Grace Planner 배포 가이드

## 📦 1단계: GitHub에 코드 올리기

### 1.1 Git 초기화 및 커밋

```bash
# 프로젝트 폴더에서 실행
cd c:\Users\개발팀\.gemini\antigravity\scratch\grace-planner

# Git 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: Grace Planner project"
```

### 1.2 GitHub 저장소 생성 및 연결

1. GitHub (https://github.com) 접속 후 로그인
2. 우측 상단 '+' 버튼 클릭 → 'New repository' 선택
3. Repository 이름: `grace-planner` 입력
4. Private/Public 선택 (개인 프로젝트는 Private 권장)
5. 'Create repository' 클릭

```bash
# GitHub 저장소와 연결 (YOUR_USERNAME을 본인 GitHub 아이디로 변경)
git remote add origin https://github.com/YOUR_USERNAME/grace-planner.git

# main 브랜치로 변경 (최신 Git 표준)
git branch -M main

# GitHub에 푸시
git push -u origin main
```

---

## 🌐 2단계: Vercel에 프론트엔드 배포

### 2.1 Vercel 계정 생성 및 로그인

1. Vercel (https://vercel.com) 접속
2. 'Sign Up' 클릭
3. GitHub 계정으로 로그인 (권장)

### 2.2 프로젝트 배포

1. Vercel 대시보드에서 'Add New...' → 'Project' 클릭
2. GitHub 저장소 목록에서 `grace-planner` 선택
3. 'Import' 클릭

#### 배포 설정:
- **Framework Preset**: Other
- **Root Directory**: `./` (기본값)
- **Build Command**: (비워두기 - 정적 사이트)
- **Output Directory**: `./` (기본값)
- **Install Command**: `npm install`

4. 'Deploy' 클릭
5. 배포 완료 후 제공되는 URL 확인 (예: `https://grace-planner.vercel.app`)

### 2.3 환경 변수 설정 (API 연결용)

나중에 백엔드 API를 배포한 후:

1. Vercel 프로젝트 → Settings → Environment Variables
2. 새 변수 추가:
   - Name: `VITE_API_URL` 또는 `API_URL`
   - Value: 백엔드 API URL (예: `https://your-api.azurewebsites.net`)
3. Save

---

## 🔧 3단계: 백엔드 API 배포 (선택사항)

백엔드는 .NET 8 Web API이므로 Vercel에서는 호스팅할 수 없습니다.
다음 플랫폼 중 하나를 선택하세요:

### 옵션 A: Azure App Service (권장 - Microsoft 공식)

**장점:**
- .NET에 최적화
- 무료 티어 제공 (F1)
- Oracle DB 연결 용이

**단계:**
1. Azure Portal (https://portal.azure.com) 로그인
2. 'Create a resource' → 'Web App' 선택
3. 설정:
   - Runtime: .NET 8
   - OS: Windows 또는 Linux
   - Region: Korea Central (한국)
4. GitHub Actions 또는 Azure DevOps로 자동 배포 설정

**배포 명령:**
```bash
cd GracePlanner.Api

# Azure CLI 설치 후
az login
az webapp up --name grace-planner-api --resource-group YourResourceGroup
```

### 옵션 B: Railway (간편함)

**장점:**
- 설정이 매우 간단
- GitHub 연동 자동 배포
- 무료 티어 제공

**단계:**
1. Railway (https://railway.app) 접속
2. GitHub로 로그인
3. 'New Project' → 'Deploy from GitHub repo' 선택
4. `grace-planner` 저장소 선택
5. Root Directory를 `GracePlanner.Api`로 설정
6. 자동으로 .NET 감지 및 배포

### 옵션 C: Render

**장점:**
- 무료 티어 제공
- 간단한 설정

**단계:**
1. Render (https://render.com) 접속
2. 'New +' → 'Web Service' 선택
3. GitHub 저장소 연결
4. 설정:
   - Environment: Docker 또는 .NET
   - Build Command: `dotnet publish -c Release`
   - Start Command: `dotnet GracePlanner.Api.dll`

---

## 🔗 4단계: 프론트엔드와 백엔드 연결

### 4.1 CORS 설정 (백엔드)

`GracePlanner.Api/Program.cs`에서 Vercel URL 추가:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVercel",
        builder => builder
            .WithOrigins(
                "https://grace-planner.vercel.app",  // Vercel URL
                "http://localhost:3000"               // 로컬 개발
            )
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// ...

app.UseCors("AllowVercel");
```

### 4.2 API URL 설정 (프론트엔드)

JavaScript 파일에서 API URL을 환경에 따라 설정:

```javascript
// js/config.js (새로 생성)
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5116'  // 로컬 개발
    : 'https://your-api-url.azurewebsites.net';  // 프로덕션

export default API_BASE_URL;
```

---

## 📝 5단계: 배포 후 확인사항

### 체크리스트:
- [ ] GitHub 저장소에 코드가 올라갔는지 확인
- [ ] Vercel에서 프론트엔드가 정상 작동하는지 확인
- [ ] 백엔드 API가 배포되었는지 확인 (선택)
- [ ] CORS 설정이 올바른지 확인
- [ ] 환경 변수가 설정되었는지 확인
- [ ] 데이터베이스 연결이 정상인지 확인

---

## 🔄 6단계: 지속적 배포 (CI/CD)

### GitHub Actions 설정 (자동 배포)

`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## 🆘 문제 해결

### 문제 1: Vercel 배포 실패
- `vercel.json` 파일 확인
- Build 로그 확인
- Node.js 버전 확인

### 문제 2: API 연결 안됨
- CORS 설정 확인
- API URL이 올바른지 확인
- 네트워크 탭에서 요청 확인

### 문제 3: 데이터베이스 연결 오류
- Connection String 확인
- 방화벽 설정 확인
- 데이터베이스 서버가 외부 접속을 허용하는지 확인

---

## 📞 다음 단계

1. **도메인 연결**: Vercel에서 커스텀 도메인 설정 가능
2. **HTTPS**: Vercel은 자동으로 SSL 인증서 제공
3. **모니터링**: Vercel Analytics 활성화
4. **성능 최적화**: 이미지 최적화, 코드 압축 등

---

## 💡 팁

- **무료 티어 제한**: Vercel과 대부분의 플랫폼은 무료 티어에 제한이 있습니다
- **환경 분리**: 개발/스테이징/프로덕션 환경을 분리하는 것이 좋습니다
- **백업**: 정기적으로 데이터베이스 백업을 수행하세요
- **보안**: API 키와 비밀번호는 절대 코드에 포함하지 마세요

---

## 📚 참고 자료

- [Vercel 문서](https://vercel.com/docs)
- [Azure App Service 문서](https://docs.microsoft.com/azure/app-service/)
- [Railway 문서](https://docs.railway.app/)
- [.NET 배포 가이드](https://docs.microsoft.com/dotnet/core/deploying/)
