// Event listener for when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const audioUpload = document.getElementById("audio-upload");
    const transcribeBtn = document.getElementById("transcribe-btn");
    const navButtons = document.getElementById("nav-buttons");
    const loadingIndicator = document.getElementById("loading-indicator");

    // Reset session storage on page load
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        clearProcessedData();
    }

    // Handle file upload
    audioUpload?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                clearProcessedData(); // Clear existing data
                updateStatus(`Selected file: ${file.name}`, 'success');
                transcribeBtn.disabled = false;
            } catch (error) {
                showError('Error processing audio file: ' + error.message);
            }
        }
    });

    // Handle transcribe button click
    transcribeBtn?.addEventListener("click", async () => {
        const file = audioUpload?.files[0];
        if (!file) {
            updateStatus("Please upload an audio file.", "error");
            return;
        }

        try {
            transcribeBtn.disabled = true;
            transcribeBtn.classList.add('loading');
            loadingIndicator?.classList.remove('hidden');
            
            updateStatus("Processing transcription...", "loading");
            const transcriptionData = await processTranscription(file);
            
            updateStatus("Processing speaker diarization...", "loading");
            const diarizationData = await processDiarization(file);
            
            const mergedData = mergeDiarizationData(transcriptionData, diarizationData);
            
            if (!validateMergedData(mergedData)) {
                throw new Error("Invalid data format received from server");
            }
            
            // Store both data and audio file
            storeProcessedData(mergedData, file);
            
            updateStatus("Processing completed!", "success");
            showSuccess("Audio processing completed successfully!");
            navButtons?.classList.remove("hidden");

            enableNavigationLinks();

        } catch (error) {
            handleProcessingError(error);
        } finally {
            transcribeBtn.classList.remove('loading');
            transcribeBtn.disabled = false;
            loadingIndicator?.classList.add('hidden');
        }
    });

    // Setup analysis page if on analysis.html
    if (window.location.pathname.includes('analysis.html')) {
        setupAnalysisPage();
    }
});

function handleProcessingError(error) {
    console.error("Processing error:", error);
    updateStatus(error.message, "error");
    showError("Failed to process audio: " + error.message);
}

function enableNavigationLinks() {
    const analysisLink = document.getElementById("analysis-link");
    const syncLink = document.getElementById("sync-link");
    
    if (analysisLink) {
        analysisLink.classList.remove("disabled");
        analysisLink.setAttribute("href", "analysis.html");
    }
    
    if (syncLink) {
        syncLink.classList.remove("disabled");
        syncLink.setAttribute("href", "audio-sync.html");
    }
}

// Setup analysis page functionality
function setupAnalysisPage() {
    const data = getProcessedData();
    if (!data) {
        showError("No transcription data found. Please process an audio file first.");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    setupAnalysisButtons(data);
    setupExportButtons(data);
}

function setupAnalysisButtons(data) {
    const analysisButtons = {
        "entities-btn": "Named Entities",
        "sentiment-btn": "Sentiment Analysis",
        "chapters-btn": "Auto Chapters",
        "summary-btn": "Summary",
        "categories-btn": "Categories",
        "safety-btn": "Content Safety"
    };

    Object.entries(analysisButtons).forEach(([btnId, label]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener("click", () => handleAnalysisButtonClick(btn, btnId, label, data));
        }
    });
}

async function handleAnalysisButtonClick(btn, btnId, label, data) {
    try {
        const container = document.getElementById(btnId.replace('-btn', '-container'));
        if (!container) return;

        btn.disabled = true;
        btn.classList.add('loading');
        
        const analysisData = await processAdvancedAnalysis(data, label.toLowerCase());
        updateAnalysisSection(container, analysisData, label);
        container.classList.remove('hidden');
        
    } catch (error) {
        showError(`Failed to process ${label}: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

function setupExportButtons(data) {
    const exportButtons = {
        "export-txt": "plain",
        "export-srt": "srt",
        "export-html": "word"
    };

    Object.entries(exportButtons).forEach(([btnId, format]) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener("click", () => handleExportButtonClick(data, format));
        }
    });
}

async function handleExportButtonClick(data, format) {
    try {
        await exportTranscription(data, format);
        showSuccess(`Successfully exported as ${format.toUpperCase()}`);
    } catch (error) {
        showError(`Failed to export as ${format.toUpperCase()}: ${error.message}`);
    }
}

function updateAnalysisSection(container, data, type) {
    const contentDiv = container.querySelector('.content');
    if (!contentDiv) return;

    const formatters = {
        "Named Entities": formatEntities,
        "Sentiment Analysis": formatSentiment,
        "Auto Chapters": formatChapters,
        "Summary": formatSummary,
        "Categories": formatCategories,
        "Content Safety": formatSafety
    };

    const formatter = formatters[type];
    if (formatter) {
        contentDiv.innerHTML = formatter(data[type.toLowerCase().replace(' ', '_')]);
    }
}

// Formatting functions
function formatEntities(entities) {
    if (!entities?.length) return "<p>No entities detected</p>";
    return entities.map(entity => 
        `<div class="entity-item">
            <span class="entity-type">${entity.type}</span>
            <span class="entity-text">${entity.text}</span>
        </div>`
    ).join('');
}

function formatSentiment(sentiment) {
    if (!sentiment?.length) return "<p>No sentiment analysis available</p>";
    return sentiment.map(item => 
        `<div class="sentiment-item ${item.sentiment.toLowerCase()}">
            <p>${item.text}</p>
            <span class="confidence">Confidence: ${(item.confidence * 100).toFixed(1)}%</span>
        </div>`
    ).join('');
}

function formatChapters(chapters) {
    if (!chapters?.length) return "<p>No chapters detected</p>";
    return chapters.map(chapter => 
        `<div class="chapter-item">
            <h3>${chapter.title}</h3>
            <span class="timestamp">${formatTime(chapter.start)} - ${formatTime(chapter.end)}</span>
            <p>${chapter.summary}</p>
        </div>`
    ).join('');
}

function formatSummary(summary) {
    if (!summary) return "<p>No summary available</p>";
    return `<div class="summary-content">${summary}</div>`;
}

function formatCategories(categories) {
    if (!categories?.length) return "<p>No categories detected</p>";
    return categories.map(category => 
        `<div class="category-item">
            <span class="category-name">${category.name}</span>
            <span class="confidence">${(category.confidence * 100).toFixed(1)}%</span>
        </div>`
    ).join('');
}

function formatSafety(safety) {
    if (!safety?.length) return "<p>No safety analysis available</p>";
    return safety.map(label => 
        `<div class="safety-item ${label.severity.toLowerCase()}">
            <span class="label-type">${label.type}</span>
            <span class="severity">${label.severity}</span>
            <p>${label.description}</p>
        </div>`
    ).join('');
}

function formatTime(seconds) {
    const date = new Date(seconds * 1000);
    const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

 
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setupAnalysisPage,
        updateAnalysisSection,
        handleProcessingError,
        enableNavigationLinks
    };
}