// this function gets the data from the session storage that is stored on the browser for a period of time
document.addEventListener('DOMContentLoaded', () => {
    const data = getProcessedData();
    if (!data) {
        window.location.href = 'index.html';
        return;
    }

    const transcriptionContent = document.getElementById('transcription-content');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const exportBtn = document.getElementById('export-btn');

    // Display transcription
    displayTranscription(data.word_data);

    // Copy button functionality
    copyBtn?.addEventListener('click', async () => {
        try {
            const text = generatePlainText(data.word_data);
            await navigator.clipboard.writeText(text);
            showSuccess('Copied to clipboard!');
        } catch (err) {
            showError('Copy failed: ' + err.message);
        }
    });

    // Download button functionality
    downloadBtn?.addEventListener('click', () => {
        try {
            const text = generatePlainText(data.word_data);
            downloadFile(text, 'transcription.txt', 'text/plain');
            showSuccess('Download started!');
        } catch (err) {
            showError('Download failed: ' + err.message);
        }
    });

    // Export functionality
    exportBtn?.addEventListener('click', () => {
        const format = document.getElementById('export-format')?.value;
        if (format) {
            try {
                exportTranscription(data, format);
                showSuccess(`Export as ${format.toUpperCase()} started!`);
            } catch (err) {
                showError('Export failed: ' + err.message);
            }
        }
    });
});

function displayTranscription(wordData) {
    const container = document.getElementById('transcription-content');
    if (!container) return;

    let currentSpeaker = null;
    let html = '';

    wordData.forEach(word => {
        if (word.speaker !== currentSpeaker) {
            currentSpeaker = word.speaker;
            html += `<p class="speaker-label">${word.speaker}:</p>`;
        }
        html += `<span class="word" data-start="${word.start_time}" data-end="${word.end_time}">${word.text}</span> `;
    });

    container.innerHTML = html;
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