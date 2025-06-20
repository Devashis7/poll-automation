import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
app = FastAPI()

@app.websocket("/transcribe")
async def websocket_audio_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            print("Bytes: ", len(data))
            response = client.models.generate_content(
              model='gemini-2.5-flash',
                config=types.GenerateContentConfig(system_instruction = 'Transcribe the audio clip into english'),
              contents=[
                types.Part.from_bytes(
                  data=data,
                  mime_type='audio/webm',
                )
              ]
            )
            print(response.text)
            print("Done")
            await websocket.send_text(response.text)
    except WebSocketDisconnect:
        print("Client disconnected")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
