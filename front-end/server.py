import cv2
from pathlib import Path
from ultralytics import YOLO
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

MODEL_PATH = Path(__file__).resolve().parent / "model" / "best.pt"
helmet_model = YOLO(str(MODEL_PATH))

cap = cv2.VideoCapture(0)

def generate_frames():

    while True:
        success, frame = cap.read()

        if not success:
            break

        results = helmet_model(frame)

        annotated = results[0].plot()

        ret, buffer = cv2.imencode('.jpg', annotated)

        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.get("/video")
def video_feed():
    return StreamingResponse(generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame")