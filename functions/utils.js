// Constants for API endpoints
const BACKEND_URL = "http://127.0.0.1:5000/upload_audio";
const DIARIZATION_URL = "http://127.0.0.1:5000/speaker_diarization";

// Utility function to update status
function updateStatus(message, type) {
    const statusElement = document.getElementById("upload-status");
    if (!statusElement) return;
    statusElement.innerText = message;
    statusElement.className = `status ${type}`;
}

// Error handling
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}

// Data processing utilities
async function processTranscription(file) {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) throw new Error("Failed to process transcription.");
        return await response.json();
    } catch (error) {
        showError(error.message);
        throw error;
    }
}

async function processDiarization(file) {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(DIARIZATION_URL, {
            method: "POST",
            body: formData,
        });
        if (!response.ok) throw new Error("Failed to process speaker diarization.");
        return await response.json();
    } catch (error) {
        showError(error.message);
        throw error;
    }
}

// Storage utilities
function storeProcessedData(data) {
    sessionStorage.setItem('transcriptionData', JSON.stringify(data));
}

function getProcessedData() {
    const data = sessionStorage.getItem('transcriptionData');
    return data ? JSON.parse(data) : null;
}

// Export utilities
function exportTranscription(data, format) {
    switch(format) {
        case 'plain':
            downloadPlainText(data);
            break;
        case 'srt':
            downloadSRT(data);
            break;
        case 'word':
            downloadWord(data);
            break;
        default:
            showError('Invalid export format');
    }
}

function downloadPlainText(data) {
    const text = generatePlainText(data.word_data);
    downloadFile(text, 'transcription.txt', 'text/plain');
}

function generatePlainText(wordData) {
    let currentSpeaker = null;
    let text = '';

    wordData.forEach(word => {
        if (word.speaker !== currentSpeaker) {
            currentSpeaker = word.speaker;
            text += `\n\n${word.speaker}:\n`;
        }
        text += `${word.text} `;
    });

    return text.trim();
}

function downloadSRT(data) {
    let srtContent = '';
    let counter = 1;
    let currentSpeaker = null;
    let currentSegment = { text: [], start: null, end: null };

    data.word_data.forEach((word, index) => {
        if (word.speaker !== currentSpeaker || index === data.word_data.length - 1) {
            if (currentSegment.text.length > 0) {
                srtContent += `${counter}\n`;
                srtContent += `${formatSRTTime(currentSegment.start)} --> ${formatSRTTime(currentSegment.end)}\n`;
                srtContent += `${currentSpeaker}: ${currentSegment.text.join(' ')}\n\n`;
                counter++;
            }
            currentSegment = { text: [word.text], start: word.start_time, end: word.end_time };
            currentSpeaker = word.speaker;
        } else {
            currentSegment.text.push(word.text);
            currentSegment.end = word.end_time;
        }
    });

    downloadFile(srtContent, 'transcription.srt', 'text/plain');
}

function formatSRTTime(seconds) {
    const date = new Date(seconds * 1000);
    const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
}

function downloadWord(data) {
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; margin: 2rem; }
                .speaker { color: #2563eb; font-weight: bold; margin-top: 1.5em; }
            </style>
        </head>
        <body>
            ${data.word_data.reduce((acc, word) => {
                if (word.speaker !== acc.currentSpeaker) {
                    acc.currentSpeaker = word.speaker;
                    acc.html += `<p class="speaker">${word.speaker}:</p>`;
                }
                acc.html += `${word.text} `;
                return acc;
            }, { html: '', currentSpeaker: null }).html}
        </body>
        </html>
    `;

    downloadFile(htmlContent, 'transcription.html', 'text/html');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Speaker utilities
function findSpeakerForTimestamp(startTime, endTime, speakerSegments) {
    return speakerSegments.find(segment => 
        startTime >= segment.start_time && 
        endTime <= segment.end_time
    )?.speaker || 'Unknown Speaker';
}

function calculateSpeakerStats(wordData) {
    const stats = {};
    
    wordData.forEach(word => {
        if (!stats[word.speaker]) {
            stats[word.speaker] = {
                word_count: 0,
                duration: 0,
                confidence: 0
            };
        }
        
        stats[word.speaker].word_count++;
        stats[word.speaker].duration += (word.end_time - word.start_time);
        stats[word.speaker].confidence += word.confidence || 0;
    });

    // Calculate average confidence
    Object.values(stats).forEach(stat => {
        stat.confidence = stat.confidence / stat.word_count;
    });

    return stats;
}