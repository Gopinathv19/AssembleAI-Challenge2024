// Constants for API endpoints
const BACKEND_URL = "http://127.0.0.1:5000/upload_audio";
const DIARIZATION_URL = "http://127.0.0.1:5000/speaker_diarization";

// Global state
let globalTranscriptionData = null;

// Utility function to update status with proper styling
function updateStatus(message, type) {
    const statusElement = document.getElementById("upload-status");
    if (!statusElement) return;
    statusElement.innerText = message;
    statusElement.className = type; // 'loading', 'success', or 'error'
}

// Initialize the application
function initializeApp() {
    const elements = {
        transcribeBtn: document.getElementById("transcribe-btn"),
        audioUpload: document.getElementById("audio-upload"),
        audioPlayer: document.getElementById("audio-player"),
        transcriptDiv: document.getElementById("sync-transcript"),
        transcriptionText: document.getElementById("transcription-text"),
        speakerStats: document.getElementById("speaker-stats"),
        renameSpeakersBtn: document.getElementById("rename-speakers-btn"),
        sections: {
            transcription: document.getElementById("transcription-section"),
            speakerStats: document.getElementById("speaker-stats-section"),
            audioSync: document.getElementById("audio-sync-section")
        }
    };

    // Verify all required elements exist
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Required element ${key} not found`);
            return false;
        }
    }

    // Hide sections initially
    Object.values(elements.sections).forEach(section => {
        section.classList.add("hidden");
    });

    return elements;
}

// Main transcription handler
async function handleTranscription(elements) {
    const file = elements.audioUpload.files[0];
    if (!file) {
        updateStatus("Please upload an audio file.", "error");
        return;
    }

    try {
        // First handle transcription
        updateStatus("Processing transcription...", "loading");
        const transcriptionData = await processTranscription(file);

        // Then handle diarization
        updateStatus("Processing speaker diarization...", "loading");
        const diarizationData = await processDiarization(file);

        // Merge the data
        const mergedData = mergeDiarizationData(transcriptionData, diarizationData);
        globalTranscriptionData = mergedData;

        // Show sections and update UI
        Object.values(elements.sections).forEach(section => {
            section.classList.remove("hidden");
            section.classList.add("visible");
        });

        // Update UI components
        displayTranscription(mergedData.transcription, mergedData.word_data, file);
        displaySpeakerStats(mergedData.speaker_stats);
        updateStatus("Processing completed!", "success");

    } catch (error) {
        updateStatus(error.message, "error");
        console.error("Processing error:", error);
    }
}

async function processTranscription(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) throw new Error("Failed to process transcription.");
    return await response.json();
}

async function processDiarization(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(DIARIZATION_URL, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) throw new Error("Failed to process speaker diarization.");
    return await response.json();
}

function mergeDiarizationData(transcriptionData, diarizationData) {
    const mergedWordData = transcriptionData.word_data.map(word => {
        const speaker = findSpeakerForTimestamp(
            word.start_time,
            word.end_time,
            diarizationData.speaker_segments
        );
        return { ...word, speaker: speaker || 'Unknown Speaker' };
    });

    return {
        ...transcriptionData,
        word_data: mergedWordData,
        speaker_stats: calculateSpeakerStats(mergedWordData)
    };
}

function findSpeakerForTimestamp(startTime, endTime, speakerSegments) {
    const segment = speakerSegments.find(seg => 
        (startTime >= seg.start_time && startTime <= seg.end_time) ||
        (endTime >= seg.start_time && endTime <= seg.end_time)
    );
    return segment ? segment.speaker : null;
}

function calculateSpeakerStats(wordData) {
    const stats = {};

    wordData.forEach(word => {
        if (!word.speaker) return;

        if (!stats[word.speaker]) {
            stats[word.speaker] = {
                word_count: 0,
                duration: 0,
                confidence: 0,
                total_confidence: 0
            };
        }

        stats[word.speaker].word_count++;
        stats[word.speaker].duration += (word.end_time - word.start_time);
        stats[word.speaker].total_confidence += (word.confidence || 0);
    });

    // Calculate average confidence
    Object.values(stats).forEach(speakerStats => {
        speakerStats.confidence = 
            speakerStats.total_confidence / speakerStats.word_count;
        delete speakerStats.total_confidence;
    });

    return stats;
}

function displayTranscription(transcription, wordData, file) {
    const transcriptionText = document.getElementById("transcription-text");
    if (!transcriptionText) return;

    transcriptionText.value = transcription;
    setupAudioSync(wordData, file);
}

function displaySpeakerStats(stats) {
    const statsContainer = document.getElementById("speaker-stats");
    if (!statsContainer) return;

    statsContainer.innerHTML = "";
    const totalDuration = Object.values(stats)
        .reduce((sum, s) => sum + s.duration, 0);

    Object.entries(stats).forEach(([speaker, info]) => {
        const speakingPercentage = (info.duration / totalDuration * 100).toFixed(1);
        const statCard = document.createElement("div");
        statCard.className = "speaker-card";
        
        statCard.innerHTML = `
            <h3>${speaker}</h3>
            <p>Words: ${info.word_count}</p>
            <p>Duration: ${info.duration.toFixed(2)}s</p>
            <p>Speaking Time: ${speakingPercentage}%</p>
            <p>Confidence: ${(info.confidence * 100).toFixed(1)}%</p>
        `;
        
        statsContainer.appendChild(statCard);
    });
}

function setupAudioSync(wordData, file) {
    const audioPlayer = document.getElementById("audio-player");
    const transcriptDiv = document.getElementById("sync-transcript");
    
    if (!audioPlayer || !transcriptDiv) return;

    transcriptDiv.innerHTML = "";
    
    if (audioPlayer.src) {
        URL.revokeObjectURL(audioPlayer.src);
    }
    audioPlayer.src = URL.createObjectURL(file);
    
    let currentSpeaker = null;
    
    wordData.forEach(word => {
        if (word.speaker && word.speaker !== currentSpeaker) {
            currentSpeaker = word.speaker;
            const speakerLabel = document.createElement("span");
            speakerLabel.className = "speaker-label";
            speakerLabel.innerText = `\n${word.speaker}: `;
            transcriptDiv.appendChild(speakerLabel);
        }

        const wordSpan = document.createElement("span");
        wordSpan.innerText = `${word.text} `;
        wordSpan.dataset.startTime = word.start_time;
        wordSpan.dataset.endTime = word.end_time;
        wordSpan.dataset.speaker = word.speaker;
        
        wordSpan.addEventListener("click", () => {
            const startTime = parseFloat(word.start_time) / 1000;
            audioPlayer.currentTime = startTime;
            audioPlayer.play().catch(console.error);
        });
        
        transcriptDiv.appendChild(wordSpan);
    });

    audioPlayer.addEventListener("timeupdate", () => {
        const currentTime = audioPlayer.currentTime * 1000;
        const words = transcriptDiv.children;
        
        Array.from(words).forEach(wordSpan => {
            if (!wordSpan.dataset.startTime) return;
            
            const startTime = parseFloat(wordSpan.dataset.startTime);
            const endTime = parseFloat(wordSpan.dataset.endTime);
            
            if (currentTime >= startTime && currentTime <= endTime) {
                wordSpan.classList.add("highlight");
                ensureWordVisible(wordSpan, transcriptDiv);
            } else {
                wordSpan.classList.remove("highlight");
            }
        });
    });
}

function ensureWordVisible(wordSpan, container) {
    const rect = wordSpan.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
        wordSpan.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function handleSpeakerRename() {
    const transcriptDiv = document.getElementById("sync-transcript");
    if (!transcriptDiv || !globalTranscriptionData) return;

    const words = transcriptDiv.children;
    const speakers = new Set();
    
    Array.from(words).forEach(wordSpan => {
        if (wordSpan.dataset.speaker) {
            speakers.add(wordSpan.dataset.speaker);
        }
    });

    const speakerMapping = {};
    speakers.forEach(speaker => {
        const newName = prompt(`Enter new name for speaker "${speaker}":`, speaker);
        if (newName && newName.trim()) {
            speakerMapping[speaker] = newName.trim();
        }
    });

    // Update transcript
    Array.from(words).forEach(wordSpan => {
        const currentSpeaker = wordSpan.dataset.speaker;
        if (currentSpeaker && speakerMapping[currentSpeaker]) {
            if (wordSpan.classList.contains('speaker-label')) {
                wordSpan.innerText = `\n${speakerMapping[currentSpeaker]}: `;
            }
            wordSpan.dataset.speaker = speakerMapping[currentSpeaker];
        }
    });

    // Update speaker stats
    if (globalTranscriptionData.speaker_stats) {
        const updatedStats = {};
        Object.entries(globalTranscriptionData.speaker_stats).forEach(([speaker, data]) => {
            const newName = speakerMapping[speaker] || speaker;
            updatedStats[newName] = data;
        });
        displaySpeakerStats(updatedStats);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const elements = initializeApp();
    if (!elements) {
        updateStatus("Failed to initialize application", "error");
        return;
    }

    // Add file input change listener
    elements.audioUpload.addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name;
        if (fileName) {
            updateStatus(`Selected file: ${fileName}`, 'success');
        }
    });

    elements.transcribeBtn.addEventListener("click", () => handleTranscription(elements));
    elements.renameSpeakersBtn.addEventListener("click", handleSpeakerRename);
});