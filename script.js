lucide.createIcons();
let lipsticks = [];
let myChart = null;
const colorThief = new ColorThief(); // 색상 추출 라이브러리

loadData();

// --- 데이터 로드 ---
function loadData() {
    const saved = localStorage.getItem('lipstickCollection_v3'); // 버전 업데이트
    if (saved) lipsticks = JSON.parse(saved);
    render();
    updateAnalysis();
}

function saveData() {
    localStorage.setItem('lipstickCollection_v3', JSON.stringify(lipsticks));
    updateHeaderCount();
}

function updateHeaderCount() {
    document.getElementById('headerTotalCount').textContent = lipsticks.length;
}

// --- 📸 이미지 업로드 및 색상 추출 (핵심) ---
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');

imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        imagePreview.src = event.target.result;
        imagePreview.classList.remove('hidden');

        // 이미지가 로드되면 색상 추출
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            try {
                // 도미넌트 컬러 추출 (RGB)
                const color = colorThief.getColor(img);
                const hex = rgbToHex(color[0], color[1], color[2]);
                
                // UI 업데이트
                document.getElementById('inputHex').value = hex;
                document.getElementById('hexValueText').textContent = `추출된 색상: ${hex}`;
                
                // 🤖 AI 퍼스널 컬러 자동 추천 실행
                const suggestedTone = suggestTone(color[0], color[1], color[2]);
                const selectBox = document.getElementById('inputPersonalColor');
                selectBox.value = suggestedTone;
                
                // 알림 효과
                selectBox.classList.add('bg-rose-100');
                setTimeout(() => selectBox.classList.remove('bg-rose-100'), 1000);

            } catch (err) {
                console.error("색상 추출 실패", err);
            }
        };
    };
    reader.readAsDataURL(file);
});

// RGB -> Hex 변환 헬퍼
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// 🤖 간단한 퍼스널 컬러 추정 로직 (명도/채도/온도 기반)
function suggestTone(r, g, b) {
    // 1. HSV 변환 (색상, 채도, 명도)
    let rabs = r / 255, gabs = g / 255, babs = b / 255;
    let max = Math.max(rabs, gabs, babs), min = Math.min(rabs, gabs, babs);
    let h, s, v = max;
    let d = max - min;
    s = max == 0 ? 0 : d / max;

    if (max == min) h = 0;
    else {
        switch (max) {
            case rabs: h = (gabs - babs) / d + (gabs < babs ? 6 : 0); break;
            case gabs: h = (babs - rabs) / d + 2; break;
            case babs: h = (rabs - gabs) / d + 4; break;
        }
        h /= 6;
    }

    // 2. 웜/쿨 판별 (단순화: 붉은/주황기는 웜, 핑크/푸른기는 쿨)
    // H(색상): 0~1 범위. 0.0~0.15(Red~Orange), 0.85~1.0(Rose) -> Warm/Cool 경계 모호함
    // R vs B 비교로 간단히 판별
    const isCool = b > r * 0.8 || (r > g && b > g * 0.9); // 파랑이 많거나 핑크끼가 돌면 쿨
    const isWarm = !isCool;

    // 3. 명도(Light/Dark)와 채도(Soft/Bright)로 계절 추정
    // v(명도): 높으면 라이트, 낮으면 딥
    // s(채도): 높으면 브라이트, 낮으면 뮤트

    if (isWarm) {
        if (v > 0.7 && s < 0.6) return '봄 웜 라이트';
        if (v > 0.6 && s >= 0.6) return '봄 웜 브라이트';
        if (v <= 0.6 && s < 0.6) return '가을 웜 뮤트';
        return '가을 웜 딥'; // 명도가 낮거나 채도가 높고 어두운 경우
    } else {
        if (v > 0.7 && s < 0.5) return '여름 쿨 라이트';
        if (v > 0.6 && s < 0.7) return '여름 쿨 뮤트';
        if (v > 0.5 && s >= 0.7) return '겨울 쿨 브라이트';
        return '겨울 쿨 딥';
    }
}

// --- 등록 및 기타 기능 ---
document.getElementById('addBtn').addEventListener('click', () => {
    const brand = document.getElementById('inputBrand').value;
    const name = document.getElementById('inputName').value;
    const colorName = document.getElementById('inputColorName').value;
    const pColor = document.getElementById('inputPersonalColor').value;
    const hex = document.getElementById('inputHex').value;

    if (!brand && !name) { alert('브랜드나 제품명을 입력해주세요!'); return; }
    if (!pColor) { alert('퍼스널 컬러를 선택하거나 사진을 올려 자동추천 받으세요!'); return; }

    const newItem = {
        id: Date.now(),
        brand: brand || '브랜드 없음',
        name: name || '제품명 없음',
        colorNum: colorName || '',
        personalColor: pColor,
        colorCode: hex,
        date: new Date().toISOString()
    };

    lipsticks.push(newItem);
    saveData();
    render();
    updateAnalysis();
    
    // 폼 초기화
    document.getElementById('inputBrand').value = '';
    document.getElementById('inputName').value = '';
    document.getElementById('inputColorName').value = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('inputPersonalColor').value = '';
});

// --- 분석 및 시각화 ---
function updateAnalysis() {
    const section = document.getElementById('analysisSection');
    // '잘 모름'을 제외한 유효 데이터만 필터링
    const validData = lipsticks.filter(l => l.personalColor !== '잘 모름');
    
    if (validData.length === 0) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');

    const counts = {
        '봄 웜 라이트': 0, '봄 웜 브라이트': 0,
        '여름 쿨 라이트': 0, '여름 쿨 뮤트': 0,
        '가을 웜 뮤트': 0, '가을 웜 딥': 0,
        '겨울 쿨 브라이트': 0, '겨울 쿨 딥': 0
    };

    validData.forEach(lip => {
        if (counts[lip.personalColor] !== undefined) counts[lip.personalColor]++;
    });

    // Chart.js
    const ctx = document.getElementById('personalColorChart').getContext('2d');
    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['봄라', '봄브', '여라', '여뮤', '갈뮤', '갈딥', '겨브', '겨딥'],
            datasets: [{
                label: '내 컬렉션',
                data: Object.values(counts),
                backgroundColor: [
                    '#FFB7B2', '#FF6961', '#C7CEEA', '#B5B9FF', 
                    '#E2C2B3', '#8D5B4C', '#FF52A2', '#800020'
                ],
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { display: false } }
        }
    });

    // 멘트 생성
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted[0];
    
    let text = `💄 분석 결과, <strong class="text-rose-600">${max[0]}</strong> 계열이 ${max[1]}개로 가장 많아요!`;
    
    if (validData.length < lipsticks.length) {
        text += `<br><span class="text-xs text-gray-400">(잘 모르는 톤 ${lipsticks.length - validData.length}개 제외)</span>`;
    }
    document.getElementById('analysisText').innerHTML = text;
}

function render(filter = 'all') {
    const grid = document.getElementById('lipstickGrid');
    grid.innerHTML = '';

    const filtered = lipsticks.filter(lip => {
        if (filter === 'all') return true;
        // 필터가 '봄'이면 '봄 웜 라이트', '봄 웜 브라이트' 모두 포함
        return lip.personalColor.includes(filter);
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400 text-sm">해당하는 립이 없어요 😢</div>';
        return;
    }

    filtered.forEach(lip => {
        const html = `
        <div class="bg-white rounded-2xl p-3 shadow-sm border border-stone-100 flex gap-3 items-center relative fade-in">
            <div class="w-12 h-12 rounded-full color-swatch flex-none shadow-inner" style="background-color: ${lip.colorCode}"></div>
            <div class="flex-1 min-w-0">
                <div class="text-[10px] text-stone-400 font-bold mb-0.5">${lip.brand}</div>
                <div class="font-bold text-stone-800 text-sm truncate">${lip.name}</div>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-rose-500 truncate">${lip.colorNum}</span>
                    <span class="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-500 truncate max-w-[80px]">${lip.personalColor}</span>
                </div>
            </div>
            <button onclick="deleteItem(${lip.id})" class="text-stone-300 hover:text-red-500 p-2"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>`;
        grid.insertAdjacentHTML('beforeend', html);
    });
    lucide.createIcons();
}

window.deleteItem = function(id) {
    if(confirm('삭제하시겠습니까?')) {
        lipsticks = lipsticks.filter(l => l.id !== id);
        saveData();
        render();
        updateAnalysis();
    }
}

window.filterBy = function(category) {
    document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
    let idMap = { 'all': 'filter-all', '봄': 'filter-spring', '여름': 'filter-summer', '가을': 'filter-autumn', '겨울': 'filter-winter' };
    document.getElementById(idMap[category]).classList.add('active');
    render(category);
}

document.getElementById('sampleBtn').addEventListener('click', () => {
    const samples = [
        { id: 1, brand: '롬앤', name: '쥬시래스팅', colorNum: '피그베리', personalColor: '여름 쿨 뮤트', colorCode: '#C85A65' },
        { id: 2, brand: '맥', name: '루비우', colorNum: 'Retro Matte', personalColor: '겨울 쿨 브라이트', colorCode: '#D31C43' },
    ];
    lipsticks = [...lipsticks, ...samples];
    saveData();
    render();
    updateAnalysis();
});
document.getElementById('resetBtn').addEventListener('click', () => {
    if(confirm('초기화 하시겠습니까?')) {
        lipsticks = [];
        saveData();
        render();
        updateAnalysis();
    }
});
