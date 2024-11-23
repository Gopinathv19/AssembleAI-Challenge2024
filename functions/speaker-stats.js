document.addEventListener('DOMContentLoaded', () => {
    const data = getProcessedData();
    if (!data) {
        window.location.href = 'index.html';
        return;
    }

    displaySpeakerStats(data.speaker_stats);
    createSpeakingTimeChart(data.speaker_stats);
});

function displaySpeakerStats(stats) {
    const container = document.getElementById('speaker-details');
    if (!container) return;

    const totalDuration = Object.values(stats)
        .reduce((sum, s) => sum + s.duration, 0);

    Object.entries(stats).forEach(([speaker, info]) => {
        const speakingPercentage = (info.duration / totalDuration * 100).toFixed(1);
        const card = document.createElement('div');
        card.className = 'speaker-card';
        
        card.innerHTML = `
            <h3>${speaker}</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Words:</span>
                    <span class="stat-value">${info.word_count}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${info.duration.toFixed(2)}s</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Speaking Time:</span>
                    <span class="stat-value">${speakingPercentage}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Confidence:</span>
                    <span class="stat-value">${(info.confidence * 100).toFixed(1)}%</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function createSpeakingTimeChart(stats) {
    const ctx = document.getElementById('speakingTimeChart');
    if (!ctx) return;

    // Set a fixed size for the chart canvas
    ctx.style.maxWidth = '400px';
    ctx.style.maxHeight = '400px';
    ctx.style.margin = '0 auto';

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(stats),
            datasets: [{
                data: Object.values(stats).map(s => s.duration),
                backgroundColor: generateColors(Object.keys(stats).length)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Speaking Time Distribution',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${context.label}: ${percentage}% (${value.toFixed(2)}s)`;
                        }
                    }
                }
            }
        }
    });
}

function generateColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(`hsl(${(i * 360) / count}, 70%, 50%)`);
    }
    return colors;
}