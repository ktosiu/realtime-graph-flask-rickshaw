import json
import os
import flask
from flask import Flask, Response, render_template, send_from_directory, send_file

# Needed for the demo, but perhaps not in actual use
import itertools
import random
import time

# Server sent events
class ServerSentEvent:
    FIELDS = ('event', 'data', 'id')
    def __init__(self, data, event=None, event_id=None):
        self.data = data
        self.event = event 
        self.id = event_id 

    def encode(self):
        if not self.data:
            return ""
        ret = []
        for field in self.FIELDS:
            entry = getattr(self, field) 
            if entry is not None:
                ret.extend(["%s: %s" % (field, line) for line in entry.split("\n")])
        return "\n".join(ret) + "\n\n"

# The Flask application
app = Flask(__name__)

@app.route('/static/<path:path>')
def send_js(path):
    return send_from_directory('static', path)


@app.route("/", methods=['GET'])
def get_index():
    return render_template('index.html')


@app.route("/stream")
def stream():
    def gen():
        count = itertools.count()
        while True:
            data = json.dumps({"series": {"mySeries": random.random()}, 'x': next(count)})
            ev = ServerSentEvent(data)
            print(ev.encode())
            yield ev.encode()
            time.sleep(0.05)

    return Response(gen(), mimetype="text/event-stream")


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000, debug=True)
