// API 설정
const CONFIG = {
    // 환경에 따라 자동으로 API URL 설정
    API_BASE_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:5116/api'  // 로컬 개발 환경
        : 'https://your-api-url.azurewebsites.net/api',  // 프로덕션 환경 (배포 후 수정 필요)

    // API 엔드포인트
    ENDPOINTS: {
        HOME: '/home/today',
        PRAYER: '/prayer/log',
        QT: '/qt',
        BIBLE: '/bible',
        SERMON: '/sermon',
        BOOK: '/book',
        MEMORY_VERSE: '/memoryverse'
    },

    // 기타 설정
    TIMEOUT: 10000, // 10초
    RETRY_COUNT: 3
};

// API 호출 헬퍼 함수
async function apiCall(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, defaultOptions);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Call Failed:', error);
        throw error;
    }
}

// 전역으로 내보내기
window.CONFIG = CONFIG;
window.apiCall = apiCall;
