document.addEventListener('DOMContentLoaded', () => {
    const data = getProcessedData();
    if (!data || !data.speaker_stats) {
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
        .reduce((sum, s) => sum + (s.duration || 0), 0);

    Object.entries(stats).forEach(([speaker, info]) => {
        const speakingPercentage = ((info.duration || 0) / totalDuration * 100).toFixed(1);
        const card = document.createElement('div');
        card.className = 'speaker-card';
        
        card.innerHTML = `
            <h3>${speaker}</h3>
            <div class="stats">
                <p>Speaking Time: ${(info.duration || 0).toFixed(2)}s</p>
                <p>Percentage: ${speakingPercentage}%</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${speakingPercentage}%"></div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function createSpeakingTimeChart(stats) {
    const ctx = document.getElementById('speakingTimeChart');
    if (!ctx) return;

    ctx.style.maxWidth = '400px';
    ctx.style.maxHeight = '400px';
    ctx.style.margin = '0 auto';

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(stats),
            datasets: [{
                data: Object.values(stats).map(s => s.duration || 0),
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
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + (b || 0), 0);
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