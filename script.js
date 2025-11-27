// 아이콘 초기화
lucide.createIcons();

let lipsticks = [];
let myChart = null; // 차트 객체 전역 변수

// 초기 로드
loadData();

// --- 데이터 관리 함수 ---
function loadData() {
    const saved = localStorage.getItem('lipstickCollection_v2');
    if (saved) {
        lipsticks = JSON.parse(saved);
    }
    render();
    updateAnalysis(); // 데이터 로드 후 분석 실행
}

function saveData() {
    localStorage.setItem('lipstickCollection_v2', JSON.stringify(lipsticks));
    updateHeaderCount();
}

function updateHeaderCount() {
    document.getElementById('headerTotalCount').textContent = lipsticks.length;
}

// --- 등록 기능 ---
document.getElementById('addBtn').addEventListener('click', () => {
    const brand = document.getElementById('inputBrand').value;
    const name = document.getElementById('inputName').value;
    const color = document.getElementById('inputColor').value;
    const pColor = document.getElementById('inputPersonalColor').value;
    const hex = document.getElementById('inputHex').value;

    if (!brand || !name) {
        alert('브랜드와 제품명은 필수입니다!');
        return;
    }

    const newItem = {
        id: Date.now(),
        brand, name, colorNum: color, 
        personalColor: pColor || '기타', // 퍼스널 컬러 저장
        colorCode: hex,
        date: new Date().toISOString()
    };

    lipsticks.push(newItem);
    saveData();
    render();
    updateAnalysis();
    
    // 입력창 초기화
    document.getElementById('inputBrand').value = '';
    document.getElementById('inputName').value = '';
    document.getElementById('inputColor').value = '';
});

// --- 분석 및 시각화 (핵심 기능) ---
function updateAnalysis() {
    const section = document.getElementById('analysisSection');
    if (lipsticks.length === 0) {
        section.classList.add('hidden');
        return;
    }
    section.classList.remove('hidden');

    // 1. 카운팅 로직
    const counts = {
        '봄 웜 라이트': 0, '봄 웜 브라이트': 0,
        '여름 쿨 라이트': 0, '여름 쿨 뮤트': 0,
        '가을 웜 뮤트': 0, '가을 웜 딥': 0,
        '겨울 쿨 브라이트': 0, '겨울 쿨 딥': 0,
        '기타': 0
    };

    lipsticks.forEach(lip => {
        if (counts[lip.personalColor] !== undefined) {
            counts[lip.personalColor]++;
        } else {
            counts['기타']++;
        }
    });

    // 2. 차트 그리기 (Chart.js)
    const ctx = document.getElementById('personalColorChart').getContext('2d');
    
    // 기존 차트가 있으면 삭제 (안그러면 겹침)
    if (myChart) myChart.destroy();

    const dataValues = [
        counts['봄 웜 라이트'], counts['봄 웜 브라이트'],
        counts['여름 쿨 라이트'], counts['여름 쿨 뮤트'],
        counts['가을 웜 뮤트'], counts['가을 웜 딥'],
        counts['겨울 쿨 브라이트'], counts['겨울 쿨 딥']
    ];

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['봄라', '봄브', '여라', '여뮤', '갈뮤', '갈딥', '겨브', '겨딥'],
            datasets: [{
                label: '보유 개수',
                data: dataValues,
                backgroundColor: [
                    '#FFB7B2', '#FF6961', // 봄
                    '#C7CEEA', '#B5B9FF', // 여름
                    '#E2C2B3', '#8D5B4C', // 가을
                    '#FF52A2', '#800020'  // 겨울
                ],
                borderRadius: 8,
                barThickness: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });

    // 3. AI 분석 멘트 생성 (가장 많은 것, 없는 것 찾기)
    // '기타' 제외하고 분석
    delete counts['기타']; 
    
    // 정렬
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted[0]; // 가장 많은 것
    const zeros = sorted.filter(item => item[1] === 0); // 하나도 없는 것

    let text = "";
    
    // 멘트 조합
    if (max[1] > 0) {
        text += `💄 현재 <strong class="text-rose-600">${max[0]}</strong> 계열 립스틱이 <strong class="text-rose-600">${max[1]}개</strong>로 가장 많아요! 확고한 취향이시네요. `;
        if (max[0].includes('겨울') || max[0].includes('딥')) {
            text += "고혹적이고 딥한 분위기를 즐기시는군요. ";
        } else if (max[0].includes('봄') || max[0].includes('라이트')) {
            text += "화사하고 맑은 컬러를 선호하시는군요! ";
        }
    } else {
        text += "아직 데이터가 충분하지 않아요. ";
    }

    if (zeros.length > 0) {
        const missing = zeros.slice(0, 2).map(i => i[0]).join(', ');
        text += `<br><br>💡 반면 <strong>${missing}</strong> 계열은 하나도 없어요. 기분 전환이 필요할 때 이쪽 컬러를 테스트해보는 건 어때요?`;
    } else {
        text += `<br><br>✨ 와우! 모든 퍼스널 컬러를 골고루 갖춘 진정한 립덕후시네요!`;
    }

    document.getElementById('analysisText').innerHTML = text;
}

// --- 렌더링 및 유틸리티 ---
function render(filter = 'all') {
    const grid = document.getElementById('lipstickGrid');
    grid.innerHTML = '';

    const filtered = lipsticks.filter(lip => {
        if (filter === 'all') return true;
        return lip.personalColor.includes(filter); // '봄', '여름' 등으로 필터링
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400 text-sm">해당하는 립스틱이 없어요</div>';
        return;
    }

    filtered.forEach(lip => {
        const html = `
        <div class="bg-white rounded-2xl p-3 shadow-sm border border-stone-100 flex gap-3 items-center relative fade-in">
            <div class="w-12 h-12 rounded-full color-swatch flex-none" style="background-color: ${lip.colorCode}"></div>
            <div class="flex-1 min-w-0">
                <div class="text-[10px] text-stone-400 font-bold mb-0.5">${lip.brand}</div>
                <div class="font-bold text-stone-800 text-sm truncate">${lip.name}</div>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-rose-500 truncate">${lip.colorNum}</span>
                    <span class="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">${lip.personalColor}</span>
                </div>
            </div>
            <button onclick="deleteItem(${lip.id})" class="text-stone-300 hover:text-red-500 p-2"><i data-lucide="x" class="w-4 h-4"></i></button>
        </div>`;
        grid.insertAdjacentHTML('beforeend', html);
    });
    lucide.createIcons();
}

// 삭제
window.deleteItem = function(id) {
    if(confirm('삭제하시겠습니까?')) {
        lipsticks = lipsticks.filter(l => l.id !== id);
        saveData();
        render();
        updateAnalysis();
    }
}

// 필터 버튼 활성화
window.filterBy = function(category) {
    document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
    
    // ID 매핑
    let idMap = { 'all': 'filter-all', '봄': 'filter-spring', '여름': 'filter-summer', '가을': 'filter-autumn', '겨울': 'filter-winter' };
    document.getElementById(idMap[category]).classList.add('active');
    
    render(category);
}

// 샘플 데이터
document.getElementById('sampleBtn').addEventListener('click', () => {
    const samples = [
        { id: 1, brand: '롬앤', name: '쥬시래스팅', colorNum: '피그베리', personalColor: '여름 쿨 뮤트', colorCode: '#C85A65' },
        { id: 2, brand: '맥', name: '루비우', colorNum: 'Retro Matte', personalColor: '겨울 쿨 브라이트', colorCode: '#D31C43' },
        { id: 3, brand: '3CE', name: '벨벳 립 틴트', colorNum: '다포딜', personalColor: '가을 웜 딥', colorCode: '#B25049' },
        { id: 4, brand: '페리페라', name: '잉크무드', colorNum: '03호', personalColor: '가을 웜 뮤트', colorCode: '#BC7872' },
        { id: 5, brand: '샤넬', name: '루쥬 알뤼르', colorNum: '99호', personalColor: '겨울 쿨 딥', colorCode: '#800020' },
        { id: 6, brand: '입생로랑', name: '따뚜아쥬', colorNum: '201호', personalColor: '겨울 쿨 딥', colorCode: '#660011' }
    ];
    lipsticks = [...lipsticks, ...samples];
    saveData();
    render();
    updateAnalysis();
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if(confirm('정말 다 지우시겠습니까?')) {
        lipsticks = [];
        saveData();
        render();
        updateAnalysis();
    }
});
