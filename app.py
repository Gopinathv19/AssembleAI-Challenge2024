from flask import Flask, request, jsonify
import os
import assemblyai as aai
from flask_cors import CORS
import base64
import tempfile

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# AssemblyAI API Setup
aai.settings.api_key = "********************************"
transcriber = aai.Transcriber()

# Directory to store uploaded audio files temporarily
TEMP_DIR = "temp"
os.makedirs(TEMP_DIR, exist_ok=True)

def save_audio_file(file):
    """Save the uploaded file to a temporary directory."""
    temp_file_path = os.path.join(TEMP_DIR, file.filename)
    file.save(temp_file_path)
    return temp_file_path

def get_audio_file():
    """Get audio file from request data."""
    if 'audio_data' not in request.json:
        raise ValueError("No audio data provided")
    
    audio_data = request.json['audio_data']
    # Remove the data URL prefix if present
    if 'base64,' in audio_data:
        audio_data = audio_data.split('base64,')[1]
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
        temp_file.write(base64.b64decode(audio_data))
        return temp_file.name

def transcribe_audio(file_path, **kwargs):
    """Transcribe with AssemblyAI features."""
    try:
        config = aai.TranscriptionConfig(
            speaker_labels=kwargs.get('speaker_labels', False),
            speakers_expected=kwargs.get('speakers_expected', None),
            entity_detection=kwargs.get('entity_detection', False),
            sentiment_analysis=kwargs.get('sentiment_analysis', False),
            auto_chapters=kwargs.get('auto_chapters', False),
            auto_highlights=kwargs.get('auto_highlights', False),
            language_detection=kwargs.get('language_detection', True)
        )
        
        transcript = transcriber.transcribe(file_path, config=config)
        return transcript, None
    except Exception as e:
        return None, str(e)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.route('/analyze_entities', methods=['POST'])
def analyze_entities():
    """Endpoint for named entity recognition."""
    try:
        file_path = get_audio_file()
        transcript, error = transcribe_audio(
            file_path,
            entity_detection=True
        )
        if error:
            return jsonify({"error": error}), 500

        return jsonify({
            "entities": [{
                "text": entity.text,
                "type": entity.type,
                "start": entity.start,
                "end": entity.end
            } for entity in transcript.entities]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze_sentiment', methods=['POST'])
def analyze_sentiment():
    """Endpoint for sentiment analysis."""
    try:
        file_path = get_audio_file()
        transcript, error = transcribe_audio(
            file_path,
            sentiment_analysis=True
        )
        if error:
            return jsonify({"error": error}), 500

        return jsonify({
            "sentiment_analysis": [{
                "text": sentiment.text,
                "sentiment": sentiment.sentiment,
                "confidence": sentiment.confidence
            } for sentiment in transcript.sentiment_analysis]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
 
@app.route('/speaker_diarization', methods=['POST'])
def speaker_diarization():
    """Endpoint for speaker diarization."""
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        file = request.files['file']
        temp_file_path = save_audio_file(file)
        
        transcript, error = transcribe_audio(
            temp_file_path,
            speaker_labels=True,
            speakers_expected=None
        )
        
        if error:
            return jsonify({"error": error}), 500

        
        speaker_segments = []
        if hasattr(transcript, 'words') and transcript.words:
            current_speaker = None
            segment_start = None
            segment_words = []
            
            for word in transcript.words:
                if word.speaker != current_speaker:
                    if current_speaker is not None:
                        speaker_segments.append({
                            "speaker": current_speaker,
                            "start": segment_start,
                            "end": word.start,
                            "text": " ".join(segment_words)
                        })
                    current_speaker = word.speaker
                    segment_start = word.start
                    segment_words = [word.text]
                else:
                    segment_words.append(word.text)
            
             
            if current_speaker is not None:
                speaker_segments.append({
                    "speaker": current_speaker,
                    "start": segment_start,
                    "end": transcript.words[-1].end,
                    "text": " ".join(segment_words)
                })

        return jsonify({
            "speaker_segments": speaker_segments,
            "num_speakers": len(set(segment["speaker"] for segment in speaker_segments)) if speaker_segments else 0,
            "confidence": transcript.confidence if hasattr(transcript, 'confidence') else None
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500    

@app.route('/analyze_chapters', methods=['POST'])
def analyze_chapters():
    """Endpoint for auto chapters."""
    try:
        file_path = get_audio_file()
        transcript, error = transcribe_audio(
            file_path,
            auto_chapters=True
        )
        if error:
            return jsonify({"error": error}), 500

        return jsonify({
            "chapters": [{
                "headline": chapter.headline,
                "summary": chapter.summary,
                "start": chapter.start,
                "end": chapter.end
            } for chapter in transcript.chapters]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze_summary', methods=['POST'])
def analyze_summary():
    """Endpoint for auto summary."""
    try:
        file_path = get_audio_file()
        transcript, error = transcribe_audio(
            file_path,
            auto_highlights=True
        )
        if error:
            return jsonify({"error": error}), 500

        return jsonify({
            "summary": transcript.summary
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze_categories', methods=['POST'])
def analyze_categories():
    """Endpoint for content categories."""
    try:
        file_path = get_audio_file()
        transcript, error = transcribe_audio(
            file_path,
            content_safety=True,
            iab_categories=True
        )
        if error:
            return jsonify({"error": error}), 500

        return jsonify({
            "categories": [{
                "label": category.label,
                "confidence": category.confidence
            } for category in transcript.iab_categories]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze_safety', methods=['POST'])
def analyze_safety():
    """Endpoint for content safety analysis."""
    try:
        file_path = get_audio_file()
        transcript, error = transcribe_audio(
            file_path,
            content_safety=True
        )
        if error:
            return jsonify({"error": error}), 500

        return jsonify({
            "safety_labels": [{
                "text": segment.text,
                "labels": segment.labels,
                "timestamp": segment.timestamp
            } for segment in transcript.content_safety]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/upload_audio', methods=['POST'])
def upload_audio():
    """Basic transcription endpoint."""
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        file = request.files['file']
        temp_file_path = save_audio_file(file)
        
        transcript, error = transcribe_audio(
            temp_file_path,
            speaker_labels=True
        )
        
        if error:
            return jsonify({"error": error}), 500

        return jsonify({
            "transcription": transcript.text,
            "word_data": [{
                "text": word.text,
                "start": word.start,
                "end": word.end,
                "confidence": word.confidence,
                "speaker": word.speaker
            } for word in transcript.words]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/test_connection', methods=['GET'])
def test_connection():
    """Test endpoint to verify API connection."""
    try:
        return jsonify({
            "status": "success",
            "message": "Server is running and API key is configured"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)