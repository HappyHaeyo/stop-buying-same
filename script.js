// 전역 변수 설정
let lipsticks = [];
let myChart = null;
const colorThief = new ColorThief();

// --- HTML이 모두 로딩된 후 실행 (안전장치) ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons(); // 아이콘 초기화
    loadData(); // 데이터 불러오기

    // 1. 📸 이미지 업로드 및 색상 추출
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        const imagePreview = document.getElementById('imagePreview');

        imageInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                if (imagePreview) {
                    imagePreview.src = event.target.result;
                    imagePreview.classList.remove('hidden');
                }

                const img = new Image();
                img.src = event.target.result;
                img.onload = function () {
                    try {
                        const color = colorThief.getColor(img);
                        const hex = rgbToHex(color[0], color[1], color[2]);

                        const inputHex = document.getElementById('inputHex');
                        const hexText = document.getElementById('hexValueText');

                        if (inputHex) inputHex.value = hex;
                        if (hexText) hexText.textContent = `추출된 색상: ${hex}`;

                        const suggestedTone = suggestTone(color[0], color[1], color[2]);
                        const selectBox = document.getElementById('inputPersonalColor');

                        if (selectBox) {
                            selectBox.value = suggestedTone;
                            selectBox.classList.add('bg-rose-100');
                            setTimeout(() => selectBox.classList.remove('bg-rose-100'), 1000);
                        }

                    } catch (err) {
                        console.error("색상 추출 실패", err);
                    }
                };
            };
            reader.readAsDataURL(file);
        });
    }

    // 2. 등록 버튼
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const brand = document.getElementById('inputBrand')?.value;
            const name = document.getElementById('inputName')?.value;
            const colorName = document.getElementById('inputColorName')?.value;
            const pColor = document.getElementById('inputPersonalColor')?.value;
            const hex = document.getElementById('inputHex')?.value;

            if (!brand && !name) { alert('브랜드나 제품명을 입력해주세요!'); return; }
            if (!pColor) { alert('퍼스널 컬러를 선택해주세요!'); return; }

            const newItem = {
                id: Date.now(),
                brand: brand || '브랜드 없음',
                name: name || '제품명 없음',
                colorNum: colorName || '',
                personalColor: pColor,
                colorCode: hex || '#000000',
                date: new Date().toISOString()
            };

            lipsticks.push(newItem);
            saveData();
            render();
            updateAnalysis();

            // 폼 초기화
            if (document.getElementById('inputBrand')) document.getElementById('inputBrand').value = '';
            if (document.getElementById('inputName')) document.getElementById('inputName').value = '';
            if (document.getElementById('inputColorName')) document.getElementById('inputColorName').value = '';
            if (document.getElementById('imagePreview')) document.getElementById('imagePreview').classList.add('hidden');
            if (document.getElementById('inputPersonalColor')) document.getElementById('inputPersonalColor').value = '';
        });
    }

    // 3. ✨ 샘플 데이터 버튼
    const sampleBtn = document.getElementById('sampleBtn');
    if (sampleBtn) {
        sampleBtn.addEventListener('click', () => {
            const samples = [
                { id: Date.now() + 1, brand: '롬앤', name: '쥬시래스팅', colorNum: '피그베리', personalColor: '여름 쿨 뮤트', colorCode: '#C85A65' },
                { id: Date.now() + 2, brand: '맥', name: '루비우', colorNum: 'Retro Matte', personalColor: '겨울 쿨 브라이트', colorCode: '#D31C43' },
                { id: Date.now() + 3, brand: '3CE', name: '벨벳 립 틴트', colorNum: '다포딜', personalColor: '가을 웜 딥', colorCode: '#B25049' },
                { id: Date.now() + 4, brand: '페리페라', name: '잉크무드', colorNum: '03호', personalColor: '가을 웜 뮤트', colorCode: '#BC7872' },
            ];
            lipsticks = [...lipsticks, ...samples];
            saveData();
            render();
            updateAnalysis();

            // 버튼 텍스트 변경으로 피드백
            const originalText = sampleBtn.innerHTML;
            sampleBtn.innerHTML = '<div class="p-2 bg-green-50 rounded-full"><i data-lucide="check" class="w-4 h-4 text-green-500"></i></div><span class="text-xs font-semibold text-green-600">추가됨!</span>';
            setTimeout(() => {
                sampleBtn.innerHTML = originalText;
                lucide.createIcons();
            }, 1500);
        });
    }

    // 4. 초기화 버튼
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('모든 데이터를 삭제하시겠습니까?')) {
                lipsticks = [];
                saveData();
                render();
                updateAnalysis();
            }
        });
    }

    // 5. 백업 다운로드
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (lipsticks.length === 0) {
                alert('저장할 데이터가 없어요! 😅');
                return;
            }

            let csvContent = "브랜드,제품명,컬러명,퍼스널컬러,색상코드\n";
            lipsticks.forEach(lip => {
                const row = [
                    lip.brand,
                    lip.name,
                    lip.colorNum,
                    lip.personalColor,
                    lip.colorCode
                ].join(",");
                csvContent += row + "\n";
            });

            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);

            const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            link.setAttribute("href", url);
            link.setAttribute("download", `MyLipstick_Backup_${date}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // 6. CSV 업로드
    const csvUpload = document.getElementById('csvUpload');
    if (csvUpload) {
        csvUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const lines = text.split('\n');

                let addedCount = 0;

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const parts = line.split(',');
                    if (parts.length >= 2) {
                        const newItem = {
                            id: Date.now() + i,
                            brand: parts[0]?.trim() || 'Unknown',
                            name: parts[1]?.trim() || 'Unknown',
                            colorNum: parts[2]?.trim() || '',
                            personalColor: parts[3]?.trim() || '잘 모름',
                            colorCode: parts[4]?.trim() || '#000000',
                            date: new Date().toISOString()
                        };
                        lipsticks.push(newItem);
                        addedCount++;
                    }
                }

                saveData();
                render();
                updateAnalysis();
                alert(`${addedCount}개의 립스틱을 불러왔어요! 💄`);
                e.target.value = '';
            };
            reader.readAsText(file);
        });
    }
}); // --- DOMContentLoaded 끝 ---


// --- 헬퍼 함수들 (전역 함수로 유지) ---
function loadData() {
    const saved = localStorage.getItem('lipstickCollection_v3');
    if (saved) lipsticks = JSON.parse(saved);
    render();
    updateAnalysis();
}

function saveData() {
    localStorage.setItem('lipstickCollection_v3', JSON.stringify(lipsticks));
    updateHeaderCount();
}

function updateHeaderCount() {
    const countEl = document.getElementById('headerTotalCount');
    if (countEl) countEl.textContent = lipsticks.length;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function suggestTone(r, g, b) {
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

    const isCool = b > r * 0.8 || (r > g && b > g * 0.9);
    const isWarm = !isCool;

    if (isWarm) {
        if (v > 0.7 && s < 0.6) return '봄 웜 라이트';
        if (v > 0.6 && s >= 0.6) return '봄 웜 브라이트';
        if (v <= 0.6 && s < 0.6) return '가을 웜 뮤트';
        return '가을 웜 딥';
    } else {
        if (v > 0.7 && s < 0.5) return '여름 쿨 라이트';
        if (v > 0.6 && s < 0.7) return '여름 쿨 뮤트';
        if (v > 0.5 && s >= 0.7) return '겨울 쿨 브라이트';
        return '겨울 쿨 딥';
    }
}

// 💄 여기서부터가 차트 디자인을 예쁘게 바꿔주는 부분입니다!
function updateAnalysis() {
    const section = document.getElementById('analysisSection');
    if (!section) return;

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

    const canvas = document.getElementById('personalColorChart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (myChart) myChart.destroy();

        // 🌈 그라데이션 만들기 (봄, 여름, 가을, 겨울)
        const gradientSpring = ctx.createLinearGradient(0, 0, 0, 400);
        gradientSpring.addColorStop(0, '#FFB7B2'); gradientSpring.addColorStop(1, '#FFDAC1');

        const gradientSummer = ctx.createLinearGradient(0, 0, 0, 400);
        gradientSummer.addColorStop(0, '#B5B9FF'); gradientSummer.addColorStop(1, '#C7CEEA');
        
        const gradientAutumn = ctx.createLinearGradient(0, 0, 0, 400);
        gradientAutumn.addColorStop(0, '#E2C2B3'); gradientAutumn.addColorStop(1, '#BF9270');

        const gradientWinter = ctx.createLinearGradient(0, 0, 0, 400);
        gradientWinter.addColorStop(0, '#FF52A2'); gradientWinter.addColorStop(1, '#9A0F39');

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['봄라', '봄브', '여라', '여뮤', '갈뮤', '갈딥', '겨브', '겨딥'],
                datasets: [{
                    label: '내 컬렉션',
                    data: Object.values(counts),
                    backgroundColor: [
                        gradientSpring, gradientSpring,
                        gradientSummer, gradientSummer,
                        gradientAutumn, gradientAutumn,
                        gradientWinter, gradientWinter
                    ],
                    borderRadius: 50, // 🟡 막대를 완전히 둥글게 (알약 모양)
                    barThickness: 18, // 🟡 막대 두께를 얇게 (날씬하게)
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    x: { 
                        grid: { display: false }, // 🟡 세로 격자선 삭제
                        ticks: { font: { family: 'Pretendard', size: 11 }, color: '#9ca3af' }
                    }, 
                    y: { 
                        display: false, // 🟡 y축 숫자와 격자선 완전 삭제
                        grid: { display: false } 
                    } 
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted[0];

    // 💬 분석 멘트 디자인 개선 (가운데 정렬 + 아이콘)
    let text = `<div class="flex flex-col items-center justify-center text-center">
        <span class="text-sm text-gray-400 mb-1">가장 많은 퍼스널 컬러는?</span>
        <div class="text-xl text-rose-600 font-bold flex items-center gap-2">
            ✨ ${max[0]} <span class="bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded-full">${max[1]}개</span>
        </div>
    </div>`;
    
    if (validData.length < lipsticks.length) {
        text += `<div class="text-center mt-3 text-[10px] text-gray-300">(*분석 불가 ${lipsticks.length - validData.length}개 제외)</div>`;
    }

    const analysisText = document.getElementById('analysisText');
    if (analysisText) analysisText.innerHTML = text;
}

function render(filter = 'all') {
    const grid = document.getElementById('lipstickGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const filtered = lipsticks.filter(lip => {
        if (filter === 'all') return true;
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

window.deleteItem = function (id) {
    if (confirm('삭제하시겠습니까?')) {
        lipsticks = lipsticks.filter(l => l.id !== id);
        saveData();
        render();
        updateAnalysis();
    }
}

window.filterBy = function (category) {
    document.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));

    let idMap = { 'all': 'filter-all', '봄': 'filter-spring', '여름': 'filter-summer', '가을': 'filter-autumn', '겨울': 'filter-winter' };
    const targetBtn = document.getElementById(idMap[category]);
    if (targetBtn) targetBtn.classList.add('active');

    render(category);
}
