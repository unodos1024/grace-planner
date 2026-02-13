# 🚀 Grace Planner 빠른 배포 가이드

## ⚡ 5분 안에 배포하기

### 1️⃣ GitHub에 올리기 (2분)

```bash
# 터미널에서 프로젝트 폴더로 이동
cd c:\Users\개발팀\.gemini\antigravity\scratch\grace-planner

# Git 초기화
git init
git add .
git commit -m "Initial commit"

# GitHub 저장소 생성 후 (https://github.com/new)
# YOUR_USERNAME을 본인 GitHub 아이디로 변경
git remote add origin https://github.com/YOUR_USERNAME/grace-planner.git
git branch -M main
git push -u origin main
```

### 2️⃣ Vercel에 배포하기 (3분)

1. **Vercel 접속**: https://vercel.com
2. **GitHub로 로그인**
3. **'Add New Project'** 클릭
4. **'grace-planner' 저장소 선택**
5. **'Deploy'** 클릭 → 완료! 🎉

배포 완료 후 URL: `https://grace-planner-xxx.vercel.app`

---

## 📝 배포 후 할 일

### ✅ 즉시 해야 할 것
- [ ] 배포된 사이트 접속해서 확인
- [ ] 로그인 페이지 작동 확인
- [ ] 메뉴 네비게이션 확인

### 🔧 나중에 해야 할 것
- [ ] 백엔드 API 배포 (Azure/Railway)
- [ ] `js/config.js`에서 API URL 수정
- [ ] 커스텀 도메인 연결 (선택사항)

---

## 🎯 백엔드 API 배포 (선택사항)

현재는 프론트엔드만 배포된 상태입니다.
백엔드 API를 배포하려면 다음 중 하나를 선택하세요:

### 옵션 1: Azure (권장)
- 무료 티어: F1 (제한적)
- .NET에 최적화
- 가이드: `DEPLOYMENT.md` 참고

### 옵션 2: Railway (가장 쉬움)
1. https://railway.app 접속
2. GitHub로 로그인
3. 'New Project' → 저장소 선택
4. Root Directory: `GracePlanner.Api`
5. 자동 배포 완료!

### 옵션 3: Render
1. https://render.com 접속
2. 'New Web Service' 선택
3. GitHub 연결
4. Build Command: `dotnet publish -c Release`

---

## 🔗 API 연결하기

백엔드 배포 후:

1. **API URL 복사** (예: `https://your-api.railway.app`)

2. **config.js 수정**:
```javascript
// js/config.js 파일 열기
API_BASE_URL: 'https://your-api.railway.app/api'  // 여기에 붙여넣기
```

3. **GitHub에 푸시**:
```bash
git add .
git commit -m "Update API URL"
git push
```

4. **Vercel 자동 재배포** (1분 소요)

---

## 💡 유용한 팁

### Vercel 대시보드에서 할 수 있는 것:
- 📊 **Analytics**: 방문자 통계 확인
- 🔧 **Settings**: 환경 변수 설정
- 🌐 **Domains**: 커스텀 도메인 연결
- 📝 **Deployments**: 배포 히스토리 확인

### Git 명령어 치트시트:
```bash
# 변경사항 확인
git status

# 변경사항 커밋
git add .
git commit -m "설명"
git push

# 이전 버전으로 되돌리기
git log  # 커밋 ID 확인
git revert <commit-id>
```

---

## 🆘 문제 해결

### "배포는 됐는데 페이지가 안 보여요"
→ Vercel 대시보드 → Deployments → 최신 배포 클릭 → 로그 확인

### "API 호출이 안 돼요"
→ 브라우저 개발자 도구(F12) → Console 탭 → 에러 메시지 확인
→ `js/config.js`에서 API URL이 올바른지 확인

### "Git push가 안 돼요"
→ GitHub 저장소가 제대로 생성되었는지 확인
→ `git remote -v` 명령어로 연결 확인

---

## 📞 다음 단계

1. **커스텀 도메인**: Vercel에서 `yourdomain.com` 연결 가능
2. **HTTPS**: 자동으로 제공됨 (무료 SSL)
3. **성능 모니터링**: Vercel Analytics 활성화
4. **팀 협업**: GitHub에 팀원 초대

---

## 🎉 축하합니다!

프론트엔드 배포가 완료되었습니다!
이제 전 세계 어디서나 접속할 수 있습니다.

**배포 URL**: https://grace-planner-xxx.vercel.app

더 자세한 내용은 `DEPLOYMENT.md` 파일을 참고하세요.
