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
        if (!response.ok) {
            clearProcessedData(); // Clear data on error
            throw new Error("Failed to process transcription.");
        }
        return await response.json();
    } catch (error) {
        clearProcessedData(); // Clear data on error
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
        if (!response.ok) {
            clearProcessedData(); // Clear data on error
            throw new Error("Failed to process speaker diarization.");
        }
        return await response.json();
    } catch (error) {
        clearProcessedData(); // Clear data on error
        showError(error.message);
        throw error;
    }
}

// Navigation cleanup
function addNavigationCleanup() {
    window.addEventListener('beforeunload', () => {
        // Only clear if navigating away from the application
        if (!window.location.pathname.includes('analysis.html') && 
            !window.location.pathname.includes('audio-sync.html') && 
            !window.location.pathname.includes('index.html')) {
            clearProcessedData();
        }
    });
}

// Initialize navigation cleanup
document.addEventListener('DOMContentLoaded', () => {
    addNavigationCleanup();
});

// Data validation utility
function validateMergedData(data) {
    if (!data) return false;
    
    // Check for required properties
    const requiredProperties = ['word_data', 'speaker_segments', 'num_speakers'];
    for (const prop of requiredProperties) {
        if (!data.hasOwnProperty(prop)) {
            console.error(`Missing required property: ${prop}`);
            return false;
        }
    }
    
    // Validate word_data
    if (!Array.isArray(data.word_data) || data.word_data.length === 0) {
        console.error('Invalid or empty word_data');
        return false;
    }
    
    // Validate speaker_segments
    if (!Array.isArray(data.speaker_segments)) {
        console.error('Invalid speaker_segments');
        return false;
    }
    
    // Validate num_speakers
    if (typeof data.num_speakers !== 'number' || data.num_speakers < 1) {
        console.error('Invalid num_speakers');
        return false;
    }
    
    return true;
}

// Storage utilities
function storeProcessedData(data, audioFile) {
    if (!validateMergedData(data)) {
        throw new Error("Invalid data format");
    }
    
    // Store transcription data
    sessionStorage.setItem('transcriptionData', JSON.stringify(data));
    
    // Store audio file as base64
    if (audioFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                sessionStorage.setItem('audioFile', e.target.result);
                sessionStorage.setItem('audioFileName', audioFile.name);
                sessionStorage.setItem('audioFileType', audioFile.type);
                sessionStorage.setItem('audioFileSize', audioFile.size);
                showSuccess('Audio file stored successfully');
            } catch (error) {
                console.error('Error storing audio file:', error);
                showError('Failed to store audio file: ' + error.message);
            }
        };
        reader.onerror = function(error) {
            console.error('Error reading audio file:', error);
            showError('Failed to read audio file');
        };
        reader.readAsDataURL(audioFile);
    }
}

function getStoredAudio() {
    try {
        const audioData = sessionStorage.getItem('audioFile');
        const fileName = sessionStorage.getItem('audioFileName');
        const fileType = sessionStorage.getItem('audioFileType');
        const fileSize = sessionStorage.getItem('audioFileSize');
        
        if (!audioData) {
            console.warn('No audio file found in storage');
            return null;
        }
        
        return {
            audioData,
            fileName,
            fileType,
            fileSize: parseInt(fileSize, 10)
        };
    } catch (error) {
        console.error('Error retrieving stored audio:', error);
        showError('Failed to retrieve audio file');
        return null;
    }
}

function clearStoredAudio() {
    try {
        sessionStorage.removeItem('audioFile');
        sessionStorage.removeItem('audioFileName');
        sessionStorage.removeItem('audioFileType');
        sessionStorage.removeItem('audioFileSize');
    } catch (error) {
        console.error('Error clearing stored audio:', error);
    }
}

function getProcessedData() {
    try {
        const data = sessionStorage.getItem('transcriptionData');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error retrieving processed data:', error);
        showError('Failed to retrieve transcription data');
        return null;
    }
}

function clearProcessedData() {
    try {
        sessionStorage.removeItem('transcriptionData');
        clearStoredAudio();
    } catch (error) {
        console.error('Error clearing processed data:', error);
    }
}

// Merge utilities
function mergeDiarizationData(transcriptionData, diarizationData) {
    if (!transcriptionData?.word_data || !diarizationData?.speaker_segments) {
        console.error('Invalid data format received');
        throw new Error('Invalid input data format');
    }

    try {
        const mergedWordData = transcriptionData.word_data.map(word => {
            if (!word) return null;
            
            const segment = diarizationData.speaker_segments.find(seg => 
                word.start >= seg.start && word.end <= seg.end
            );
            
            return {
                ...word,
                speaker: segment ? `Speaker ${segment.speaker}` : 'Unknown Speaker'
            };
        });

        // Calculate speaker statistics
        const speakerStats = {};
        diarizationData.speaker_segments.forEach(segment => {
            const speaker = `Speaker ${segment.speaker}`;
            if (!speakerStats[speaker]) {
                speakerStats[speaker] = {
                    totalWords: 0,
                    duration: 0,
                    segments: []
                };
            }
            
            const duration = segment.end - segment.start;
            speakerStats[speaker].duration += duration;
            speakerStats[speaker].segments.push({
                start: segment.start,
                end: segment.end,
                text: segment.text || ''
            });
        });

        const mergedData = {
            ...transcriptionData,
            word_data: mergedWordData,
            speaker_segments: diarizationData.speaker_segments,
            num_speakers: diarizationData.num_speakers,
            speaker_stats: speakerStats
        };

        if (!validateMergedData(mergedData)) {
            throw new Error("Invalid merged data format");
        }

        return mergedData;
    } catch (error) {
        console.error('Error merging diarization data:', error);
        throw error;
    }
}

// Export utilities
function exportTranscription(data, format) {
    if (!validateMergedData(data)) {
        throw new Error("Invalid data format for export");
    }

    switch(format) {
        case 'plain':
            downloadPlainText(data);
            break;
        case 'srt':
            downloadSRT(data);
            break;
        case 'word':
            downloadHTML(data);
            break;
        default:
            showError('Invalid export format');
    }
}

function generatePlainText(wordData) {
    if (!wordData || !Array.isArray(wordData)) return '';
    
    let currentSpeaker = null;
    let text = '';

    wordData.forEach(word => {
        if (!word) return;
        const speaker = word.speaker || 'Speaker 1';
        if (speaker !== currentSpeaker) {
            currentSpeaker = speaker;
            text += `\n\n${speaker}:\n`;
        }
        text += `${word.text || ''} `;
    });

    return text.trim();
}

function downloadPlainText(data) {
    const text = generatePlainText(data.word_data);
    downloadFile(text, 'transcription.txt', 'text/plain');
}

function downloadSRT(data) {
    if (!data?.word_data) return;
    
    let srtContent = '';
    let counter = 1;
    let currentSpeaker = null;
    let currentSegment = { text: [], start: null, end: null };

    data.word_data.forEach((word, index) => {
        const speaker = word.speaker || 'Speaker 1';
        if (speaker !== currentSpeaker || index === data.word_data.length - 1) {
            if (currentSegment.text.length > 0) {
                srtContent += `${counter}\n`;
                srtContent += `${formatSRTTime(currentSegment.start)} --> ${formatSRTTime(currentSegment.end)}\n`;
                srtContent += `${currentSpeaker || 'Speaker 1'}: ${currentSegment.text.join(' ')}\n\n`;
                counter++;
            }
            currentSegment = { 
                text: [word.text || ''], 
                start: word.start || 0, 
                end: word.end || 0 
            };
            currentSpeaker = speaker;
        } else {
            currentSegment.text.push(word.text || '');
            currentSegment.end = word.end || currentSegment.end;
        }
    });

    downloadFile(srtContent, 'transcription.srt', 'text/plain');
}

function formatSRTTime(seconds) {
    const date = new Date((seconds || 0) * 1000);
    const hh = String(Math.floor((seconds || 0) / 3600)).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
}

function downloadHTML(data) {
    if (!data?.word_data) return;
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; margin: 2rem; }
                .speaker { color: #2563eb; font-weight: bold; margin-top: 1.5em; }
                .timestamp { color: #666; font-size: 0.8em; }
            </style>
        </head>
        <body>
            ${data.word_data.reduce((acc, word) => {
                if (!word) return acc;
                const speaker = word.speaker || 'Speaker 1';
                if (speaker !== acc.currentSpeaker) {
                    acc.currentSpeaker = speaker;
                    acc.html += `<p class="speaker">${speaker}:</p>`;
                }
                acc.html += `${word.text || ''} `;
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

 
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        processTranscription,
        processDiarization,
        mergeDiarizationData,
        storeProcessedData,
        getProcessedData,
        clearProcessedData,
        clearStoredAudio,
        updateStatus,
        showError,
        showSuccess,
        exportTranscription,
        validateMergedData,
        addNavigationCleanup
    };
}