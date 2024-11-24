document.addEventListener('DOMContentLoaded', async () => {
    const data = getProcessedData();
    if (!data) {
        window.location.href = 'index.html';
        return;
    }

     
    setupAnalysisButtons();
    
     
    hideAllSections();
});

function setupAnalysisButtons() {
    const buttons = {
        'entities-btn': { endpoint: '/analyze_entities', display: displayEntities },
        'sentiment-btn': { endpoint: '/analyze_sentiment', display: displaySentimentAnalysis },
        'chapters-btn': { endpoint: '/analyze_chapters', display: displayChapters },
        'summary-btn': { endpoint: '/analyze_summary', display: displaySummary },
        'categories-btn': { endpoint: '/analyze_categories', display: displayCategories },
        'safety-btn': { endpoint: '/analyze_safety', display: displayContentSafety }
    };

    Object.entries(buttons).forEach(([btnId, { endpoint, display }]) => {
        const button = document.getElementById(btnId);
        if (button) {
            button.addEventListener('click', async () => {
                try {
                    button.disabled = true;
                    button.classList.add('loading');
                    
                    const audioData = sessionStorage.getItem('audioData');
                    if (!audioData) {
                        throw new Error('No audio data found');
                    }

                    const response = await fetch(`http://localhost:5000${endpoint}`, {
                        method: 'POST',
                        body: JSON.stringify({ audio_data: audioData }),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Analysis failed');
                    }

                    const result = await response.json();
                    display(result);
                    
                    // Show the corresponding section
                    showSection(btnId.replace('-btn', '-container'));
                    
                } catch (error) {
                    showError(error.message);
                } finally {
                    button.disabled = false;
                    button.classList.remove('loading');
                }
            });
        }
    });
}

function hideAllSections() {
    const sections = [
        'entities-container',
        'sentiment-container',
        'chapters-container',
        'summary-container',
        'categories-container',
        'safety-container'
    ];
    
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.classList.add('hidden');
        }
    });
}

function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
    }
}

function displayEntities(data) {
    const container = document.getElementById('entities-container');
    if (!container) return;

    const entities = data.entities || [];
    if (!entities.length) {
        container.innerHTML = '<p>No entities detected</p>';
        return;
    }

    const html = entities.map(entity => `
        <div class="entity-item">
            <span class="entity-text">${entity.text}</span>
            <span class="entity-type">${entity.type}</span>
        </div>
    `).join('');

    container.querySelector('.content').innerHTML = html;
}

function displaySentimentAnalysis(data) {
    const container = document.getElementById('sentiment-container');
    if (!container) return;

    const sentiments = data.sentiment_analysis || [];
    if (!sentiments.length) {
        container.innerHTML = '<p>No sentiment analysis available</p>';
        return;
    }

    const html = sentiments.map(sentiment => `
        <div class="sentiment-item ${sentiment.sentiment.toLowerCase()}">
            <p>${sentiment.text}</p>
            <div class="sentiment-info">
                <span>Sentiment: ${sentiment.sentiment}</span>
                <span>Confidence: ${(sentiment.confidence * 100).toFixed(1)}%</span>
            </div>
        </div>
    `).join('');

    container.querySelector('.content').innerHTML = html;
}

function displayChapters(data) {
    const container = document.getElementById('chapters-container');
    if (!container) return;

    const chapters = data.chapters || [];
    if (!chapters.length) {
        container.innerHTML = '<p>No chapters available</p>';
        return;
    }

    const html = chapters.map((chapter, index) => `
        <div class="chapter-item">
            <h3>Chapter ${index + 1}: ${chapter.headline}</h3>
            <p>${chapter.summary}</p>
            <div class="chapter-time">
                ${formatTime(chapter.start)} - ${formatTime(chapter.end)}
            </div>
        </div>
    `).join('');

    container.querySelector('.content').innerHTML = html;
}

function displaySummary(data) {
    const container = document.getElementById('summary-container');
    if (!container) return;

    const summary = data.summary;
    if (!summary) {
        container.innerHTML = '<p>No summary available</p>';
        return;
    }

    container.querySelector('.content').innerHTML = `
        <p class="summary-text">${summary}</p>
    `;
}

function displayCategories(data) {
    const container = document.getElementById('categories-container');
    if (!container) return;

    const categories = data.categories || [];
    if (!categories.length) {
        container.innerHTML = '<p>No categories detected</p>';
        return;
    }

    const html = categories.map(category => `
        <div class="category-item">
            <div class="category-label">${category.label}</div>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${category.confidence * 100}%"></div>
            </div>
            <div class="confidence-value">${(category.confidence * 100).toFixed(1)}%</div>
        </div>
    `).join('');

    container.querySelector('.content').innerHTML = html;
}

function displayContentSafety(data) {
    const container = document.getElementById('safety-container');
    if (!container) return;

    const safetyLabels = data.safety_labels || [];
    if (!safetyLabels.length) {
        container.innerHTML = '<p>No content safety analysis available</p>';
        return;
    }

    const html = safetyLabels.map(label => `
        <div class="safety-item">
            <p>${label.text}</p>
            <div class="safety-labels">
                ${label.labels.map(l => `<span class="safety-label">${l}</span>`).join('')}
            </div>
            <div class="safety-timestamp">${formatTime(label.timestamp)}</div>
        </div>
    `).join('');

    container.querySelector('.content').innerHTML = html;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

 
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

 
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setupAnalysisButtons,
        displayEntities,
        displaySentimentAnalysis,
        displayChapters,
        displaySummary,
        displayCategories,
        displayContentSafety,
        formatTime
    };
}